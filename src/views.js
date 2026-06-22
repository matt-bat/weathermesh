const DEFAULT_VIEW_VARIABLES = Object.freeze(['temperature', 'precipitation_probability', 'wind_speed']);

export function buildForecastViews(comparisons, options = {}) {
  const variables = options.variables ?? DEFAULT_VIEW_VARIABLES;
  const sorted = comparisons
    .filter((row) => variables.includes(row.variable))
    .sort((a, b) => a.validTime.localeCompare(b.validTime));

  return {
    hourly: sorted.slice(0, options.hourlyLimit ?? 72),
    daily: summarizeByDay(sorted).slice(0, options.dailyLimit ?? 7),
    weekly: summarizeByWeek(sorted).slice(0, options.weeklyLimit ?? 2),
    fourteenDay: summarizeByDay(sorted).slice(0, options.fourteenDayLimit ?? 14),
  };
}

export function summarizeByDay(rows) {
  const groups = groupBy(rows, (row) => row.validTime.slice(0, 10));
  return [...groups.entries()].map(([date, groupRows]) => summarizeGroup(date, groupRows));
}

export function summarizeByWeek(rows) {
  const days = [...groupBy(rows, (row) => row.validTime.slice(0, 10)).entries()];
  const groups = [];

  for (let index = 0; index < days.length; index += 7) {
    groups.push(days.slice(index, index + 7).flatMap(([, dayRows]) => dayRows));
  }

  return groups.map((rows, index) => summarizeGroup(`Week ${index + 1}`, rows));
}

function summarizeGroup(validTime, rows) {
  const byVariable = groupBy(rows, (row) => row.variable);
  const values = {};

  for (const [variable, variableRows] of byVariable.entries()) {
    values[variable] = summarizeVariable(variableRows);
  }

  const allSourceCounts = rows.map((row) => row.sourceCount);
  const allConfidence = rows.map((row) => row.confidence).filter(Number.isFinite);
  const allSpread = rows.map((row) => row.spread).filter(Number.isFinite);

  return {
    validTime,
    variables: values,
    confidence: round2(average(allConfidence)),
    sourceCount: allSourceCounts.length === 0 ? 0 : Math.max(...allSourceCounts),
    spread: allSpread.length === 0 ? null : round2(Math.max(...allSpread)),
  };
}

function summarizeVariable(rows) {
  const values = rows.map((row) => row.aggregateValue).filter(Number.isFinite);

  return {
    average: round2(average(values)),
    min: values.length === 0 ? null : round2(Math.min(...values)),
    max: values.length === 0 ? null : round2(Math.max(...values)),
    unit: rows[0]?.unit ?? null,
    sourceCount: Math.max(...rows.map((row) => row.sourceCount)),
    confidence: round2(average(rows.map((row) => row.confidence).filter(Number.isFinite))),
  };
}

function groupBy(values, keyFn) {
  const groups = new Map();
  for (const value of values) {
    const key = keyFn(value);
    const group = groups.get(key) ?? [];
    group.push(value);
    groups.set(key, group);
  }
  return groups;
}

function average(values) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round2(value) {
  if (!Number.isFinite(value)) return value;
  return Math.round(value * 100) / 100;
}
