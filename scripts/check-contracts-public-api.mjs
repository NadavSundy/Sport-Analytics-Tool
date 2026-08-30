import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const contractsPackagePath = require.resolve('@sport-analytics/contracts/package.json');
const contractsRoot = path.dirname(contractsPackagePath);
const contracts = require('@sport-analytics/contracts');

if (contracts.FIXTURE_EVENT_EXPORT_LIMIT !== 100) {
  throw new Error(
    'The built contracts runtime does not expose FIXTURE_EVENT_EXPORT_LIMIT with value 100.',
  );
}

if (typeof contracts.fixtureEventExportQuerySchema?.safeParse !== 'function') {
  throw new Error('The built contracts runtime does not expose fixtureEventExportQuerySchema.');
}

const [indexDeclarations, publicReadDeclarations] = await Promise.all([
  readFile(path.join(contractsRoot, 'dist', 'index.d.ts'), 'utf8'),
  readFile(path.join(contractsRoot, 'dist', 'public-read.d.ts'), 'utf8'),
]);

if (!/export \* from ['"]\.\/public-read['"]/.test(indexDeclarations)) {
  throw new Error('The built contracts declaration entrypoint does not export public-read.');
}

for (const member of ['FIXTURE_EVENT_EXPORT_LIMIT', 'fixtureEventExportQuerySchema']) {
  if (!new RegExp(`export declare const ${member}\\b`).test(publicReadDeclarations)) {
    throw new Error(`The built contracts declarations do not expose ${member}.`);
  }
}

console.log('Contracts public API check passed.');
