#!/usr/bin/env node
import { runForecastComparison } from '../pipeline.js';
import { normalizeLocation, parseLimit } from '../validation.js';

const args = parseArgs(process.argv.slice(2));

if (args.help || !args.lat || !args.lon) {
  printHelp();
  process.exit(args.help ? 0 : 1);
}

const location = normalizeLocation({
  latitude: args.lat,
  longitude: args.lon,
  countryCode: args.country ?? args.countryCode ?? 'US',
  city: args.city,
  district: args.district,
  neighbourhood: args.neighbourhood,
  elevationMeters: args.elevation,
  timezone: args.timezone,
});

const sourceIds = args.sources ? args.sources.split(',').map((value) => value.trim()).filter(Boolean) : undefined;
const variables = args.variables ? args.variables.split(',').map((value) => value.trim()).filter(Boolean) : undefined;
const limit = parseLimit(args.limit, 48);

try {
  const result = await runForecastComparison(location, {
    sourceIds,
    variables,
    limit,
    requireMultipleSources: args.multisource === 'true',
    userAgent: process.env.WEATHER_APP_USER_AGENT,
  });

  printResult(result);
} catch (error) {
  console.error(error.stack ?? error.message);
  process.exit(1);
}

function printResult(result) {
  console.log(`Generated: ${result.generatedAt}`);
  console.log(`Location: ${result.location.latitude}, ${result.location.longitude} (${result.location.countryCode})`);
  console.log(`Normalized points: ${result.pointCount}`);
  console.log('');
  console.log('Sources:');
  for (const source of result.sourceResults) {
    const suffix = source.status === 'ok'
      ? `${source.pointCount} points, binding ${source.bindingKey}`
      : `${source.status}: ${source.reason}`;
    console.log(`- ${source.sourceId}: ${suffix}`);
  }

  console.log('');
  console.log('Comparisons:');
  if (result.preview.length === 0) {
    console.log('No comparable rows found for the selected filters.');
    return;
  }

  for (const row of result.preview) {
    console.log(`${row.validTime} ${row.variable}: aggregate=${row.aggregateValue} ${row.unit} confidence=${row.confidence} sources=${row.sourceCount} spread=${row.spread}`);
    for (const source of row.sources) {
      const delta = source.deltaFromAggregate >= 0 ? `+${source.deltaFromAggregate}` : String(source.deltaFromAggregate);
      console.log(`  - ${source.sourceId}: ${source.value} ${source.unit} (${delta})`);
    }
  }
}

function parseArgs(values) {
  const parsed = {};

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith('--')) continue;

    const key = value.slice(2);
    const next = values[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = 'true';
    } else {
      parsed[key] = next;
      index += 1;
    }
  }

  return parsed;
}

function printHelp() {
  console.log(`Usage:
  npm run compare -- --lat 39.7456 --lon -97.0892 --country US

Options:
  --lat <number>              Latitude
  --lon <number>              Longitude
  --country <code>            Country code, defaults to US
  --timezone <iana>           Optional timezone for model APIs
  --elevation <meters>        Optional elevation
  --city <name>               Optional locality label
  --district <name>           Optional locality label
  --neighbourhood <name>      Optional locality label
  --sources <ids>             Comma-separated source ids
  --variables <names>         Comma-separated variables
  --limit <number>            Max rows to print, defaults to 48
  --multisource true          Only print rows with multiple contributing sources
`);
}
