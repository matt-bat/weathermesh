import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceUrl = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';
const rootDir = fileURLToPath(new URL('..', import.meta.url));
const outputPath = join(rootDir, 'data/boundaries/natural-earth-admin0-110m.json');

const response = await fetch(sourceUrl);
if (!response.ok) {
  throw new Error(`Failed to download Natural Earth countries: HTTP ${response.status}`);
}

const geojson = await response.json();
const countries = {};

for (const feature of geojson.features ?? []) {
  const countryCode = normalizeCountryCode(feature.properties);
  if (!countryCode) continue;

  const polygons = extractExteriorRings(feature.geometry);
  if (polygons.length === 0) continue;

  countries[countryCode] = {
    countryCode,
    name: feature.properties?.NAME_LONG ?? feature.properties?.NAME ?? countryCode,
    sourceId: feature.properties?.SOV_A3 ?? feature.properties?.ADM0_A3 ?? countryCode,
    bounds: calculateBounds(polygons),
    polygons,
  };
}

const payload = {
  source: 'Natural Earth 1:110m Admin 0 Countries',
  sourceUrl,
  generatedAt: new Date().toISOString(),
  license: 'Public domain',
  countryCount: Object.keys(countries).length,
  countries,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload)}\n`);

console.log(`Wrote ${payload.countryCount} country boundaries to ${outputPath}`);

function normalizeCountryCode(properties = {}) {
  const candidates = [
    properties.ISO_A2_EH,
    properties.ISO_A2,
    properties.WB_A2,
  ];

  const value = candidates.find((candidate) => typeof candidate === 'string' && /^[A-Z]{2}$/.test(candidate));
  return value ?? null;
}

function extractExteriorRings(geometry) {
  if (!geometry) return [];

  if (geometry.type === 'Polygon') {
    return [convertRing(geometry.coordinates[0])];
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates
      .map((polygon) => convertRing(polygon[0]))
      .filter((ring) => ring.length >= 4);
  }

  return [];
}

function convertRing(ring = []) {
  return ring
    .filter((coordinate) => Number.isFinite(coordinate[0]) && Number.isFinite(coordinate[1]))
    .map(([longitude, latitude]) => [round4(latitude), round4(longitude)]);
}

function calculateBounds(polygons) {
  let north = -Infinity;
  let south = Infinity;
  let west = Infinity;
  let east = -Infinity;

  for (const ring of polygons) {
    for (const [latitude, longitude] of ring) {
      north = Math.max(north, latitude);
      south = Math.min(south, latitude);
      west = Math.min(west, longitude);
      east = Math.max(east, longitude);
    }
  }

  return {
    north: round4(north),
    south: round4(south),
    west: round4(west),
    east: round4(east),
  };
}

function round4(value) {
  return Math.round(value * 10000) / 10000;
}

