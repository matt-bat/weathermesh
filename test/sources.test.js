import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildNoaaPointUrl,
  normalizePointBinding,
  noaaNwsAdapter,
} from '../src/sources/adapters/noaa-nws.js';
import {
  buildOpenMeteoForecastUrl,
  normalizeOpenMeteoForecast,
} from '../src/sources/adapters/open-meteo.js';
import { getMvpSourcesForCountry } from '../src/sources/registry.js';

test('getMvpSourcesForCountry includes official country source and global model source', () => {
  assert.deepEqual(
    getMvpSourcesForCountry('US').map((source) => source.id),
    ['noaa_nws', 'open_meteo'],
  );

  assert.deepEqual(
    getMvpSourcesForCountry('CA').map((source) => source.id),
    ['msc_eccc_geomet', 'open_meteo'],
  );
});

test('buildNoaaPointUrl creates a point lookup URL', () => {
  assert.equal(
    buildNoaaPointUrl({ latitude: 39.74561, longitude: -97.08921 }),
    'https://api.weather.gov/points/39.7456,-97.0892',
  );
});

test('normalizePointBinding stores NOAA grid and endpoint metadata', () => {
  const binding = normalizePointBinding(
    {
      latitude: 39.7456,
      longitude: -97.0892,
      elevationMeters: 430,
    },
    {
      properties: {
        gridId: 'TOP',
        gridX: 31,
        gridY: 80,
        forecast: 'https://api.weather.gov/gridpoints/TOP/31,80/forecast',
        forecastHourly: 'https://api.weather.gov/gridpoints/TOP/31,80/forecast/hourly',
        forecastGridData: 'https://api.weather.gov/gridpoints/TOP/31,80',
        observationStations: 'https://api.weather.gov/gridpoints/TOP/31,80/stations',
        timeZone: 'America/Chicago',
      },
    },
  );

  assert.equal(binding.type, 'grid');
  assert.equal(binding.key, 'TOP/31,80');
  assert.equal(binding.metadata.forecastHourlyUrl, 'https://api.weather.gov/gridpoints/TOP/31,80/forecast/hourly');
});

test('noaaNwsAdapter normalizes forecast periods into weather points', async () => {
  const points = await noaaNwsAdapter.normalize({
    properties: {
      periods: [
        {
          startTime: '2026-06-20T18:00:00-05:00',
          generatedAt: '2026-06-20T12:00:00-05:00',
          temperature: 77,
          temperatureUnit: 'F',
          probabilityOfPrecipitation: { value: 30 },
        },
      ],
    },
  });

  assert.deepEqual(
    points.map((point) => [point.variable, point.value, point.unit]),
    [
      ['temperature', 25, 'celsius'],
      ['precipitation_probability', 30, 'percent'],
    ],
  );
});

test('buildOpenMeteoForecastUrl includes 14-day weather variables', () => {
  const url = new URL(
    buildOpenMeteoForecastUrl({
      latitude: 51.0528,
      longitude: -114.0862,
      timezone: 'America/Edmonton',
    }),
  );

  assert.equal(url.hostname, 'api.open-meteo.com');
  assert.equal(url.searchParams.get('forecast_days'), '14');
  assert.equal(url.searchParams.get('timezone'), 'America/Edmonton');
  assert.ok(url.searchParams.get('hourly').includes('temperature_2m'));
  assert.ok(url.searchParams.get('daily').includes('temperature_2m_max'));
});

test('normalizeOpenMeteoForecast converts hourly arrays into weather points', () => {
  const points = normalizeOpenMeteoForecast({
    hourly_units: {
      temperature_2m: '°C',
      precipitation_probability: '%',
      wind_speed_10m: 'km/h',
    },
    hourly: {
      time: ['2026-06-20T18:00', '2026-06-20T19:00'],
      temperature_2m: [21.2, 21.7],
      precipitation_probability: [10, 15],
      wind_speed_10m: [12, 14],
    },
  });

  assert.equal(points.length, 6);
  assert.deepEqual(points[0], {
    sourceId: 'open_meteo',
    variable: 'temperature',
    value: 21.2,
    unit: 'celsius',
    validTime: '2026-06-20T18:00:00.000Z',
    horizonHours: 0,
    binding: undefined,
    quality: 1,
    flags: [],
  });
  assert.equal(points.at(-1).variable, 'wind_speed');
  assert.equal(points.at(-1).unit, 'kmh');
});
