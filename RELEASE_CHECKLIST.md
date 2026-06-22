# Release Checklist

Project credit: Matthew Bateman.

Use this before pushing a release branch or tagging a version.

## Local

```sh
npm ci
npm run ci
npm run verify:globe
```

Then run the app:

```sh
NODE_ENV=production npm start
```

Check:

- `http://localhost:3000`
- `http://localhost:3000/globe.html`
- `http://localhost:3000/api/health`
- `http://localhost:3000/api/version`

## Data

Refresh Natural Earth boundaries if needed:

```sh
npm run import:boundaries
```

Commit `data/boundaries/natural-earth-admin0-110m.json`.

## Git

```sh
git status
git add .
git commit -m "Prepare aggregate weather app release"
git tag v0.1.0
```

Set the remote when the GitHub repo exists:

```sh
git remote add origin <repo-url>
git push -u origin main
git push origin v0.1.0
```

## Before Calling It Production

This is ready for a public repo release, but a public user-facing deployment should still add:

- persistent cache or database
- provider attribution display in the UI
- rate limiting
- admin-1 boundary import for states/provinces
- monitoring/log aggregation

