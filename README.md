# WeatherMesh

Created by Matthew Bateman.

WeatherMesh is a small weather app that compares multiple forecasts for the same place, averages matching datapoints, and keeps the messy source work hidden behind a simple UI.

The app has two main views:

- A point forecast page for a specific latitude/longitude.
- A 3D globe that shows average temperatures by country, region, or locality as you zoom.

The project is intentionally lightweight right now: no frontend build step, no database, and no framework lock-in. It runs on Node, serves static files, and talks to weather APIs from the backend.

## What Works Today

- Live NOAA/NWS + Open-Meteo forecast pulls for U.S. point forecasts.
- Multiple Open-Meteo model contributors where available, including Best Match, GFS, ECMWF, and NBM for U.S. localities.
- Open-Meteo fallback for broader/global map sampling.
- Forecast normalization into a shared internal schema.
- Weighted aggregate forecasts grouped by time, variable, and unit.
- Source-vs-average comparison output.
- Locality guardrails for distance, elevation, neighbourhood, and district labels.
- Hourly, daily, weekly, and 14-day forecast views.
- A main dashboard with:
  - a one-third-height embedded globe that can be hidden
  - automatic current-location lookup when the browser allows it
  - light and dark modes
  - current-day, daily, weekly, and 14-day forecast sections
  - expandable hourly detail for the current day
- A standalone Three.js globe with:
  - Natural Earth country-boundary sampling
  - simplified region polygons
  - point locality samples
  - current/future time selection
  - drag and zoom interaction
- Bounded in-memory cache, provider timeouts, retries, and graceful source failure handling.
- Browser verification for desktop and mobile globe rendering.

## Run It

```sh
npm install
npm start
```

Open:

```text
http://localhost:3000
```

Globe:

```text
http://localhost:3000/globe.html
```

If port `3000` is already busy:

```sh
PORT=3001 npm start
```

## Useful Commands

```sh
npm test
npm run check
npm run verify:globe
npm run compare -- --lat 39.7456 --lon -97.0892 --country US
```

Refresh the bundled Natural Earth country boundaries:

```sh
npm run import:boundaries
```

## API

Health:

```sh
curl "http://localhost:3000/api/health"
```

Point forecast:

```sh
curl "http://localhost:3000/api/forecast?lat=39.7456&lon=-97.0892&country=US&limit=24"
```

Globe/map forecast:

```sh
curl "http://localhost:3000/api/map-forecast?level=country"
```

Version:

```sh
curl "http://localhost:3000/api/version"
```

Attribution:

```sh
curl "http://localhost:3000/api/attribution"
```

## Environment

Copy `.env.example` if you want local overrides:

```sh
cp .env.example .env
```

Current settings:

- `PORT`: server port, defaults to `3000`.
- `NODE_ENV`: set to `production` for production cache/error behavior.
- `WEATHER_APP_USER_AGENT`: contact string used for APIs that require a user agent.

## Data Sources

- NOAA/National Weather Service API for U.S. point forecasts.
- Open-Meteo for model forecast data and globe map samples.
- Natural Earth 1:110m Admin 0 Countries for bundled country boundaries.

Natural Earth data is public domain. Weather provider data remains subject to each provider's terms and attribution requirements.

## Release Status

This is ready to publish as an early public repo. It is not yet a final production weather product. The main known limitations are:

- Region boundaries are still simplified hand-authored polygons.
- Country map averages use sampled points inside Natural Earth boundaries, not full raster/polygon area integration.
- No persistent cache or database yet.
- Canadian official-source integration is planned but not fully implemented.

See [ATTRIBUTION.md](./ATTRIBUTION.md), [DEPLOYMENT.md](./DEPLOYMENT.md), [SECURITY.md](./SECURITY.md), [STAGES.md](./STAGES.md), and [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) for the release notes and next steps.
