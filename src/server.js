import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { runForecastComparison } from './pipeline.js';
import { normalizeLocation, optionalNumber, parseLimit } from './validation.js';
import { getMapForecast } from './map/service.js';
import { ATTRIBUTIONS } from './attribution.js';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const publicDir = join(rootDir, 'public');
const port = Number(process.env.PORT ?? 3000);
const packageInfo = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
const isProduction = process.env.NODE_ENV === 'production';

const server = createServer(async (request, response) => {
  const startedAt = Date.now();
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname === '/api/health') {
      sendJson(response, 200, {
        ok: true,
        version: packageInfo.version,
        uptimeSeconds: Math.round(process.uptime()),
      });
      return;
    }

    if (url.pathname === '/api/version') {
      sendJson(response, 200, {
        name: packageInfo.name,
        version: packageInfo.version,
        credit: 'Matthew Bateman',
      });
      return;
    }

    if (url.pathname === '/api/attribution') {
      sendJson(response, 200, {
        projectCredit: 'Matthew Bateman',
        attributions: ATTRIBUTIONS,
      });
      return;
    }

    if (url.pathname === '/api/forecast') {
      await handleForecast(url, response);
      return;
    }

    if (url.pathname === '/api/map-forecast') {
      await handleMapForecast(url, response);
      return;
    }

    await serveStatic(url.pathname, response);
  } catch (error) {
    console.error(error.stack ?? error.message);
    sendJson(response, error.statusCode ?? 500, {
      error: error.code ?? 'internal_server_error',
      message: isProduction && !error.statusCode ? 'Unexpected server error.' : error.message,
    });
  } finally {
    console.log(`${request.method} ${request.url} ${response.statusCode} ${Date.now() - startedAt}ms`);
  }
});

server.listen(port, () => {
  console.log(`Aggregate Weather App listening on http://localhost:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log(`Received ${signal}; shutting down.`);
    server.close(() => {
      process.exit(0);
    });
  });
}

async function handleForecast(url, response) {
  const location = normalizeLocation({
    latitude: url.searchParams.get('lat'),
    longitude: url.searchParams.get('lon'),
    countryCode: url.searchParams.get('country') ?? 'US',
    city: url.searchParams.get('city') ?? undefined,
    district: url.searchParams.get('district') ?? undefined,
    neighbourhood: url.searchParams.get('neighbourhood') ?? undefined,
    elevationMeters: optionalNumber(url.searchParams.get('elevation')),
    timezone: url.searchParams.get('timezone') ?? undefined,
  });
  const result = await runForecastComparison(
    location,
    {
      limit: parseLimit(url.searchParams.get('limit'), 120),
      userAgent: process.env.WEATHER_APP_USER_AGENT,
    },
  );

  sendJson(response, 200, result);
}

async function handleMapForecast(url, response) {
  const result = await getMapForecast({
    level: url.searchParams.get('level') ?? 'country',
    time: url.searchParams.get('time') ?? new Date(),
  });

  sendJson(response, 200, result);
}

async function serveStatic(pathname, response) {
  const safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = normalize(join(publicDir, safePath));

  if (!filePath.startsWith(publicDir)) {
    sendText(response, 403, 'Forbidden');
    return;
  }

  try {
    const contents = await readFile(filePath);
    response.writeHead(200, {
      'Content-Type': contentType(filePath),
      'Cache-Control': cacheControl(filePath),
    });
    response.end(contents);
  } catch {
    sendText(response, 404, 'Not found');
  }
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(body));
}

function sendText(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(body);
}

function contentType(filePath) {
  const extension = extname(filePath);
  if (extension === '.html') return 'text/html; charset=utf-8';
  if (extension === '.css') return 'text/css; charset=utf-8';
  if (extension === '.js') return 'text/javascript; charset=utf-8';
  return 'application/octet-stream';
}

function cacheControl(filePath) {
  const extension = extname(filePath);
  if (extension === '.html') return 'no-store';
  return isProduction ? 'public, max-age=3600' : 'no-store';
}
