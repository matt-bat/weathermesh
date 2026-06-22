import assert from 'node:assert/strict';
import test from 'node:test';
import { buildForecastViews, summarizeByDay, summarizeByWeek } from '../src/views.js';

const rows = [
  {
    validTime: '2026-06-20T06:00:00.000Z',
    variable: 'temperature',
    unit: 'celsius',
    aggregateValue: 10,
    confidence: 70,
    sourceCount: 2,
    spread: 1,
  },
  {
    validTime: '2026-06-20T12:00:00.000Z',
    variable: 'temperature',
    unit: 'celsius',
    aggregateValue: 18,
    confidence: 80,
    sourceCount: 2,
    spread: 2,
  },
  {
    validTime: '2026-06-20T12:00:00.000Z',
    variable: 'precipitation_probability',
    unit: 'percent',
    aggregateValue: 30,
    confidence: 50,
    sourceCount: 2,
    spread: 15,
  },
  {
    validTime: '2026-06-21T06:00:00.000Z',
    variable: 'temperature',
    unit: 'celsius',
    aggregateValue: 12,
    confidence: 65,
    sourceCount: 1,
    spread: 0,
  },
];

test('summarizeByDay summarizes values by variable', () => {
  const days = summarizeByDay(rows);

  assert.equal(days.length, 2);
  assert.equal(days[0].validTime, '2026-06-20');
  assert.deepEqual(days[0].variables.temperature, {
    average: 14,
    min: 10,
    max: 18,
    unit: 'celsius',
    sourceCount: 2,
    confidence: 75,
  });
  assert.equal(days[0].variables.precipitation_probability.average, 30);
});

test('summarizeByWeek creates compact weekly summaries', () => {
  const weeks = summarizeByWeek(rows);

  assert.equal(weeks.length, 1);
  assert.equal(weeks[0].validTime, 'Week 1');
  assert.equal(weeks[0].variables.temperature.min, 10);
  assert.equal(weeks[0].variables.temperature.max, 18);
});

test('buildForecastViews returns all app-facing forecast views', () => {
  const views = buildForecastViews(rows, {
    hourlyLimit: 2,
    dailyLimit: 1,
    weeklyLimit: 1,
    fourteenDayLimit: 1,
  });

  assert.equal(views.hourly.length, 2);
  assert.equal(views.daily.length, 1);
  assert.equal(views.weekly.length, 1);
  assert.equal(views.fourteenDay.length, 1);
});

