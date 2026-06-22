import assert from 'node:assert/strict';
import test from 'node:test';
import { runForecastComparison } from '../src/pipeline.js';

test('runForecastComparison validates location before provider work', async () => {
  await assert.rejects(
    () => runForecastComparison({ latitude: 120, longitude: 0, countryCode: 'US' }),
    /latitude must be a number/,
  );
});

test('runForecastComparison reports skipped unavailable adapters', async () => {
  const result = await runForecastComparison(
    { latitude: 51.05, longitude: -114.08, countryCode: 'CA' },
    { sourceIds: ['msc_eccc_geomet'], limit: 5 },
  );

  assert.equal(result.sourceResults.length, 1);
  assert.equal(result.sourceResults[0].sourceId, 'msc_eccc_geomet');
  assert.equal(result.sourceResults[0].status, 'error');
  assert.equal(result.sourceResults[0].pointCount, 0);
  assert.equal(typeof result.sourceResults[0].durationMs, 'number');
});

