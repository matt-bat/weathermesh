import { aggregateForecastSlots } from './aggregation.js';

export function buildForecastComparisons(location, points, options = {}) {
  const aggregateSlots = aggregateForecastSlots(location, points, options);
  const pointGroups = groupComparablePoints(points);

  return aggregateSlots.map((slot) => {
    const key = comparisonKey(slot);
    const sourceRows = (pointGroups.get(key) ?? [])
      .filter((point) => slot.eligible.some((item) => item.point === point))
      .map((point) => ({
        sourceId: point.sourceId,
        value: point.value,
        unit: point.unit,
        deltaFromAggregate:
          slot.value === null ? null : round2(point.value - slot.value),
        issuedAt: point.issuedAt ?? null,
        horizonHours: point.horizonHours ?? null,
      }))
      .sort((a, b) => a.sourceId.localeCompare(b.sourceId));

    return {
      validTime: slot.validTime,
      variable: slot.variable,
      unit: slot.unit,
      aggregateValue: slot.value,
      confidence: slot.confidence,
      sourceCount: slot.sourceCount,
      spread: slot.spread,
      sources: sourceRows,
      rejectedCount: slot.rejected.length,
      rejectedReasons: summarizeRejected(slot.rejected),
    };
  });
}

export function filterComparisonRows(rows, options = {}) {
  const limit = options.limit ?? 48;
  const variables = new Set(options.variables ?? ['temperature', 'precipitation_probability']);
  const requireMultipleSources = options.requireMultipleSources ?? false;

  return rows
    .filter((row) => variables.has(row.variable))
    .filter((row) => !requireMultipleSources || row.sourceCount > 1)
    .slice(0, limit);
}

function groupComparablePoints(points) {
  const groups = new Map();

  for (const point of points) {
    const key = comparisonKey(point);
    const group = groups.get(key) ?? [];
    group.push(point);
    groups.set(key, group);
  }

  return groups;
}

function comparisonKey(value) {
  return `${value.validTime}|${value.variable}|${value.unit}`;
}

function summarizeRejected(rejected) {
  const reasons = new Map();

  for (const item of rejected) {
    for (const reason of item.reasons) {
      reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
    }
  }

  return Object.fromEntries(reasons.entries());
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

