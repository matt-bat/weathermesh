export const SOURCE_TYPES = Object.freeze({
  OFFICIAL_FORECAST: 'official_forecast',
  MODEL_FORECAST: 'model_forecast',
  STATION_OBSERVATION: 'station_observation',
  HISTORICAL_OBSERVATION: 'historical_observation',
  COMMERCIAL_FORECAST: 'commercial_forecast',
});

export const SOURCE_STATUS = Object.freeze({
  MVP: 'mvp',
  SUPPORT: 'support',
  CANDIDATE: 'candidate',
  LATER: 'later',
});

export const WEATHER_SOURCES = Object.freeze([
  {
    id: 'noaa_nws',
    name: 'NOAA/National Weather Service API',
    status: SOURCE_STATUS.MVP,
    type: SOURCE_TYPES.OFFICIAL_FORECAST,
    geographies: ['US'],
    baseUrl: 'https://api.weather.gov',
    requiresAuth: false,
    requiresUserAgent: true,
    defaultReliability: 0.95,
    localityPrecision: 'point-to-office-grid, approximately 2.5 km grid cells',
    horizons: {
      hourlyHours: 168,
      dailyDays: 7,
      fourteenDay: false,
    },
    bindingStrategy: 'points_endpoint',
    references: ['https://www.weather.gov/documentation/services-web-api'],
  },
  {
    id: 'msc_eccc_geomet',
    name: 'MSC/ECCC GeoMet',
    status: SOURCE_STATUS.MVP,
    type: SOURCE_TYPES.OFFICIAL_FORECAST,
    geographies: ['CA'],
    baseUrl: 'https://api.weather.gc.ca',
    requiresAuth: false,
    requiresUserAgent: false,
    defaultReliability: 0.95,
    localityPrecision: 'OGC geospatial datasets, coverages, and layers',
    horizons: {
      hourlyHours: null,
      dailyDays: null,
      fourteenDay: null,
    },
    bindingStrategy: 'ogc_dataset_discovery',
    references: ['https://eccc-msc.github.io/open-data/msc-geomet/readme_en/'],
  },
  {
    id: 'open_meteo',
    name: 'Open-Meteo',
    status: SOURCE_STATUS.MVP,
    type: SOURCE_TYPES.MODEL_FORECAST,
    geographies: ['GLOBAL'],
    baseUrl: 'https://api.open-meteo.com',
    requiresAuth: false,
    requiresUserAgent: false,
    defaultReliability: 0.75,
    localityPrecision: 'coordinate-based model output',
    horizons: {
      hourlyHours: null,
      dailyDays: 16,
      fourteenDay: true,
    },
    bindingStrategy: 'coordinate',
    references: ['https://open-meteo.com/en/docs'],
  },
  {
    id: 'meteostat',
    name: 'Meteostat',
    status: SOURCE_STATUS.SUPPORT,
    type: SOURCE_TYPES.HISTORICAL_OBSERVATION,
    geographies: ['GLOBAL'],
    baseUrl: 'https://dev.meteostat.net/api',
    requiresAuth: true,
    requiresUserAgent: false,
    defaultReliability: 0.7,
    localityPrecision: 'station and coordinate queries',
    horizons: {
      hourlyHours: 0,
      dailyDays: 0,
      fourteenDay: false,
    },
    bindingStrategy: 'nearby_station',
    references: ['https://dev.meteostat.net/api/'],
  },
  {
    id: 'netatmo',
    name: 'Netatmo Weather API',
    status: SOURCE_STATUS.CANDIDATE,
    type: SOURCE_TYPES.STATION_OBSERVATION,
    geographies: ['VARIABLE'],
    baseUrl: 'https://api.netatmo.com',
    requiresAuth: true,
    requiresUserAgent: false,
    defaultReliability: 0.55,
    localityPrecision: 'personal weather station coordinates',
    horizons: {
      hourlyHours: 0,
      dailyDays: 0,
      fourteenDay: false,
    },
    bindingStrategy: 'nearby_station_with_qc',
    references: ['https://dev.netatmo.com/apidocumentation/weather'],
  },
  {
    id: 'weatherlink',
    name: 'WeatherLink v2',
    status: SOURCE_STATUS.CANDIDATE,
    type: SOURCE_TYPES.STATION_OBSERVATION,
    geographies: ['VARIABLE'],
    baseUrl: 'https://api.weatherlink.com/v2',
    requiresAuth: true,
    requiresUserAgent: false,
    defaultReliability: 0.6,
    localityPrecision: 'Davis Instruments station coordinates',
    horizons: {
      hourlyHours: 0,
      dailyDays: 0,
      fourteenDay: false,
    },
    bindingStrategy: 'nearby_station_with_qc',
    references: ['https://weatherlink.github.io/v2-api/'],
  },
  {
    id: 'ambient_weather',
    name: 'Ambient Weather API',
    status: SOURCE_STATUS.CANDIDATE,
    type: SOURCE_TYPES.STATION_OBSERVATION,
    geographies: ['VARIABLE'],
    baseUrl: 'https://api.ambientweather.net',
    requiresAuth: true,
    requiresUserAgent: false,
    defaultReliability: 0.55,
    localityPrecision: 'Ambient Weather station coordinates',
    horizons: {
      hourlyHours: 0,
      dailyDays: 0,
      fourteenDay: false,
    },
    bindingStrategy: 'nearby_station_with_qc',
    references: ['https://ambientweather.docs.apiary.io/'],
  },
]);

export function getSourceById(sourceId) {
  return WEATHER_SOURCES.find((source) => source.id === sourceId) ?? null;
}

export function getMvpSourcesForCountry(countryCode) {
  return WEATHER_SOURCES.filter((source) => {
    if (source.status !== SOURCE_STATUS.MVP) return false;
    return source.geographies.includes(countryCode) || source.geographies.includes('GLOBAL');
  });
}

