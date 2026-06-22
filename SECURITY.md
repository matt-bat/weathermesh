# Security

Project credit: Matthew Bateman.

This project does not currently handle accounts, payments, private user data, or secrets in requests.

## Reporting Issues

If this is published publicly, report security issues privately to the repository owner instead of opening a public issue.

## Current Posture

- No credentials are required for the default NOAA/NWS or Open-Meteo flows.
- `.env` files are ignored by git.
- API inputs are validated for coordinates, country codes, source IDs, limits, map levels, and times.
- Provider requests use timeouts and retries.
- Unexpected server errors are hidden when `NODE_ENV=production`.

## Things To Add Later

- rate limiting
- persistent cache limits
- structured production logs
- dependency scanning in CI
- security headers if this sits behind a custom domain

