import { fetchJson } from '../http.js';
import { MAP_LEVELS, getMapAreasByLevel, getSamplesForArea, getSamplingMetadataForArea } from './areas.js';
import { validationError } from '../validation.js';

const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

export async function getMapForecast(options = {}) {
  const level = normalizeLevel(options.level ?? 'country');
  const selectedTime = normalizeSelectedTime(options.time ?? new Date());
  const areas = getMapAreasByLevel(level);
  const results = await mapWithConcurrency(areas, 4, (area) => forecastArea(area, selectedTime));

  return {
    level,
    selectedTime,
    generatedAt: new Date().toISOString(),
    source: 'open_meteo',
    note: 'Map averages use Natural Earth country boundaries when imported, simplified polygon grids as fallback, and precise point samples for locality areas.',
    areas: results,
  };
}

export function normalizeLevel(level) {
  if (!MAP_LEVELS.includes(level)) {
    throw validationError('invalid_map_level', `level must be one of: ${MAP_LEVELS.join(', ')}.`);
  }
  return level;
}

export function normalizeSelectedTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw validationError('invalid_time', 'time must be a valid ISO-8601 date/time.');
  }
  date.setUTCMinutes(0, 0, 0);
  return date.toISOString();
}

async function forecastArea(area, selectedTime) {
  const targetSamples = getSamplesForArea(area);
  const samplingMetadata = getSamplingMetadataForArea(area);
  const samples = await mapWithConcurrency(targetSamples, 4, (sample) => forecastSample(sample, selectedTime));
  const validSamples = samples.filter((sample) => sample.temperatureCelsius !== null);
  const totalWeight = validSamples.reduce((sum, sample) => sum + sample.weight, 0);
  const averageTemperature = validSamples.length === 0
    ? null
    : round2(validSamples.reduce((sum, sample) => sum + sample.temperatureCelsius * sample.weight, 0) / totalWeight);
  const confidence = validSamples.length === 0
    ? 0
    : round2((validSamples.length / targetSamples.length) * 100);
  const temperatures = validSamples.map((sample) => sample.temperatureCelsius);

  return {
    id: area.id,
    level: area.level,
    label: area.label,
    countryCode: area.countryCode,
    latitude: area.latitude,
    longitude: area.longitude,
    selectedTime,
    averageTemperature,
    unit: 'celsius',
    confidence,
    sampleCount: targetSamples.length,
    validSampleCount: validSamples.length,
    samplingMethod: samplingMetadata.method,
    polygonCount: samplingMetadata.polygonCount,
    boundarySource: samplingMetadata.boundarySource,
    temperatureMin: temperatures.length === 0 ? null : round2(Math.min(...temperatures)),
    temperatureMax: temperatures.length === 0 ? null : round2(Math.max(...temperatures)),
    samples,
  };
}

async function forecastSample(sample, selectedTime) {
  try {
    const forecast = await fetchJson(buildOpenMeteoMapUrl(sample), {
      ttlMs: 20 * 60 * 1000,
      timeoutMs: 8000,
      retries: 1,
    });
    const temperature = selectTemperatureForTime(forecast, selectedTime);

    return {
      latitude: sample.latitude,
      longitude: sample.longitude,
      weight: sample.weight ?? 1,
      sampleKind: sample.sampleKind ?? 'point',
      temperatureCelsius: temperature,
      status: temperature === null ? 'missing_time' : 'ok',
    };
  } catch (error) {
    return {
      latitude: sample.latitude,
      longitude: sample.longitude,
      weight: sample.weight ?? 1,
      sampleKind: sample.sampleKind ?? 'point',
      temperatureCelsius: null,
      status: 'error',
      reason: error.message,
    };
  }
}

export function buildOpenMeteoMapUrl(sample) {
  const url = new URL(OPEN_METEO_FORECAST_URL);
  url.searchParams.set('latitude', String(sample.latitude));
  url.searchParams.set('longitude', String(sample.longitude));
  url.searchParams.set('timezone', 'UTC');
  url.searchParams.set('hourly', 'temperature_2m');
  url.searchParams.set('forecast_days', '14');
  return url.toString();
}

export function selectTemperatureForTime(forecast, selectedTime) {
  const times = forecast?.hourly?.time;
  const values = forecast?.hourly?.temperature_2m;
  if (!Array.isArray(times) || !Array.isArray(values)) return null;

  const target = selectedTime.slice(0, 13);
  const index = times.findIndex((time) => time.slice(0, 13) === target);
  const value = values[index];
  return Number.isFinite(value) ? value : null;
}

async function mapWithConcurrency(values, concurrency, mapper) {
  const results = new Array(values.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < values.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(values[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return results;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}
