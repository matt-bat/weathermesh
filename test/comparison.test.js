import assert from 'node:assert/strict';
import test from 'node:test';
import { buildForecastComparisons, filterComparisonRows } from '../src/comparison.js';

const location = {
  latitude: 51.0528,
  longitude: -114.0862,
  elevationMeters: 1048,
  countryCode: 'CA',
  district: 'NW',
  neighbourhood: 'Kensington',
};

const binding = {
  type: 'grid',
  latitude: 51.0528,
  longitude: -114.0862,
  elevationMeters: 1048,
  district: 'NW',
  neighbourhood: 'Kensington',
};

test('buildForecastComparisons reports aggregate and source deltas for matched slots', () => {
  const rows = buildForecastComparisons(
    location,
    [
      {
        sourceId: 'open_meteo',
        variable: 'temperature',
        value: 20,
        unit: 'celsius',
        validTime: '2026-06-20T18:00:00.000Z',
        issuedAt: '2026-06-20T12:00:00.000Z',
        horizonHours: 6,
        binding,
      },
      {
        sourceId: 'msc_eccc_geomet',
        variable: 'temperature',
        value: 22,
        unit: 'celsius',
        validTime: '2026-06-20T18:00:00.000Z',
        issuedAt: '2026-06-20T12:00:00.000Z',
        horizonHours: 6,
        binding,
        sourceReliability: 0.95,
      },
    ],
    { now: new Date('2026-06-20T13:00:00.000Z') },
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].sourceCount, 2);
  assert.equal(rows[0].sources.length, 2);
  assert.ok(rows[0].aggregateValue > 20);
  assert.ok(rows[0].aggregateValue < 22);
  assert.equal(rows[0].sources[0].sourceId, 'msc_eccc_geomet');
  assert.equal(rows[0].sources[1].sourceId, 'open_meteo');
});

test('filterComparisonRows can require multiple contributing sources', () => {
  const rows = [
    { variable: 'temperature', sourceCount: 1 },
    { variable: 'temperature', sourceCount: 2 },
    { variable: 'wind_speed', sourceCount: 3 },
  ];

  assert.deepEqual(filterComparisonRows(rows, { requireMultipleSources: true }), [
    { variable: 'temperature', sourceCount: 2 },
  ]);
});

