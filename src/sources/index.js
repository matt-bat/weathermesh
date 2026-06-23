import { assertProviderAdapter } from './provider-contract.js';
import { mscEcccGeoMetAdapter } from './adapters/msc-eccc-geomet.js';
import { noaaNwsAdapter } from './adapters/noaa-nws.js';
import { createOpenMeteoAdapter, openMeteoAdapter } from './adapters/open-meteo.js';

export const providerAdapters = Object.freeze([
  assertProviderAdapter(noaaNwsAdapter),
  assertProviderAdapter(mscEcccGeoMetAdapter),
  assertProviderAdapter(openMeteoAdapter),
  assertProviderAdapter(createOpenMeteoAdapter('open_meteo_gfs')),
  assertProviderAdapter(createOpenMeteoAdapter('open_meteo_ecmwf')),
  assertProviderAdapter(createOpenMeteoAdapter('open_meteo_nbm')),
]);

export function getProviderAdapter(sourceId) {
  return providerAdapters.find((adapter) => adapter.id === sourceId) ?? null;
}
