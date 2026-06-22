# WeatherMesh Project Plan

Project credit: Matthew Bateman

## Product Goal

Build a clean, simple weather app that shows hourly, daily, weekly, and 14-day forecasts for a user's precise locality. The forecast shown to users should be computed on the backend by aggregating comparable forecasts and observations from multiple reliable sources, while avoiding the common failure mode of mixing nearby but meaningfully different microclimates.

The core product promise is:

- The user enters or shares a precise location.
- The app resolves that location to the most granular available locality, such as coordinates, neighbourhood, quadrant, district, elevation band, or official forecast grid cell.
- The backend pulls all eligible forecast and observation datapoints for that same locality.
- The app normalizes, quality-scores, and averages the eligible values.
- The interface presents one clear forecast, plus optional confidence/source details hidden behind simple controls.

## Source Research First

The first implementation phase is not UI work. It is source validation and adapter setup.

The app should only use sources that satisfy most of these criteria:

- Provides legal API or open-data access.
- Supports coordinates, grids, stations, or polygons, not city-only lookup.
- Provides hourly and daily forecast horizons, ideally at least 7-14 days.
- Publishes observations from measured devices, official weather stations, radar, satellites, or documented models.
- Exposes metadata needed to prevent locality mixing: station coordinates, grid geometry, forecast office/grid cell, elevation, update time, and source provenance.
- Has clear terms, rate limits, and uptime expectations.
- Can be queried server-side without scraping fragile pages.

Initial source candidates:

| Source | Role | Granularity | Notes |
| --- | --- | --- | --- |
| NOAA/National Weather Service API | Primary U.S. forecast, alerts, observations | Point lookup maps to about 2.5 km forecast grid; station observations available | Free/open. U.S. only. Strong first source for U.S. locations. |
| Environment and Climate Change Canada / MSC GeoMet | Primary Canada forecast, observations, grids | OGC geospatial services, real-time and archived weather datasets | Free/open. Strong first source for Canada. |
| Open-Meteo | Global model forecast source | Coordinate-based; supports multiple forecast variables and models | Useful as global baseline and cross-model input. Not a device-owning source, but excellent for model diversity. |
| Meteostat | Historical/station data validation | Station or coordinate queries | Useful for historical backtesting and station metadata. API has quota constraints. |
| WeatherLink v2 | Private weather station observations | Connected Davis Instruments stations | Good candidate where public or shared station permissions are available. Not guaranteed universal access. |
| Netatmo Weather API / Weathermap | Personal weather station observations | User-shared home weather stations | Strong micro-local observation candidate, subject to API terms and availability. |
| Ambient Weather API | Personal weather station observations | Connected Ambient stations | Candidate for user-authorized or public-network observations, subject to API access. |
| Tomorrow.io / commercial APIs | Forecast/model enrichment | Coordinate-based hyperlocal forecasts | Candidate paid source if budget allows; validate terms and provenance before depending on it. |

Sources should be grouped by geography. For example, U.S. locations should prefer NOAA/NWS plus station networks and model APIs; Canadian locations should prefer MSC/ECCC plus station networks and model APIs. Global support can start with Open-Meteo plus commercial or station-network providers.

## Locality Model

The app must treat location as a geospatial problem, not a city-name problem.

Store each user-requested location as:

- Latitude and longitude.
- Reverse-geocoded locality labels: country, region, city, district, neighbourhood, postal area, and optional quadrant.
- Elevation when available.
- Source-specific locality bindings:
  - NWS office/gridX/gridY and forecast URLs.
  - MSC/GeoMet grid or coverage identifiers.
  - Nearby station IDs with distance, elevation delta, and source.
  - Model grid metadata when a source exposes it.

Aggregation must happen at the smallest compatible unit available:

- If a source provides a forecast for the exact coordinate/grid cell, use that.
- If a source only provides station observations, include stations inside a strict radius and elevation threshold.
- If neighbourhood or quadrant boundaries are available, prefer stations and grids inside the same polygon.
- Never average across broad city-level areas when finer geospatial data exists.
- Never mix two different source grid cells unless they both cover the requested coordinate and represent the same target locality.

Initial inclusion thresholds:

- Urban observation stations: within 3-5 km, same neighbourhood/quadrant where known.
- Suburban/rural stations: within 10-15 km if no closer station exists.
- Elevation: prefer within 100 m; flag or exclude larger differences unless terrain is flat.
- Coastal/mountain boundaries: require stricter rules because nearby datapoints may represent different weather.

These thresholds should be configurable per region after validation.

## Aggregation Strategy

Use a transparent weighted ensemble rather than a naive average.

For every source value, store:

- Source name and adapter version.
- Forecast issue time and valid time.
- Location geometry or station coordinate.
- Variable name and units.
- Raw value.
- Normalized value.
- Distance from requested point.
- Elevation difference, if known.
- Freshness.
- Historical reliability score, once available.
- Quality-control flags.

Initial weighted average formula:

`weight = source_reliability * locality_match * freshness * horizon_confidence * variable_confidence`

Where:

- `source_reliability` starts from a configured score and later uses backtesting.
- `locality_match` penalizes distance, elevation mismatch, and polygon mismatch.
- `freshness` penalizes stale issue times.
- `horizon_confidence` decreases as the forecast horizon increases.
- `variable_confidence` allows different confidence per variable, such as temperature, precipitation, wind, humidity, and cloud cover.

For each forecast interval, compute:

- Weighted mean.
- Median.
- Min/max source spread.
- Confidence score.
- Number of contributing sources.
- Source disagreement flags, such as "high spread" or "precipitation uncertainty".

The user-facing default is the weighted mean. The backend should retain the spread and confidence so the UI can show uncertainty without overwhelming the main interface.

## Forecast Horizons

The app should support:

- Current conditions.
- Hourly forecast for at least 48 hours, ideally 7 days where source data allows.
- Daily forecast for 7 days.
- Weekly summary.
- 14-day outlook.

Important constraint: not every source supports 14-day hourly forecasts. For longer horizons, the app should aggregate only comparable long-range daily values and clearly downgrade confidence.

## Backend Architecture

Recommended stack:

- TypeScript backend with Node.js.
- PostgreSQL with PostGIS for geospatial queries.
- Redis for short-lived API cache and job coordination.
- Queue worker for scheduled source pulls.
- Adapter pattern for weather providers.
- REST or tRPC API to the frontend.

Core services:

- `LocationResolver`: geocodes and reverse-geocodes precise user locations.
- `LocalityBinder`: maps a location to source-specific grids, stations, and polygons.
- `SourceRegistry`: stores enabled sources, API credentials, rate limits, and reliability scores.
- `ProviderAdapters`: one adapter per weather source.
- `Normalizer`: converts units, variable names, and time intervals to the app schema.
- `QualityControl`: rejects stale, impossible, low-quality, or locality-mismatched datapoints.
- `Aggregator`: computes weighted ensemble forecasts.
- `Backtester`: compares historical source forecasts against observed results to tune weights.
- `ForecastAPI`: serves the clean forecast payload to the frontend.

## Data Model

Initial tables:

- `locations`
  - id, lat, lon, elevation, country, region, city, district, neighbourhood, timezone
- `locality_bindings`
  - id, location_id, source, binding_type, binding_key, geometry, metadata
- `weather_sources`
  - id, name, source_type, enabled, reliability_score, terms_url, rate_limit_metadata
- `stations`
  - id, source, station_key, lat, lon, elevation, name, metadata, active
- `source_observations`
  - id, source, station_id, valid_time, variable, value, unit, qc_flags, raw_payload_hash
- `source_forecasts`
  - id, source, location_id, binding_id, issued_at, valid_time, horizon_hours, variable, value, unit, raw_payload_hash
- `aggregated_forecasts`
  - id, location_id, generated_at, valid_time, horizon_hours, variable, value, confidence, source_count, spread, metadata
- `source_performance`
  - id, source, region_key, variable, horizon_hours, sample_count, bias, mae, rmse, updated_at

## API Shape

Frontend-facing endpoints:

- `GET /api/location/search?q=...`
- `POST /api/location/resolve`
- `GET /api/forecast?lat=...&lon=...`
- `GET /api/forecast/hourly?lat=...&lon=...`
- `GET /api/forecast/daily?lat=...&lon=...`
- `GET /api/forecast/weekly?lat=...&lon=...`
- `GET /api/forecast/14-day?lat=...&lon=...`
- `GET /api/forecast/source-summary?lat=...&lon=...`

Provider adapter interface:

```ts
interface WeatherProviderAdapter {
  id: string;
  resolveBinding(location: Location): Promise<SourceBinding[]>;
  fetchForecast(binding: SourceBinding, range: ForecastRange): Promise<RawForecast[]>;
  fetchObservations(binding: SourceBinding, range: ObservationRange): Promise<RawObservation[]>;
  normalize(input: RawForecast | RawObservation): Promise<NormalizedWeatherPoint[]>;
}
```

## Frontend Plan

The interface should be quiet and direct:

- Search bar or current-location button.
- Current conditions at the top.
- Tabs or segmented control:
  - Hourly
  - Daily
  - Weekly
  - 14-day
- Simple forecast rows/cards with icon, temperature, precipitation chance, wind, and summary.
- Small confidence indicator, not a noisy technical panel.
- Optional details drawer:
  - contributing source count
  - last updated time
  - forecast spread
  - locality precision, such as "Kensington, Calgary" rather than just "Calgary"

The UI should not expose the complexity of source fetching, normalization, or averaging. It should feel like a normal weather app with more trustworthy locality handling.

## Implementation Phases

### Phase 1: Source Validation Prototype

- Confirm API access, terms, rate limits, and coverage for candidate sources.
- Build source scorecard with fields for cost, geography, forecast horizons, station metadata, geospatial precision, legal constraints, and reliability.
- Implement proof-of-concept adapters for:
  - NOAA/NWS
  - MSC/ECCC GeoMet
  - Open-Meteo
- Test with sample locations:
  - Dense U.S. urban neighbourhood
  - U.S. rural location
  - Canadian urban neighbourhood
  - Canadian rural location
  - Mountain or coastal edge case
- Decide which station-network APIs are feasible for MVP.

Deliverable: `SOURCE_SCORECARD.md`, working adapter spikes, and a recommendation for MVP sources.

### Phase 2: Locality and Storage Foundation

- Set up backend project.
- Add PostgreSQL/PostGIS schema.
- Implement location resolution and source binding.
- Store station metadata and forecast grid metadata.
- Add cache/rate-limit handling.

Deliverable: backend can resolve a coordinate into source-specific locality bindings.

### Phase 3: Forecast Normalization

- Normalize units and time intervals.
- Normalize variables:
  - temperature
  - apparent temperature
  - precipitation probability
  - precipitation amount
  - wind speed/gust/direction
  - humidity
  - pressure
  - cloud cover
  - weather condition code
- Add quality-control checks.

Deliverable: source forecasts and observations stored in a common schema.

### Phase 4: Aggregation Engine

- Implement weighted ensemble calculations.
- Add source spread and confidence scoring.
- Prevent cross-locality mixing in code and tests.
- Add fallback rules when only one source is available.

Deliverable: API returns aggregated forecasts for hourly, daily, weekly, and 14-day views.

### Phase 5: Backtesting and Weight Tuning

- Compare source forecasts against observed conditions.
- Compute source bias and error by region, variable, and horizon.
- Adjust weights automatically or via config.
- Add reports for source accuracy.

Deliverable: source weighting becomes evidence-based instead of purely configured.

### Phase 6: Frontend MVP

- Build the simple app interface.
- Add location search/current location.
- Add forecast tabs.
- Add confidence and source details drawer.
- Ensure responsive layout for mobile and desktop.

Deliverable: usable weather app backed by the aggregation API.

### Phase 7: Production Hardening

- Add monitoring for source failures and stale data.
- Add graceful degradation when providers are down.
- Add API key management and secrets handling.
- Add provider-specific rate-limit protection.
- Add legal/attribution display where required by source terms.
- Add scheduled source metadata refresh.

Deliverable: deployable app with operational safeguards.

## MVP Scope

The MVP should target North America first because the best open government sources are available there.

MVP includes:

- U.S. support via NOAA/NWS and Open-Meteo.
- Canadian support via MSC/ECCC and Open-Meteo.
- One station-network source if access is practical after validation.
- Hourly, daily, weekly, and 14-day UI.
- Backend aggregation with locality protection.
- Confidence/source-count metadata.

MVP excludes:

- Global guaranteed coverage.
- Severe weather push notifications.
- User accounts.
- Long-term climate analytics.
- Claims that the app is more accurate until backtesting proves it.

## Key Risks

- Some high-quality data sources may have restrictive terms or paid access.
- Personal weather stations can be noisy, poorly sited, offline, or permission-limited.
- Forecast providers may derive from overlapping models, so source diversity is not always true independence.
- 14-day forecasts are inherently lower confidence.
- Neighbourhood/quadrant boundaries are inconsistent across countries and cities.
- Averaging precipitation probability can be misleading if sources define probability differently.

Mitigations:

- Keep raw source provenance.
- Use source-specific variable semantics.
- Validate station quality before inclusion.
- Backtest by variable and forecast horizon.
- Show confidence for long-range and high-disagreement forecasts.
- Prefer source APIs over crawling pages.

## Immediate Next Steps

1. Create `SOURCE_SCORECARD.md`.
2. Validate NOAA/NWS, MSC/ECCC, Open-Meteo, WeatherLink, Netatmo, Ambient Weather, Meteostat, and one commercial forecast provider.
3. Choose MVP geography and source list.
4. Scaffold backend with provider adapter interfaces.
5. Implement source-binding and no-cross-locality tests before building the UI.

## Reference Links

- NOAA/National Weather Service API: https://www.weather.gov/documentation/services-web-api
- Environment and Climate Change Canada MSC GeoMet: https://eccc-msc.github.io/open-data/msc-geomet/readme_en/
- Open-Meteo API: https://open-meteo.com/en/docs
- Meteostat API: https://dev.meteostat.net/api/
- WeatherLink v2 API: https://weatherlink.github.io/v2-api/
- Netatmo Weather API: https://dev.netatmo.com/apidocumentation/weather
- Tomorrow.io Forecast API: https://docs.tomorrow.io/reference/weather-forecast
