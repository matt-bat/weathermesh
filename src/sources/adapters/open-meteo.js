import { fetchJson } from '../../http.js';

const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

export const openMeteoAdapter = {
  id: 'open_meteo',

  async resolveBinding(location) {
    validateCoordinate(location);

    return [
      {
        sourceId: this.id,
        type: 'coordinate',
        key: `${location.latitude.toFixed(5)},${location.longitude.toFixed(5)}`,
        latitude: location.latitude,
        longitude: location.longitude,
        elevationMeters: location.elevationMeters,
        metadata: {
          forecastUrl: buildOpenMeteoForecastUrl(location),
        },
      },
    ];
  },

  async fetchForecast(binding, options = {}) {
    const forecastUrl = options.url ?? binding?.metadata?.forecastUrl;
    if (!forecastUrl) {
      throw new Error('Open-Meteo binding is missing forecast URL metadata.');
    }

    return fetchJson(forecastUrl);
  },

  async fetchObservations() {
    return [];
  },

  async normalize(rawForecast, context = {}) {
    return normalizeOpenMeteoForecast(rawForecast, context);
  },
};

export function buildOpenMeteoForecastUrl(location, options = {}) {
  validateCoordinate(location);

  const url = new URL(OPEN_METEO_FORECAST_URL);
  url.searchParams.set('latitude', String(location.latitude));
  url.searchParams.set('longitude', String(location.longitude));
  url.searchParams.set('timezone', options.timezone ?? location.timezone ?? 'auto');
  url.searchParams.set(
    'hourly',
    [
      'temperature_2m',
      'relative_humidity_2m',
      'precipitation_probability',
      'precipitation',
      'wind_speed_10m',
      'wind_gusts_10m',
      'pressure_msl',
      'cloud_cover',
    ].join(','),
  );
  url.searchParams.set(
    'daily',
    [
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_probability_max',
      'precipitation_sum',
      'wind_speed_10m_max',
      'wind_gusts_10m_max',
    ].join(','),
  );
  url.searchParams.set('forecast_days', String(options.forecastDays ?? 14));

  return url.toString();
}

export function normalizeOpenMeteoForecast(rawForecast, context = {}) {
  const points = [];
  const hourly = rawForecast?.hourly;
  const hourlyUnits = rawForecast?.hourly_units ?? {};

  if (Array.isArray(hourly?.time)) {
    addSeries(points, hourly, hourlyUnits, 'temperature_2m', 'temperature', 'celsius', context);
    addSeries(points, hourly, hourlyUnits, 'relative_humidity_2m', 'relative_humidity', 'percent', context);
    addSeries(points, hourly, hourlyUnits, 'precipitation_probability', 'precipitation_probability', 'percent', context);
    addSeries(points, hourly, hourlyUnits, 'precipitation', 'precipitation_amount', 'mm', context);
    addSeries(points, hourly, hourlyUnits, 'wind_speed_10m', 'wind_speed', normalizedWindUnit(hourlyUnits.wind_speed_10m), context);
    addSeries(points, hourly, hourlyUnits, 'wind_gusts_10m', 'wind_gust', normalizedWindUnit(hourlyUnits.wind_gusts_10m), context);
    addSeries(points, hourly, hourlyUnits, 'pressure_msl', 'pressure', normalizedPressureUnit(hourlyUnits.pressure_msl), context);
    addSeries(points, hourly, hourlyUnits, 'cloud_cover', 'cloud_cover', 'percent', context);
  }

  return points;
}

function addSeries(points, data, units, sourceKey, variable, unit, context) {
  const values = data[sourceKey];
  if (!Array.isArray(values)) return;

  for (let index = 0; index < data.time.length; index += 1) {
    const value = values[index];
    if (!Number.isFinite(value)) continue;

    points.push({
      sourceId: 'open_meteo',
      variable,
      value,
      unit: unit ?? units[sourceKey] ?? 'unknown',
      validTime: toIsoLike(data.time[index]),
      horizonHours: index,
      binding: context.binding,
      quality: 1,
      flags: [],
    });
  }
}

function normalizedWindUnit(unit) {
  if (unit === 'km/h') return 'kmh';
  if (unit === 'mph') return 'mph';
  if (unit === 'm/s') return 'mps';
  return unit ?? 'unknown';
}

function normalizedPressureUnit(unit) {
  if (unit === 'hPa') return 'hpa';
  return unit ?? 'unknown';
}

function toIsoLike(value) {
  if (typeof value !== 'string') return value;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(`${normalized.length === 16 ? `${normalized}:00` : normalized}Z`);
  if (Number.isNaN(date.getTime())) return normalized;
  date.setUTCMinutes(0, 0, 0);
  return date.toISOString();
}

function validateCoordinate(location) {
  if (!Number.isFinite(location?.latitude) || !Number.isFinite(location?.longitude)) {
    throw new TypeError('Location must include numeric latitude and longitude.');
  }
}
