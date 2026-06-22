import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildOpenMeteoMapUrl,
  normalizeLevel,
  normalizeSelectedTime,
  selectTemperatureForTime,
} from '../src/map/service.js';
import { buildWeightedGridSamples, getMapAreasByLevel, getSamplesForArea } from '../src/map/areas.js';
import { getCountryBoundary, hasCountryBoundaryData } from '../src/map/boundaries.js';
import { pointInAnyPolygon, pointInPolygon } from '../src/map/polygon.js';

test('getMapAreasByLevel returns configured country samples', () => {
  const countries = getMapAreasByLevel('country');

  assert.ok(countries.length >= 4);
  assert.ok(countries.every((area) => getSamplesForArea(area).length > 0));
  assert.ok(getSamplesForArea(countries[0]).every((sample) => Number.isFinite(sample.weight)));
});

test('Natural Earth country boundary data is available for configured country areas', () => {
  assert.equal(hasCountryBoundaryData(), true);
  assert.ok(getCountryBoundary('US').polygons.length > 0);
  assert.ok(getCountryBoundary('CA').bounds.north > getCountryBoundary('CA').bounds.south);
});

test('country map samples use imported Natural Earth boundaries when available', () => {
  const [country] = getMapAreasByLevel('country');
  const samples = getSamplesForArea(country);

  assert.ok(samples.length > 0);
  assert.ok(samples.every((sample) => sample.sampleKind === 'polygon_grid'));
});

test('buildWeightedGridSamples creates included weighted sample cells', () => {
  const samples = buildWeightedGridSamples({
    method: 'weighted_grid',
    rows: 2,
    cols: 2,
    bounds: { north: 20, south: 0, west: 0, east: 20 },
    include: [{ north: 20, south: 0, west: 0, east: 10 }],
  });

  assert.equal(samples.length, 2);
  assert.ok(samples.every((sample) => sample.longitude < 10));
  assert.ok(samples.every((sample) => sample.sampleKind === 'grid'));
});

test('pointInPolygon identifies points inside a simple polygon', () => {
  const ring = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];

  assert.equal(pointInPolygon(5, 5, ring), true);
  assert.equal(pointInPolygon(15, 5, ring), false);
  assert.equal(pointInAnyPolygon(5, 5, [ring]), true);
});

test('buildWeightedGridSamples filters samples through polygons', () => {
  const samples = buildWeightedGridSamples({
    method: 'weighted_grid',
    rows: 2,
    cols: 2,
    bounds: { north: 20, south: 0, west: 0, east: 20 },
    polygons: [[[0, 0], [20, 0], [20, 10], [0, 10], [0, 0]]],
  });

  assert.equal(samples.length, 2);
  assert.ok(samples.every((sample) => sample.longitude < 10));
  assert.ok(samples.every((sample) => sample.sampleKind === 'polygon_grid'));
});

test('normalizeLevel rejects unsupported map levels', () => {
  assert.equal(normalizeLevel('country'), 'country');
  assert.throws(() => normalizeLevel('planet'), /level must be one of/);
});

test('normalizeSelectedTime rounds to the hour', () => {
  assert.equal(
    normalizeSelectedTime('2026-06-20T07:34:12.000Z'),
    '2026-06-20T07:00:00.000Z',
  );
});

test('buildOpenMeteoMapUrl requests only hourly temperature for map samples', () => {
  const url = new URL(buildOpenMeteoMapUrl({ latitude: 51.05, longitude: -114.08 }));

  assert.equal(url.searchParams.get('hourly'), 'temperature_2m');
  assert.equal(url.searchParams.get('forecast_days'), '14');
  assert.equal(url.searchParams.get('timezone'), 'UTC');
});

test('selectTemperatureForTime picks matching hourly temperature', () => {
  const temperature = selectTemperatureForTime(
    {
      hourly: {
        time: ['2026-06-20T06:00', '2026-06-20T07:00'],
        temperature_2m: [10.2, 11.5],
      },
    },
    '2026-06-20T07:00:00.000Z',
  );

  assert.equal(temperature, 11.5);
});
