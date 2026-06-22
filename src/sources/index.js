import { assertProviderAdapter } from './provider-contract.js';
import { mscEcccGeoMetAdapter } from './adapters/msc-eccc-geomet.js';
import { noaaNwsAdapter } from './adapters/noaa-nws.js';
import { openMeteoAdapter } from './adapters/open-meteo.js';

export const providerAdapters = Object.freeze([
  assertProviderAdapter(noaaNwsAdapter),
  assertProviderAdapter(mscEcccGeoMetAdapter),
  assertProviderAdapter(openMeteoAdapter),
]);

export function getProviderAdapter(sourceId) {
  return providerAdapters.find((adapter) => adapter.id === sourceId) ?? null;
}

