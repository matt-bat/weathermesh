# Source Scorecard

Project credit: Matthew Bateman

Last reviewed: 2026-06-20

This scorecard tracks weather data sources against the product goal: precise local forecasts produced from comparable, locality-safe source datapoints.

Scoring:

- `5`: excellent fit
- `4`: strong fit with small caveats
- `3`: useful, but limited by geography, horizon, cost, or metadata
- `2`: possible later source; not MVP-ready
- `1`: poor fit for this app

## MVP Recommendation

Start with:

1. NOAA/NWS API for U.S. official forecasts, grids, alerts, and observation-station discovery.
2. MSC/ECCC GeoMet for Canadian official weather datasets and geospatial services.
3. Open-Meteo as the first global model-forecast source and model-diversity baseline.
4. Meteostat for station metadata and historical backtesting support.

Evaluate after adapter spikes:

1. Netatmo Weather API for dense personal-weather-station observations where public/shared access is available.
2. WeatherLink v2 for Davis Instruments station observations where public/shared or partner access is available.
3. Ambient Weather API for user-authorized or accessible station observations.
4. One commercial forecast API only after the open-data MVP proves the aggregation pipeline.

## Source Matrix

| Source | Status | Geography | Forecast Horizon | Observations | Locality Precision | Access | Score | Decision |
| --- | --- | --- | --- | --- | --- | --- | ---: | --- |
| NOAA/NWS API | MVP | U.S. | Hourly and period forecasts over the next 7 days | Station observations through linked stations/MADIS | About 2.5 km forecast grid; point lookup binds to office/grid | Free/open, User-Agent required | 5 | Build first U.S. adapter |
| MSC/ECCC GeoMet | MVP | Canada | Weather/climate/water datasets through OGC services | Official datasets through MSC/ECCC services | Geospatial APIs, coverages, WMS/WCS/OGC API | Free/anonymous | 5 | Build first Canada adapter |
| Open-Meteo | MVP | Global | Hourly/daily forecast APIs, including long-range options depending on endpoint/model | Forecast/model focused, not a station network | Coordinate-based model output | Free tier/no key for many endpoints, terms apply | 4 | Build global model adapter |
| Meteostat | Support | Global-ish station/history coverage | Historical and normals focus | Station observations/history | Station and coordinate queries | API limits/terms apply | 3 | Use for metadata/backtesting, not primary live forecast |
| Netatmo Weather API | Candidate | Varies by station density | Observation focused | Personal weather stations | Very granular, but station quality varies | OAuth/API terms apply | 3 | Spike after MVP core |
| WeatherLink v2 | Candidate | Varies by Davis station availability | Observation focused | Davis Instruments stations | Very granular, but access varies | API key/secret; permissions apply | 3 | Spike after MVP core |
| Ambient Weather API | Candidate | Varies by station availability | Observation focused | Ambient station network/devices | Very granular, but access varies | API/application keys | 3 | Spike after MVP core |
| Tomorrow.io | Later | Global/commercial | Forecast API | Commercial/proprietary blend | Coordinate-based | Paid/commercial terms | 3 | Consider after open-data baseline |

## Key Validation Questions

Before a source can be enabled in production:

- Can the app legally cache and transform the data?
- What attribution is required?
- Are rate limits documented and compatible with scheduled refreshes?
- Does the source expose coordinates, grid geometry, station IDs, elevation, and update times?
- Can the app distinguish observations from model forecasts?
- Are station quality-control flags available?
- Does the source support the requested horizon?
- Are variable definitions compatible with other sources?
- Can the source be queried by exact coordinate, grid cell, station, or polygon?

## Source Notes

### NOAA/NWS API

Use `https://api.weather.gov/points/{latitude},{longitude}` as the source-binding entrypoint. It returns forecast URLs, hourly forecast URLs, raw grid-data URLs, office/grid metadata, zones, and observation-station links for the point.

Useful MVP endpoints:

- `/points/{latitude},{longitude}`
- `/gridpoints/{office}/{gridX},{gridY}/forecast`
- `/gridpoints/{office}/{gridX},{gridY}/forecast/hourly`
- `/gridpoints/{office}/{gridX},{gridY}/forecast/stations`
- `/stations/{stationId}/observations/latest`
- `/alerts/active`

Implementation notes:

- Send a clear `User-Agent`.
- Cache point-to-grid bindings, but refresh periodically because NWS states mappings can change.
- Treat NWS as U.S.-only.
- Do not use city names for aggregation.

### MSC/ECCC GeoMet

Use MSC GeoMet as the Canadian official-data source. It exposes datasets through OGC-compatible services, including OGC API, WMS, WCS, and related geospatial access patterns.

Implementation notes:

- Start with source discovery and a minimal adapter spike for one Canadian urban and one rural coordinate.
- Prefer machine-readable geospatial APIs over rendered map services.
- Store coverage/layer identifiers with the locality binding.
- Confirm which forecast datasets support hourly, daily, and longer horizons before making UI promises for Canada.

### Open-Meteo

Use Open-Meteo as the first coordinate-based model source. It is not a device-owning source, but it is useful because it exposes global model output and can provide model diversity beyond government forecast APIs.

Implementation notes:

- Store model/source metadata when endpoint responses expose it.
- Use it for long-range forecast coverage where government APIs are shorter.
- Do not let Open-Meteo override official local sources by default; use it as one weighted contributor.

### Meteostat

Use Meteostat mainly for station metadata and historical/backtesting workflows. It should help tune source weights by comparing past forecasts to observed conditions.

Implementation notes:

- Do not make it the only live source.
- Watch API quota and licensing constraints.
- Store station coordinates/elevation and use them in locality matching.

### Station-Network APIs

Netatmo, WeatherLink, and Ambient Weather are potentially valuable because personal weather stations can be highly local. They are also risky:

- Station siting quality varies.
- Data can disappear when devices go offline.
- Public access may be limited.
- OAuth/API permissions may constrain what the app can query.
- Variables and calibration quality can differ from official stations.

Use these only after the quality-control layer exists.

## MVP Source Acceptance Checklist

- [ ] Terms reviewed and attribution requirements recorded.
- [ ] Rate limits recorded.
- [ ] Locality-binding method implemented.
- [ ] Raw payload snapshot stored for debugging.
- [ ] Normalization implemented for temperature, precipitation, wind, humidity, pressure, and condition codes where available.
- [ ] Staleness checks implemented.
- [ ] Locality-mismatch tests implemented.
- [ ] Adapter spike tested against at least five sample locations.
