import { getSourceById } from '../registry.js';
import { fetchJson } from '../../http.js';

const source = getSourceById('noaa_nws');
const USER_AGENT = 'aggregate-weather-app/0.1 contact@example.com';

export const noaaNwsAdapter = {
  id: 'noaa_nws',

  async resolveBinding(location, options = {}) {
    validateCoordinate(location);

    if (options.fetchPoint === true) {
      const point = await fetchJson(buildNoaaPointUrl(location), {
        headers: {
          'User-Agent': options.userAgent ?? USER_AGENT,
        },
      });
      return [normalizePointBinding(location, point)];
    }

    return [
      {
        sourceId: this.id,
        type: 'coordinate',
        key: `${location.latitude.toFixed(5)},${location.longitude.toFixed(5)}`,
        latitude: location.latitude,
        longitude: location.longitude,
        elevationMeters: location.elevationMeters,
        metadata: {
          pointUrl: buildNoaaPointUrl(location),
          requiredHeaders: {
            'User-Agent': USER_AGENT,
          },
        },
      },
    ];
  },

  async fetchForecast(binding, options = {}) {
    const forecastUrl = options.hourly
      ? binding?.metadata?.forecastHourlyUrl
      : binding?.metadata?.forecastUrl;

    if (!forecastUrl) {
      throw new Error('NOAA/NWS binding is missing forecast URL metadata.');
    }

    return fetchJson(forecastUrl, {
      headers: {
        'User-Agent': options.userAgent ?? USER_AGENT,
      },
    });
  },

  async fetchObservations(binding, options = {}) {
    const stationsUrl = binding?.metadata?.observationStationsUrl;
    if (!stationsUrl) {
      throw new Error('NOAA/NWS binding is missing observation stations URL metadata.');
    }

    return fetchJson(stationsUrl, {
      headers: {
        'User-Agent': options.userAgent ?? USER_AGENT,
      },
    });
  },

  async normalize(rawForecast, context = {}) {
    const periods = rawForecast?.properties?.periods;
    if (!Array.isArray(periods)) {
      return [];
    }

    return periods.flatMap((period) => normalizeForecastPeriod(period, context));
  },
};

export function buildNoaaPointUrl(location) {
  validateCoordinate(location);
  return `${source.baseUrl}/points/${roundCoordinate(location.latitude)},${roundCoordinate(location.longitude)}`;
}

export function normalizePointBinding(location, pointResponse) {
  const properties = pointResponse?.properties;
  if (!properties?.gridId || !Number.isFinite(properties.gridX) || !Number.isFinite(properties.gridY)) {
    throw new Error('NOAA/NWS point response is missing grid metadata.');
  }

  return {
    sourceId: 'noaa_nws',
    type: 'grid',
    key: `${properties.gridId}/${properties.gridX},${properties.gridY}`,
    latitude: location.latitude,
    longitude: location.longitude,
    elevationMeters: location.elevationMeters,
    metadata: {
      office: properties.gridId,
      gridX: properties.gridX,
      gridY: properties.gridY,
      forecastUrl: properties.forecast,
      forecastHourlyUrl: properties.forecastHourly,
      forecastGridDataUrl: properties.forecastGridData,
      observationStationsUrl: properties.observationStations,
      forecastZone: properties.forecastZone,
      county: properties.county,
      fireWeatherZone: properties.fireWeatherZone,
      timeZone: properties.timeZone,
    },
  };
}

function normalizeForecastPeriod(period, context = {}) {
  const validTime = normalizeValidTime(period.startTime);
  const issuedAt = normalizeValidTime(period.generatedAt);
  const points = [];

  if (Number.isFinite(period.temperature)) {
    points.push({
      sourceId: 'noaa_nws',
      variable: 'temperature',
      value: convertTemperatureToCelsius(period.temperature, period.temperatureUnit),
      unit: 'celsius',
      validTime,
      issuedAt,
      horizonHours: calculateHorizonHours(issuedAt, validTime),
      binding: context.binding,
      quality: 1,
      flags: [],
    });
  }

  if (period.probabilityOfPrecipitation?.value !== null && Number.isFinite(period.probabilityOfPrecipitation?.value)) {
    points.push({
      sourceId: 'noaa_nws',
      variable: 'precipitation_probability',
      value: period.probabilityOfPrecipitation.value,
      unit: 'percent',
      validTime,
      issuedAt,
      horizonHours: calculateHorizonHours(issuedAt, validTime),
      binding: context.binding,
      quality: 1,
      flags: [],
    });
  }

  return points;
}

function validateCoordinate(location) {
  if (!Number.isFinite(location?.latitude) || !Number.isFinite(location?.longitude)) {
    throw new TypeError('Location must include numeric latitude and longitude.');
  }
}

function roundCoordinate(value) {
  return Number(value).toFixed(4);
}

function convertTemperatureToCelsius(value, unit) {
  if (unit === 'C') return value;
  if (unit === 'F') return Math.round(((value - 32) * 5) / 9 * 10) / 10;
  return value;
}

function normalizeValidTime(value) {
  if (!value) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  date.setUTCMinutes(0, 0, 0);
  return date.toISOString();
}

function calculateHorizonHours(issuedAt, validTime) {
  if (!issuedAt || !validTime) return null;
  const issued = new Date(issuedAt);
  const valid = new Date(validTime);
  if (Number.isNaN(issued.getTime()) || Number.isNaN(valid.getTime())) return null;
  return Math.max(0, Math.round((valid.getTime() - issued.getTime()) / 3600000));
}
