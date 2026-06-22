import { evaluateLocalityMatch } from './locality.js';
import { getSourceById } from './sources/registry.js';

export function aggregateWeatherPoints(location, points, options = {}) {
  if (!Array.isArray(points)) {
    throw new TypeError('points must be an array.');
  }

  const eligible = [];
  const rejected = [];

  for (const point of points) {
    const locality = evaluateLocalityMatch(location, point.binding ?? point, options.localityRules);
    if (!locality.eligible) {
      rejected.push({ point, reasons: locality.reasons });
      continue;
    }

    eligible.push({
      point,
      locality,
      weight: calculatePointWeight(point, locality, options.now),
    });
  }

  if (eligible.length === 0) {
    return {
      value: null,
      confidence: 0,
      sourceCount: 0,
      spread: null,
      eligible: [],
      rejected,
    };
  }

  const totalWeight = eligible.reduce((sum, item) => sum + item.weight, 0);
  const weightedValue =
    totalWeight === 0
      ? average(eligible.map((item) => item.point.value))
      : eligible.reduce((sum, item) => sum + item.point.value * item.weight, 0) / totalWeight;
  const values = eligible.map((item) => item.point.value);
  const spread = Math.max(...values) - Math.min(...values);

  return {
    value: round2(weightedValue),
    confidence: calculateConfidence(eligible, spread, eligible[0]?.point.variable),
    sourceCount: new Set(eligible.map((item) => item.point.sourceId)).size,
    spread: round2(spread),
    eligible,
    rejected,
  };
}

export function groupPointsByForecastSlot(points) {
  const groups = new Map();

  for (const point of points) {
    const key = `${point.validTime}|${point.variable}|${point.unit}`;
    const existing = groups.get(key) ?? [];
    existing.push(point);
    groups.set(key, existing);
  }

  return groups;
}

export function aggregateForecastSlots(location, points, options = {}) {
  const groups = groupPointsByForecastSlot(points);
  const results = [];

  for (const [key, slotPoints] of groups.entries()) {
    const [validTime, variable, unit] = key.split('|');
    results.push({
      validTime,
      variable,
      unit,
      ...aggregateWeatherPoints(location, slotPoints, options),
    });
  }

  return results.sort((a, b) => a.validTime.localeCompare(b.validTime));
}

export function calculatePointWeight(point, locality, now = new Date()) {
  const source = getSourceById(point.sourceId);
  const sourceReliability = numericOr(point.sourceReliability, source?.defaultReliability, 0.5);
  const quality = numericOr(point.quality, 1);
  const freshness = calculateFreshness(point.issuedAt, now);
  const horizonConfidence = calculateHorizonConfidence(point.horizonHours);
  const localityScore = locality.score;

  return round4(sourceReliability * quality * freshness * horizonConfidence * localityScore);
}

function calculateFreshness(issuedAt, now) {
  if (!issuedAt) return 0.8;

  const issued = new Date(issuedAt);
  if (Number.isNaN(issued.getTime())) return 0.5;

  const ageHours = Math.max(0, (new Date(now).getTime() - issued.getTime()) / 3600000);
  if (ageHours <= 1) return 1;
  if (ageHours <= 6) return 0.9;
  if (ageHours <= 12) return 0.75;
  if (ageHours <= 24) return 0.5;
  return 0.2;
}

function calculateHorizonConfidence(horizonHours) {
  if (!Number.isFinite(horizonHours)) return 0.8;
  if (horizonHours <= 24) return 1;
  if (horizonHours <= 72) return 0.85;
  if (horizonHours <= 168) return 0.65;
  if (horizonHours <= 336) return 0.4;
  return 0.25;
}

function calculateConfidence(eligible, spread, variable) {
  const sourceCount = new Set(eligible.map((item) => item.point.sourceId)).size;
  const averageWeight = average(eligible.map((item) => item.weight));
  const sourceCountScore = Math.min(sourceCount / 3, 1);
  const spreadPenalty = Math.min(spread / spreadToleranceForVariable(variable), 0.6);

  return round2(clamp((averageWeight * 0.7 + sourceCountScore * 0.3 - spreadPenalty) * 100, 0, 100));
}

function spreadToleranceForVariable(variable) {
  if (variable === 'temperature') return 15;
  if (variable === 'precipitation_probability') return 60;
  if (variable === 'relative_humidity') return 50;
  if (variable === 'cloud_cover') return 60;
  if (variable === 'wind_speed' || variable === 'wind_gust') return 40;
  if (variable === 'pressure') return 30;
  if (variable === 'precipitation_amount') return 25;
  return 20;
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function numericOr(...values) {
  return values.find((value) => Number.isFinite(value));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function round4(value) {
  return Math.round(value * 10000) / 10000;
}
