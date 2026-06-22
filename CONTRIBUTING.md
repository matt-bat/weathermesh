# Contributing

Project credit: Matthew Bateman.

Keep changes practical and easy to verify.

## Local Checks

Before opening a PR or pushing a release branch, run:

```sh
npm test
npm run check
```

For globe/UI changes, also run:

```sh
npm start
npm run verify:globe
```

## Code Style

- Keep the app dependency-light unless a dependency clearly earns its place.
- Keep provider adapters isolated.
- Do not mix datapoints from different localities just because they share a city name.
- Prefer deterministic tests over live API tests.
- Keep docs conversational and honest about limitations.

