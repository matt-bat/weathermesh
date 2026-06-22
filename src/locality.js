const EARTH_RADIUS_METERS = 6371008.8;

export const DEFAULT_LOCALITY_RULES = Object.freeze({
  urbanMaxDistanceMeters: 5000,
  ruralMaxDistanceMeters: 15000,
  maxElevationDeltaMeters: 100,
  requireSameNeighbourhoodWhenPresent: true,
  requireSameDistrictWhenPresent: true,
  maxCoordinateGridDistanceMeters: 3000,
});

export function haversineMeters(a, b) {
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLon = toRadians(b.longitude - a.longitude);

  const sinLat = Math.sin(deltaLat / 2);
  const sinLon = Math.sin(deltaLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

export function evaluateLocalityMatch(location, point, options = {}) {
  const rules = { ...DEFAULT_LOCALITY_RULES, ...options };
  const reasons = [];

  if (!hasCoordinate(location) || !hasCoordinate(point)) {
    return {
      eligible: false,
      score: 0,
      reasons: ['missing_coordinates'],
      distanceMeters: null,
      elevationDeltaMeters: null,
    };
  }

  const distanceMeters = haversineMeters(location, point);
  const maxDistanceMeters = getMaxDistance(location, point, rules);

  if (distanceMeters > maxDistanceMeters) {
    reasons.push('too_far');
  }

  const elevationDeltaMeters = getElevationDelta(location, point);
  if (
    elevationDeltaMeters !== null &&
    elevationDeltaMeters > rules.maxElevationDeltaMeters
  ) {
    reasons.push('elevation_mismatch');
  }

  if (
    rules.requireSameNeighbourhoodWhenPresent &&
    location.neighbourhood &&
    point.neighbourhood &&
    normalizeLabel(location.neighbourhood) !== normalizeLabel(point.neighbourhood)
  ) {
    reasons.push('neighbourhood_mismatch');
  }

  if (
    rules.requireSameDistrictWhenPresent &&
    location.district &&
    point.district &&
    normalizeLabel(location.district) !== normalizeLabel(point.district)
  ) {
    reasons.push('district_mismatch');
  }

  const distanceScore = clamp(1 - distanceMeters / maxDistanceMeters, 0, 1);
  const elevationScore =
    elevationDeltaMeters === null
      ? 0.8
      : clamp(1 - elevationDeltaMeters / rules.maxElevationDeltaMeters, 0, 1);
  const labelScore = reasons.some((reason) => reason.endsWith('_mismatch')) ? 0 : 1;
  const score = reasons.length === 0 ? round4(distanceScore * 0.6 + elevationScore * 0.25 + labelScore * 0.15) : 0;

  return {
    eligible: reasons.length === 0,
    score,
    reasons,
    distanceMeters,
    elevationDeltaMeters,
  };
}

export function assertEligibleLocality(location, point, options = {}) {
  const result = evaluateLocalityMatch(location, point, options);
  if (!result.eligible) {
    throw new Error(`Locality mismatch: ${result.reasons.join(', ')}`);
  }
  return result;
}

function getMaxDistance(location, point, rules) {
  if (point.type === 'grid' || point.type === 'coverage' || point.type === 'coordinate') {
    return rules.maxCoordinateGridDistanceMeters;
  }

  return location.localityType === 'rural'
    ? rules.ruralMaxDistanceMeters
    : rules.urbanMaxDistanceMeters;
}

function getElevationDelta(location, point) {
  if (
    !Number.isFinite(location.elevationMeters) ||
    !Number.isFinite(point.elevationMeters)
  ) {
    return null;
  }
  return Math.abs(location.elevationMeters - point.elevationMeters);
}

function hasCoordinate(value) {
  return Number.isFinite(value?.latitude) && Number.isFinite(value?.longitude);
}

function normalizeLabel(value) {
  return String(value).trim().toLowerCase();
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function round4(value) {
  return Math.round(value * 10000) / 10000;
}

