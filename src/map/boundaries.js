import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const boundaryPath = fileURLToPath(new URL('../../data/boundaries/natural-earth-admin0-110m.json', import.meta.url));
let cachedBoundaries;

export function getCountryBoundary(countryCode) {
  const boundaries = loadCountryBoundaries();
  return boundaries?.countries?.[countryCode] ?? null;
}

export function hasCountryBoundaryData() {
  return Boolean(loadCountryBoundaries());
}

export function loadCountryBoundaries() {
  if (cachedBoundaries !== undefined) return cachedBoundaries;

  if (!existsSync(boundaryPath)) {
    cachedBoundaries = null;
    return cachedBoundaries;
  }

  cachedBoundaries = JSON.parse(readFileSync(boundaryPath, 'utf8'));
  return cachedBoundaries;
}

export function resetBoundaryCacheForTests() {
  cachedBoundaries = undefined;
}

