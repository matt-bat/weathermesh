import assert from 'node:assert/strict';
import test from 'node:test';
import { clearHttpCache, fetchJson, getHttpCacheStats } from '../src/http.js';

test('fetchJson caches successful JSON responses by URL', async () => {
  clearHttpCache();
  const originalFetch = globalThis.fetch;
  let calls = 0;

  globalThis.fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({ calls }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const first = await fetchJson('https://example.test/weather');
    const second = await fetchJson('https://example.test/weather');

    assert.deepEqual(first, { calls: 1 });
    assert.deepEqual(second, { calls: 1 });
    assert.equal(calls, 1);
    assert.equal(getHttpCacheStats().activeEntries, 1);
  } finally {
    globalThis.fetch = originalFetch;
    clearHttpCache();
  }
});

test('fetchJson can bypass cache with ttlMs zero', async () => {
  clearHttpCache();
  const originalFetch = globalThis.fetch;
  let calls = 0;

  globalThis.fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({ calls }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    await fetchJson('https://example.test/weather', { ttlMs: 0 });
    await fetchJson('https://example.test/weather', { ttlMs: 0 });

    assert.equal(calls, 2);
    assert.equal(getHttpCacheStats().entries, 0);
  } finally {
    globalThis.fetch = originalFetch;
    clearHttpCache();
  }
});

test('fetchJson retries retryable failures', async () => {
  clearHttpCache();
  const originalFetch = globalThis.fetch;
  let calls = 0;

  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) {
      return new Response(JSON.stringify({ error: true }), { status: 503 });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const result = await fetchJson('https://example.test/retry', {
      ttlMs: 0,
      retries: 1,
    });

    assert.deepEqual(result, { ok: true });
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    clearHttpCache();
  }
});

test('fetchJson enforces maximum cache entries', async () => {
  clearHttpCache();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url) => new Response(JSON.stringify({ url }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  try {
    await fetchJson('https://example.test/1', { maxCacheEntries: 2 });
    await fetchJson('https://example.test/2', { maxCacheEntries: 2 });
    await fetchJson('https://example.test/3', { maxCacheEntries: 2 });

    assert.equal(getHttpCacheStats().entries, 2);
  } finally {
    globalThis.fetch = originalFetch;
    clearHttpCache();
  }
});
