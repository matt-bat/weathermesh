import { buildForecastComparisons, filterComparisonRows } from './comparison.js';
import { buildForecastViews } from './views.js';
import { getMvpSourcesForCountry } from './sources/registry.js';
import { getProviderAdapter } from './sources/index.js';
import { normalizeLocation, normalizePipelineOptions } from './validation.js';

export async function runForecastComparison(location, options = {}) {
  const normalizedLocation = normalizeLocation(location);
  const normalizedOptions = normalizePipelineOptions(options);
  const sourceIds = normalizedOptions.sourceIds ?? getMvpSourcesForCountry(normalizedLocation.countryCode).map((source) => source.id);
  const results = await Promise.all(sourceIds.map((sourceId) => fetchSourcePoints(sourceId, normalizedLocation, normalizedOptions)));
  const points = results.flatMap((result) => result.points);
  const sourceResults = results.map(({ points: _points, ...result }) => result);

  const comparisons = buildForecastComparisons(normalizedLocation, points, {
    now: normalizedOptions.now ?? new Date(),
  });
  const views = buildForecastViews(comparisons);

  return {
    location: normalizedLocation,
    generatedAt: new Date().toISOString(),
    sourceResults,
    pointCount: points.length,
    comparisons,
    views,
    preview: filterComparisonRows(comparisons, {
      limit: normalizedOptions.limit,
      variables: normalizedOptions.variables,
      requireMultipleSources: normalizedOptions.requireMultipleSources,
    }),
  };
}

async function fetchSourcePoints(sourceId, location, options) {
  const startedAt = Date.now();
  const adapter = getProviderAdapter(sourceId);
  if (!adapter) {
    return {
      sourceId,
      status: 'skipped',
      reason: 'adapter_not_available',
      pointCount: 0,
      durationMs: Date.now() - startedAt,
      points: [],
    };
  }

  try {
    const [binding] = await adapter.resolveBinding(location, {
      fetchPoint: sourceId === 'noaa_nws',
      userAgent: options.userAgent,
    });
    const rawForecast = await adapter.fetchForecast(binding, {
      hourly: true,
      userAgent: options.userAgent,
    });
    const normalized = await adapter.normalize(rawForecast, { binding });

    return {
      sourceId,
      status: 'ok',
      bindingKey: binding.key,
      pointCount: normalized.length,
      durationMs: Date.now() - startedAt,
      points: normalized,
    };
  } catch (error) {
    return {
      sourceId,
      status: 'error',
      errorCode: error.code ?? null,
      reason: error.message,
      pointCount: 0,
      durationMs: Date.now() - startedAt,
      points: [],
    };
  }
}
