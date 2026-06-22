import { getProviderAdapter } from './sources/index.js';

const MAX_LIMIT = 500;

export function normalizeLocation(input) {
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  const elevationMeters = optionalNumber(input.elevationMeters);
  const countryCode = normalizeCountryCode(input.countryCode ?? 'US');

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw validationError('invalid_latitude', 'latitude must be a number between -90 and 90.');
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw validationError('invalid_longitude', 'longitude must be a number between -180 and 180.');
  }

  return {
    latitude,
    longitude,
    countryCode,
    city: optionalString(input.city),
    district: optionalString(input.district),
    neighbourhood: optionalString(input.neighbourhood),
    elevationMeters,
    timezone: optionalString(input.timezone),
  };
}

export function normalizePipelineOptions(options = {}) {
  const limit = clampInteger(options.limit ?? 48, 1, MAX_LIMIT);
  const sourceIds = normalizeSourceIds(options.sourceIds);
  const variables = normalizeStringList(options.variables);

  return {
    ...options,
    limit,
    sourceIds,
    variables,
    requireMultipleSources: options.requireMultipleSources === true,
  };
}

export function parseLimit(value, fallback = 120) {
  if (value === null || value === undefined || value === '') return fallback;
  return clampInteger(value, 1, MAX_LIMIT);
}

export function optionalNumber(value) {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw validationError('invalid_number', 'numeric value is invalid.');
  }
  return parsed;
}

export function validationError(code, message) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = 400;
  return error;
}

function normalizeCountryCode(value) {
  const normalized = String(value).trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    throw validationError('invalid_country', 'country must be a two-letter country code.');
  }
  return normalized;
}

function normalizeSourceIds(sourceIds) {
  const normalized = normalizeStringList(sourceIds);
  if (!normalized) return undefined;

  for (const sourceId of normalized) {
    if (!getProviderAdapter(sourceId)) {
      throw validationError('invalid_source', `unknown source id: ${sourceId}`);
    }
  }

  return normalized;
}

function normalizeStringList(value) {
  if (!value) return undefined;
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function optionalString(value) {
  if (value === null || value === undefined) return undefined;
  const normalized = String(value).trim();
  return normalized === '' ? undefined : normalized;
}

function clampInteger(value, min, max) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw validationError('invalid_integer', `value must be an integer between ${min} and ${max}.`);
  }
  if (parsed < min || parsed > max) {
    throw validationError('integer_out_of_range', `value must be between ${min} and ${max}.`);
  }
  return parsed;
}

