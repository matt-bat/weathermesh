import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aggregateForecastSlots,
  aggregateWeatherPoints,
  calculatePointWeight,
} from '../src/aggregation.js';

const location = {
  latitude: 39.7456,
  longitude: -97.0892,
  elevationMeters: 430,
  countryCode: 'US',
  city: 'Example',
  district: 'Central',
  neighbourhood: 'Core',
};

const basePoint = {
  variable: 'temperature',
  unit: 'celsius',
  validTime: '2026-06-20T18:00:00.000Z',
  issuedAt: '2026-06-20T12:00:00.000Z',
  horizonHours: 6,
  binding: {
    type: 'grid',
    latitude: 39.7457,
    longitude: -97.0891,
    elevationMeters: 428,
    district: 'Central',
    neighbourhood: 'Core',
  },
};

test('calculatePointWeight combines source reliability and locality score', () => {
  const weight = calculatePointWeight(
    { ...basePoint, sourceId: 'noaa_nws', value: 22 },
    { score: 0.9 },
    new Date('2026-06-20T13:00:00.000Z'),
  );

  assert.ok(weight > 0.75);
  assert.ok(weight < 0.9);
});

test('aggregateWeatherPoints averages eligible source values and rejects mismatched locality', () => {
  const result = aggregateWeatherPoints(
    location,
    [
      {
        ...basePoint,
        sourceId: 'noaa_nws',
        value: 20,
      },
      {
        ...basePoint,
        sourceId: 'open_meteo',
        value: 22,
        sourceReliability: 0.7,
      },
      {
        ...basePoint,
        sourceId: 'open_meteo',
        value: 31,
        binding: {
          type: 'grid',
          latitude: 39.9,
          longitude: -97.25,
          elevationMeters: 430,
          district: 'North',
          neighbourhood: 'Other',
        },
      },
    ],
    { now: new Date('2026-06-20T13:00:00.000Z') },
  );

  assert.equal(result.sourceCount, 2);
  assert.equal(result.rejected.length, 1);
  assert.ok(result.value > 20);
  assert.ok(result.value < 22);
  assert.equal(result.spread, 2);
  assert.ok(result.confidence > 0);
});

test('aggregateForecastSlots groups by valid time, variable, and unit', () => {
  const results = aggregateForecastSlots(
    location,
    [
      {
        ...basePoint,
        sourceId: 'noaa_nws',
        value: 20,
      },
      {
        ...basePoint,
        sourceId: 'open_meteo',
        value: 22,
      },
      {
        ...basePoint,
        sourceId: 'noaa_nws',
        variable: 'wind_speed',
        unit: 'kmh',
        value: 15,
      },
    ],
    { now: new Date('2026-06-20T13:00:00.000Z') },
  );

  assert.equal(results.length, 2);
  assert.deepEqual(
    results.map((result) => result.variable).sort(),
    ['temperature', 'wind_speed'],
  );
});

test('precipitation probability spread is not penalized like temperature spread', () => {
  const result = aggregateWeatherPoints(
    location,
    [
      {
        ...basePoint,
        sourceId: 'noaa_nws',
        variable: 'precipitation_probability',
        unit: 'percent',
        value: 20,
      },
      {
        ...basePoint,
        sourceId: 'open_meteo',
        variable: 'precipitation_probability',
        unit: 'percent',
        value: 40,
      },
    ],
    { now: new Date('2026-06-20T13:00:00.000Z') },
  );

  assert.equal(result.spread, 20);
  assert.ok(result.confidence > 20);
});
