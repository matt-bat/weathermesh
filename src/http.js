const cache = new Map();
const DEFAULT_TTL_MS = 10 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_RETRIES = 1;
const DEFAULT_MAX_CACHE_ENTRIES = 250;

export async function fetchJson(url, options = {}) {
  const {
    ttlMs = DEFAULT_TTL_MS,
    cacheKey = url,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    maxCacheEntries = DEFAULT_MAX_CACHE_ENTRIES,
    ...fetchOptions
  } = options;
  pruneExpiredCache();
  const now = Date.now();
  const cached = cache.get(cacheKey);

  if (ttlMs > 0 && cached && cached.expiresAt > now) {
    cache.delete(cacheKey);
    cache.set(cacheKey, cached);
    return structuredClone(cached.value);
  }

  const value = await fetchJsonWithRetry(url, fetchOptions, {
    timeoutMs,
    retries,
  });

  if (ttlMs > 0) {
    cache.set(cacheKey, {
      value,
      expiresAt: now + ttlMs,
    });
    enforceCacheLimit(maxCacheEntries);
  }

  return structuredClone(value);
}

async function fetchJsonWithRetry(url, fetchOptions, options) {
  let lastError;
  const attempts = Math.max(0, options.retries) + 1;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fetchJsonOnce(url, fetchOptions, options.timeoutMs);
    } catch (error) {
      lastError = error;
      if (attempt >= attempts - 1 || !isRetryableError(error)) break;
      await sleep(150 * 2 ** attempt);
    }
  }

  throw lastError;
}

async function fetchJsonOnce(url, fetchOptions, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...fetchOptions.headers,
      },
    });

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status} for ${url}`);
      error.status = response.status;
      throw error;
    }

    return response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms for ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function clearHttpCache() {
  cache.clear();
}

export function getHttpCacheStats() {
  pruneExpiredCache();
  const now = Date.now();
  let activeEntries = 0;

  for (const entry of cache.values()) {
    if (entry.expiresAt > now) activeEntries += 1;
  }

  return {
    entries: cache.size,
    activeEntries,
  };
}

function enforceCacheLimit(maxCacheEntries) {
  if (!Number.isFinite(maxCacheEntries) || maxCacheEntries <= 0) return;

  while (cache.size > maxCacheEntries) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
}

function pruneExpiredCache() {
  const now = Date.now();

  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
}

function isRetryableError(error) {
  if (error.status && error.status >= 500) return true;
  return !error.status;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
