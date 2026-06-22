import { pointInAnyPolygon } from './polygon.js';
import { getCountryBoundary } from './boundaries.js';

export const MAP_LEVELS = Object.freeze(['country', 'region', 'locality']);

export const MAP_AREAS = Object.freeze([
  {
    id: 'country_ca',
    level: 'country',
    label: 'Canada',
    countryCode: 'CA',
    latitude: 56.1304,
    longitude: -106.3468,
    sampling: {
      method: 'weighted_grid',
      rows: 4,
      cols: 5,
      bounds: { north: 69, south: 44, west: -141, east: -52 },
      include: [
        { north: 60, south: 49, west: -125, east: -67 },
        { north: 69, south: 54, west: -141, east: -60 },
      ],
      polygons: [
        [[49, -124], [58, -132], [69, -140], [70, -96], [60, -60], [50, -64], [43, -79], [49, -124]],
      ],
    },
    samples: [
      { latitude: 49.2827, longitude: -123.1207 },
      { latitude: 51.0447, longitude: -114.0719 },
      { latitude: 43.6532, longitude: -79.3832 },
      { latitude: 45.5017, longitude: -73.5673 },
    ],
  },
  {
    id: 'country_us',
    level: 'country',
    label: 'United States',
    countryCode: 'US',
    latitude: 39.8283,
    longitude: -98.5795,
    sampling: {
      method: 'weighted_grid',
      rows: 4,
      cols: 6,
      bounds: { north: 49, south: 25, west: -124, east: -67 },
      include: [{ north: 49, south: 25, west: -124, east: -67 }],
      polygons: [
        [[32, -124], [49, -124], [49, -95], [46, -84], [42, -70], [31, -80], [25, -97], [32, -124]],
      ],
    },
    samples: [
      { latitude: 34.0522, longitude: -118.2437 },
      { latitude: 41.8781, longitude: -87.6298 },
      { latitude: 29.7604, longitude: -95.3698 },
      { latitude: 40.7128, longitude: -74.0060 },
    ],
  },
  {
    id: 'country_mx',
    level: 'country',
    label: 'Mexico',
    countryCode: 'MX',
    latitude: 23.6345,
    longitude: -102.5528,
    sampling: {
      method: 'weighted_grid',
      rows: 3,
      cols: 4,
      bounds: { north: 32, south: 15, west: -117, east: -87 },
      include: [{ north: 32, south: 15, west: -117, east: -87 }],
      polygons: [
        [[32, -117], [31, -108], [26, -97], [21, -87], [15, -93], [16, -105], [23, -112], [32, -117]],
      ],
    },
    samples: [
      { latitude: 19.4326, longitude: -99.1332 },
      { latitude: 20.6597, longitude: -103.3496 },
      { latitude: 25.6866, longitude: -100.3161 },
    ],
  },
  {
    id: 'country_gb',
    level: 'country',
    label: 'United Kingdom',
    countryCode: 'GB',
    latitude: 55.3781,
    longitude: -3.4360,
    sampling: {
      method: 'weighted_grid',
      rows: 3,
      cols: 3,
      bounds: { north: 59, south: 50, west: -8, east: 2 },
      include: [{ north: 59, south: 50, west: -8, east: 2 }],
      polygons: [
        [[50, -6], [52, -7], [56, -6], [59, -4], [57, 0], [52, 2], [50, -1], [50, -6]],
      ],
    },
    samples: [
      { latitude: 51.5072, longitude: -0.1276 },
      { latitude: 53.4808, longitude: -2.2426 },
      { latitude: 55.9533, longitude: -3.1883 },
    ],
  },
  {
    id: 'country_jp',
    level: 'country',
    label: 'Japan',
    countryCode: 'JP',
    latitude: 36.2048,
    longitude: 138.2529,
    sampling: {
      method: 'weighted_grid',
      rows: 4,
      cols: 3,
      bounds: { north: 45, south: 31, west: 129, east: 146 },
      include: [
        { north: 45, south: 41, west: 140, east: 146 },
        { north: 38, south: 31, west: 129, east: 141 },
      ],
      polygons: [
        [[31, 129], [34, 130], [38, 139], [36, 141], [32, 132], [31, 129]],
        [[41, 140], [45, 142], [44, 146], [41, 144], [41, 140]],
      ],
    },
    samples: [
      { latitude: 35.6762, longitude: 139.6503 },
      { latitude: 34.6937, longitude: 135.5023 },
      { latitude: 43.0618, longitude: 141.3545 },
    ],
  },
  {
    id: 'country_au',
    level: 'country',
    label: 'Australia',
    countryCode: 'AU',
    latitude: -25.2744,
    longitude: 133.7751,
    sampling: {
      method: 'weighted_grid',
      rows: 4,
      cols: 5,
      bounds: { north: -11, south: -44, west: 113, east: 154 },
      include: [{ north: -11, south: -44, west: 113, east: 154 }],
      polygons: [
        [[-35, 115], [-20, 113], [-11, 130], [-17, 146], [-28, 154], [-39, 146], [-44, 122], [-35, 115]],
      ],
    },
    samples: [
      { latitude: -33.8688, longitude: 151.2093 },
      { latitude: -37.8136, longitude: 144.9631 },
      { latitude: -27.4698, longitude: 153.0251 },
      { latitude: -31.9523, longitude: 115.8613 },
    ],
  },
  {
    id: 'region_ca_ab',
    level: 'region',
    label: 'Alberta',
    countryCode: 'CA',
    latitude: 53.9333,
    longitude: -116.5765,
    sampling: {
      method: 'weighted_grid',
      rows: 3,
      cols: 3,
      bounds: { north: 60, south: 49, west: -120, east: -110 },
      include: [{ north: 60, south: 49, west: -120, east: -110 }],
      polygons: [
        [[49, -120], [60, -120], [60, -110], [49, -110], [49, -120]],
      ],
    },
    samples: [
      { latitude: 51.0447, longitude: -114.0719 },
      { latitude: 53.5461, longitude: -113.4938 },
      { latitude: 49.6956, longitude: -112.8451 },
    ],
  },
  {
    id: 'region_ca_bc',
    level: 'region',
    label: 'British Columbia',
    countryCode: 'CA',
    latitude: 53.7267,
    longitude: -127.6476,
    sampling: {
      method: 'weighted_grid',
      rows: 3,
      cols: 3,
      bounds: { north: 60, south: 49, west: -139, east: -114 },
      include: [{ north: 60, south: 49, west: -139, east: -114 }],
      polygons: [
        [[49, -125], [54, -133], [60, -139], [60, -120], [49, -114], [49, -125]],
      ],
    },
    samples: [
      { latitude: 49.2827, longitude: -123.1207 },
      { latitude: 48.4284, longitude: -123.3656 },
      { latitude: 53.9171, longitude: -122.7497 },
    ],
  },
  {
    id: 'region_us_ca',
    level: 'region',
    label: 'California',
    countryCode: 'US',
    latitude: 36.7783,
    longitude: -119.4179,
    sampling: {
      method: 'weighted_grid',
      rows: 3,
      cols: 3,
      bounds: { north: 42, south: 32, west: -124, east: -114 },
      include: [{ north: 42, south: 32, west: -124, east: -114 }],
      polygons: [
        [[32, -117], [34, -121], [42, -124], [42, -120], [35, -114], [32, -117]],
      ],
    },
    samples: [
      { latitude: 34.0522, longitude: -118.2437 },
      { latitude: 37.7749, longitude: -122.4194 },
      { latitude: 32.7157, longitude: -117.1611 },
    ],
  },
  {
    id: 'region_us_ny',
    level: 'region',
    label: 'New York State',
    countryCode: 'US',
    latitude: 43.2994,
    longitude: -74.2179,
    sampling: {
      method: 'weighted_grid',
      rows: 3,
      cols: 3,
      bounds: { north: 45, south: 40, west: -80, east: -71 },
      include: [{ north: 45, south: 40, west: -80, east: -71 }],
      polygons: [
        [[40, -80], [45, -80], [45, -73], [41, -71], [40, -74], [40, -80]],
      ],
    },
    samples: [
      { latitude: 40.7128, longitude: -74.0060 },
      { latitude: 42.8864, longitude: -78.8784 },
      { latitude: 43.1566, longitude: -77.6088 },
    ],
  },
  {
    id: 'locality_calgary_kensington',
    level: 'locality',
    label: 'Kensington, Calgary',
    countryCode: 'CA',
    latitude: 51.0528,
    longitude: -114.0862,
    samples: [{ latitude: 51.0528, longitude: -114.0862 }],
  },
  {
    id: 'locality_calgary_beltline',
    level: 'locality',
    label: 'Beltline, Calgary',
    countryCode: 'CA',
    latitude: 51.0412,
    longitude: -114.0720,
    samples: [{ latitude: 51.0412, longitude: -114.0720 }],
  },
  {
    id: 'locality_nyc_midtown',
    level: 'locality',
    label: 'Midtown Manhattan',
    countryCode: 'US',
    latitude: 40.7549,
    longitude: -73.9840,
    samples: [{ latitude: 40.7549, longitude: -73.9840 }],
  },
  {
    id: 'locality_la_santa_monica',
    level: 'locality',
    label: 'Santa Monica',
    countryCode: 'US',
    latitude: 34.0195,
    longitude: -118.4912,
    samples: [{ latitude: 34.0195, longitude: -118.4912 }],
  },
]);

export function getMapAreasByLevel(level) {
  return MAP_AREAS.filter((area) => area.level === level);
}

export function getSamplesForArea(area) {
  const realBoundarySampling = getRealBoundarySampling(area);
  if (realBoundarySampling) {
    return buildWeightedGridSamples(realBoundarySampling);
  }

  if (!area.sampling) {
    return area.samples.map((sample) => ({
      ...sample,
      weight: sample.weight ?? 1,
      sampleKind: 'point',
    }));
  }

  return buildWeightedGridSamples(area.sampling);
}

export function getSamplingMetadataForArea(area) {
  const realBoundarySampling = getRealBoundarySampling(area);
  if (realBoundarySampling) {
    return {
      method: realBoundarySampling.method,
      polygonCount: realBoundarySampling.polygons.length,
      boundarySource: realBoundarySampling.boundarySource,
    };
  }

  return {
    method: area.sampling?.polygons?.length > 0 ? 'polygon_weighted_grid' : area.sampling?.method ?? 'point',
    polygonCount: area.sampling?.polygons?.length ?? 0,
    boundarySource: area.sampling?.polygons?.length > 0 ? 'simplified_config' : 'point',
  };
}

function getRealBoundarySampling(area) {
  if (area.level !== 'country') return null;

  const boundary = getCountryBoundary(area.countryCode);
  if (!boundary) return null;

  return {
    method: 'natural_earth_admin0_110m',
    boundarySource: 'Natural Earth 1:110m Admin 0 Countries',
    rows: Math.max(area.sampling?.rows ?? 0, 6),
    cols: Math.max(area.sampling?.cols ?? 0, 8),
    bounds: boundary.bounds,
    polygons: boundary.polygons,
  };
}

export function buildWeightedGridSamples(sampling) {
  const samples = [];
  const { bounds, rows, cols } = sampling;
  const latStep = (bounds.north - bounds.south) / rows;
  const lonStep = (bounds.east - bounds.west) / cols;

  for (let row = 0; row < rows; row += 1) {
    const latitude = bounds.south + latStep * (row + 0.5);

    for (let col = 0; col < cols; col += 1) {
      const longitude = bounds.west + lonStep * (col + 0.5);
      if (!insideAnyInclude(latitude, longitude, sampling.include)) continue;
      if (!pointInAnyPolygon(latitude, longitude, sampling.polygons)) continue;

      samples.push({
        latitude: round4(latitude),
        longitude: round4(longitude),
        weight: round4(Math.max(0.05, Math.cos(latitude * Math.PI / 180))),
        sampleKind: sampling.polygons?.length > 0 ? 'polygon_grid' : 'grid',
      });
    }
  }

  return samples;
}

function insideAnyInclude(latitude, longitude, includes = []) {
  if (includes.length === 0) return true;

  return includes.some((box) => (
    latitude <= box.north &&
    latitude >= box.south &&
    longitude >= box.west &&
    longitude <= box.east
  ));
}

function round4(value) {
  return Math.round(value * 10000) / 10000;
}
