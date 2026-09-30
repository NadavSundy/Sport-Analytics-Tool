import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const contractsPackagePath = require.resolve('@sport-analytics/contracts/package.json');
const contractsRoot = path.dirname(contractsPackagePath);
const contracts = require('@sport-analytics/contracts');

if (contracts.FIXTURE_EVENT_EXPORT_PAGE_SIZE !== 100) {
  throw new Error(
    'The built contracts runtime does not expose FIXTURE_EVENT_EXPORT_PAGE_SIZE with value 100.',
  );
}

if (!Number.isInteger(contracts.FIXTURE_EVENT_EXPORT_MAX_EVENTS)) {
  throw new Error('The built contracts runtime does not expose FIXTURE_EVENT_EXPORT_MAX_EVENTS.');
}

for (const schema of [
  'fixtureEventExportQuerySchema',
  'fixtureStatisticEventExportQuerySchema',
  // The schema a translated natural-language question has to pass. It is the
  // validation boundary rather than a convenience, so its absence from the
  // built runtime must fail the build rather than silently admit anything.
  'analyticsQueryDefinitionSchema',
]) {
  if (typeof contracts[schema]?.safeParse !== 'function') {
    throw new Error(`The built contracts runtime does not expose ${schema}.`);
  }
}

if (contracts.QUERY_DEFINITION_VERSION !== '1.0') {
  throw new Error(
    'The built contracts runtime does not expose QUERY_DEFINITION_VERSION with value 1.0.',
  );
}

if (
  typeof contracts.ANALYTICS_QUERY_PROMPT_DESCRIPTION !== 'string' ||
  contracts.ANALYTICS_QUERY_PROMPT_DESCRIPTION.length === 0
) {
  throw new Error(
    'The built contracts runtime does not expose ANALYTICS_QUERY_PROMPT_DESCRIPTION.',
  );
}

const [indexDeclarations, publicReadDeclarations, analyticsQueryDeclarations] = await Promise.all([
  readFile(path.join(contractsRoot, 'dist', 'index.d.ts'), 'utf8'),
  readFile(path.join(contractsRoot, 'dist', 'public-read.d.ts'), 'utf8'),
  readFile(path.join(contractsRoot, 'dist', 'analytics-query.d.ts'), 'utf8'),
]);

for (const module of ['public-read', 'analytics-query']) {
  if (!new RegExp(`export \\* from ['"]\\./${module}['"]`).test(indexDeclarations)) {
    throw new Error(`The built contracts declaration entrypoint does not export ${module}.`);
  }
}

for (const member of [
  'FIXTURE_EVENT_EXPORT_PAGE_SIZE',
  'FIXTURE_EVENT_EXPORT_MAX_EVENTS',
  'fixtureEventExportQuerySchema',
  'fixtureStatisticEventExportQuerySchema',
]) {
  if (!new RegExp(`export declare const ${member}\\b`).test(publicReadDeclarations)) {
    throw new Error(`The built contracts declarations do not expose ${member}.`);
  }
}

for (const member of [
  'QUERY_DEFINITION_VERSION',
  'ANALYTICS_QUERY_KINDS',
  'analyticsQueryDefinitionSchema',
  'ANALYTICS_QUERY_PROMPT_DESCRIPTION',
]) {
  if (!new RegExp(`export declare const ${member}\\b`).test(analyticsQueryDeclarations)) {
    throw new Error(`The built contracts declarations do not expose ${member}.`);
  }
}

console.log('Contracts public API check passed.');
