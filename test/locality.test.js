import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateLocalityMatch, haversineMeters } from '../src/locality.js';

const kensington = {
  latitude: 51.0528,
  longitude: -114.0862,
  elevationMeters: 1048,
  countryCode: 'CA',
  city: 'Calgary',
  district: 'NW',
  neighbourhood: 'Kensington',
};

test('haversineMeters calculates a plausible local distance', () => {
  const sunnyside = {
    latitude: 51.0537,
    longitude: -114.0840,
  };

  const distance = haversineMeters(kensington, sunnyside);
  assert.ok(distance > 150);
  assert.ok(distance < 250);
});

test('evaluateLocalityMatch accepts a nearby point in the same locality', () => {
  const result = evaluateLocalityMatch(kensington, {
    type: 'station',
    latitude: 51.0537,
    longitude: -114.0840,
    elevationMeters: 1052,
    district: 'NW',
    neighbourhood: 'Kensington',
  });

  assert.equal(result.eligible, true);
  assert.deepEqual(result.reasons, []);
  assert.ok(result.score > 0.8);
});

test('evaluateLocalityMatch rejects broad city mixing across neighbourhoods', () => {
  const result = evaluateLocalityMatch(kensington, {
    type: 'station',
    latitude: 51.0447,
    longitude: -114.0719,
    elevationMeters: 1045,
    district: 'NW',
    neighbourhood: 'Downtown West End',
  });

  assert.equal(result.eligible, false);
  assert.deepEqual(result.reasons, ['neighbourhood_mismatch']);
});

test('evaluateLocalityMatch rejects high elevation mismatch', () => {
  const result = evaluateLocalityMatch(kensington, {
    type: 'station',
    latitude: 51.0537,
    longitude: -114.0840,
    elevationMeters: 1220,
    district: 'NW',
    neighbourhood: 'Kensington',
  });

  assert.equal(result.eligible, false);
  assert.deepEqual(result.reasons, ['elevation_mismatch']);
});

test('evaluateLocalityMatch rejects distant station even in same city', () => {
  const result = evaluateLocalityMatch(kensington, {
    type: 'station',
    latitude: 50.9097,
    longitude: -114.0101,
    elevationMeters: 1030,
    district: 'SE',
    neighbourhood: 'Seton',
  });

  assert.equal(result.eligible, false);
  assert.ok(result.reasons.includes('too_far'));
  assert.ok(result.reasons.includes('neighbourhood_mismatch'));
  assert.ok(result.reasons.includes('district_mismatch'));
});

