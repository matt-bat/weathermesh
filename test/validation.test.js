import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeLocation, normalizePipelineOptions, parseLimit } from '../src/validation.js';

test('normalizeLocation accepts valid coordinate strings', () => {
  assert.deepEqual(normalizeLocation({
    latitude: '51.05',
    longitude: '-114.08',
    countryCode: 'ca',
    elevationMeters: '1048',
  }), {
    latitude: 51.05,
    longitude: -114.08,
    countryCode: 'CA',
    city: undefined,
    district: undefined,
    neighbourhood: undefined,
    elevationMeters: 1048,
    timezone: undefined,
  });
});

test('normalizeLocation rejects out-of-range coordinates', () => {
  assert.throws(
    () => normalizeLocation({ latitude: 100, longitude: 0, countryCode: 'US' }),
    /latitude must be a number/,
  );
  assert.throws(
    () => normalizeLocation({ latitude: 0, longitude: -200, countryCode: 'US' }),
    /longitude must be a number/,
  );
});

test('parseLimit bounds forecast response size', () => {
  assert.equal(parseLimit(null, 120), 120);
  assert.equal(parseLimit('24'), 24);
  assert.throws(() => parseLimit('9999'), /between 1 and 500/);
});

test('normalizePipelineOptions rejects unknown source ids', () => {
  assert.throws(
    () => normalizePipelineOptions({ sourceIds: ['not_real'] }),
    /unknown source id/,
  );
});

