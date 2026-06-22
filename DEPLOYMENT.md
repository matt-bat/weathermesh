# Deployment

Project credit: Matthew Bateman.

This app is easy to deploy because it is just a Node server plus static files.

## Basic Production Run

```sh
npm ci
NODE_ENV=production PORT=3000 npm start
```

The server serves:

- `/` for the point forecast app
- `/globe.html` for the globe
- `/api/forecast`
- `/api/map-forecast`
- `/api/health`
- `/api/version`

## Before Deploying

Run:

```sh
npm test
npm run check
npm run verify:globe
```

Refresh bundled country boundaries if needed:

```sh
npm run import:boundaries
```

Commit the generated `data/boundaries/natural-earth-admin0-110m.json` file so the app does not need to download boundaries at runtime.

## Hosting Notes

Good fits:

- a small VPS
- Render
- Fly.io
- Railway
- a container host

The app needs outbound internet access for weather APIs and for the globe page to load Three.js from the CDN.

## Docker

Build:

```sh
docker build -t weathermesh .
```

Run:

```sh
docker run --rm -p 3000:3000 weathermesh
```

## Operational Notes

- The cache is in-memory, so it resets when the process restarts.
- Provider errors are isolated by source. One failing source should not crash the whole forecast response.
- `NODE_ENV=production` hides unexpected internal error details from API clients.
- Use a process manager or host health checks against `/api/health`.
