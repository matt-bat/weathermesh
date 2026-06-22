# Development Stages

Project credit: Matthew Bateman

This project should be built in stages. Do not spend effort on the frontend until the data pipeline can prove it can pull, normalize, aggregate, and compare provider forecasts for the same locality and valid times.

## Stage 1: Pull, Normalize, Aggregate, Compare

Goal: prove the backend can fetch real forecast data, normalize provider payloads, compute locality-safe averages, and compare the calculated aggregate against each contributing provider forecast for the same day/time.

Deliverables:

- Provider fetch pipeline for the first MVP sources.
- Parallel provider fetching so a slow source does not block all others.
- In-memory HTTP caching for repeated requests during app/server use.
- Timeout/retry handling for provider requests.
- Central validation for coordinates, country codes, source IDs, and limits.
- Normalized common weather-point schema.
- Slot matching by `validTime`, `variable`, and `unit`.
- Aggregated average per slot.
- Backend-generated hourly, daily, weekly, and 14-day views.
- Comparison output showing:
  - aggregate value
  - each source value
  - source delta from aggregate
  - source count
  - confidence
  - rejected datapoints and reasons
- CLI command that can be run against a coordinate.

Exit criteria:

- `npm test` passes.
- A live CLI run works for at least one U.S. coordinate with NOAA/NWS and Open-Meteo.
- A live CLI run works with Open-Meteo fallback for non-U.S. coordinates.
- Comparisons are grouped only where units, variables, and valid times match.

## Stage 2: Source Expansion and Backtesting

Goal: add source validation depth before building the full user experience.

Deliverables:

- MSC/ECCC GeoMet adapter spike for Canadian locations.
- Meteostat historical/station metadata workflow.
- At least one station-network API spike if terms and access are practical.
- Backtesting job that compares past forecasts to observations.
- Source reliability scores by variable, region, and forecast horizon.

Exit criteria:

- Source weights are no longer only hardcoded defaults.
- Station observations are excluded when too far, stale, bad quality, or mismatched by elevation/locality.

## Stage 3: Backend API

Goal: expose the aggregation pipeline through app-ready endpoints.

Deliverables:

- Location resolution endpoint.
- Forecast endpoints for current, hourly, daily, weekly, and 14-day views.
- Source-summary endpoint.
- Cache and rate-limit protection.
- Attribution data in API responses.

Exit criteria:

- API can serve forecast payloads without direct frontend knowledge of providers.
- Provider failures degrade gracefully.

## Stage 4: Frontend MVP

Goal: build the clean simple interface after the backend proves useful.

Deliverables:

- Location search/current-location control.
- Current conditions.
- Hourly, daily, weekly, and 14-day tabs.
- Confidence/source-count indicator.
- Optional details drawer for source comparison.
- Three.js globe map with country, region, and locality forecast-average layers.
- Time selection for current and future forecast map views.
- Natural Earth country-boundary sampling, with simplified region polygons before full admin-1 boundary-dataset support.

Exit criteria:

- UI stays simple while backend source details remain inspectable.
- Mobile and desktop layouts are verified.

## Stage 5: Production Readiness

Goal: make the app deployable and maintainable.

Deliverables:

- Monitoring for stale provider data.
- Scheduled source refresh.
- Secrets handling.
- Attribution display.
- Deployment docs.
- CI checks.
