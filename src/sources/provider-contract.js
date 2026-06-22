/**
 * Provider adapters should implement this shape. This file intentionally uses
 * JSDoc instead of TypeScript while the project has no build pipeline.
 *
 * @typedef {Object} Location
 * @property {number} latitude
 * @property {number} longitude
 * @property {string=} countryCode
 * @property {number=} elevationMeters
 * @property {string=} neighbourhood
 * @property {string=} district
 * @property {string=} city
 * @property {string=} timezone
 *
 * @typedef {Object} SourceBinding
 * @property {string} sourceId
 * @property {'coordinate' | 'grid' | 'station' | 'coverage' | 'polygon'} type
 * @property {string} key
 * @property {number=} latitude
 * @property {number=} longitude
 * @property {number=} elevationMeters
 * @property {number=} radiusMeters
 * @property {Record<string, unknown>=} metadata
 *
 * @typedef {Object} NormalizedWeatherPoint
 * @property {string} sourceId
 * @property {string} variable
 * @property {number} value
 * @property {string} unit
 * @property {string} validTime ISO-8601 timestamp.
 * @property {string=} issuedAt ISO-8601 timestamp.
 * @property {number=} horizonHours
 * @property {SourceBinding=} binding
 * @property {number=} distanceMeters
 * @property {number=} elevationDeltaMeters
 * @property {number=} sourceReliability
 * @property {number=} quality
 * @property {string[]=} flags
 */

export const REQUIRED_ADAPTER_METHODS = Object.freeze([
  'resolveBinding',
  'fetchForecast',
  'fetchObservations',
  'normalize',
]);

export function assertProviderAdapter(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError('Provider adapter must be an object.');
  }

  if (!adapter.id || typeof adapter.id !== 'string') {
    throw new TypeError('Provider adapter must expose a string id.');
  }

  for (const method of REQUIRED_ADAPTER_METHODS) {
    if (typeof adapter[method] !== 'function') {
      throw new TypeError(`Provider adapter "${adapter.id}" is missing ${method}().`);
    }
  }

  return adapter;
}

