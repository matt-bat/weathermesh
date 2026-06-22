export const mscEcccGeoMetAdapter = {
  id: 'msc_eccc_geomet',

  async resolveBinding(location) {
    validateCoordinate(location);

    return [
      {
        sourceId: this.id,
        type: 'coverage',
        key: `${location.latitude.toFixed(5)},${location.longitude.toFixed(5)}`,
        latitude: location.latitude,
        longitude: location.longitude,
        elevationMeters: location.elevationMeters,
        metadata: {
          entrypoint: 'https://api.weather.gc.ca',
          discoveryRequired: true,
        },
      },
    ];
  },

  async fetchForecast() {
    throw new Error('MSC/ECCC GeoMet fetchForecast adapter spike is not implemented yet.');
  },

  async fetchObservations() {
    throw new Error('MSC/ECCC GeoMet fetchObservations adapter spike is not implemented yet.');
  },

  async normalize() {
    throw new Error('MSC/ECCC GeoMet normalize adapter spike is not implemented yet.');
  },
};

function validateCoordinate(location) {
  if (!Number.isFinite(location?.latitude) || !Number.isFinite(location?.longitude)) {
    throw new TypeError('Location must include numeric latitude and longitude.');
  }
}

