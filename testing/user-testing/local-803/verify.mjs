// Technical preflight only; not evidence of a participant session.
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import pg from 'pg';
const require = createRequire(import.meta.url);
const { seasonUploadPackageSchema } = require('../../../packages/contracts/dist/index.js');
const { resolvePackageReferences } = require('../../../packages/batch-processing/dist/index.js');
const client = new pg.Client({
  connectionString: 'postgresql://local803:local803@127.0.0.1:55483/sport_analytics_803',
});
await client.connect();
try {
  for (const file of ['01-valid.json', '03-corrected.json']) {
    const data = seasonUploadPackageSchema.parse(
      JSON.parse(await fs.readFile(new URL(file, import.meta.url), 'utf8')),
    );
    const result = await resolvePackageReferences(client, data);
    if (result.items.length !== 2 || result.items.some((item) => item.state !== 'resolved'))
      throw new Error(JSON.stringify(result));
    console.log(`${file}: schema valid; both events and all their references resolved.`);
  }
  const bad = seasonUploadPackageSchema.safeParse(
    JSON.parse(await fs.readFile(new URL('02-invalid.json', import.meta.url), 'utf8')),
  );
  if (
    bad.success ||
    bad.error.issues.length !== 1 ||
    bad.error.issues[0].path.join('.') !== 'contractVersion'
  )
    throw new Error('Unexpected invalid-package errors.');
  console.log('02-invalid.json: exactly one deliberate contractVersion error.');
  const rows = (
    await client.query(
      "SELECT f.fixture_id, count(d.delivery_id)::int AS deliveries FROM fixture f LEFT JOIN innings i USING(fixture_id) LEFT JOIN delivery d USING(innings_id) WHERE f.source_ref LIKE 'local803:fixture:%' GROUP BY f.fixture_id ORDER BY f.fixture_id",
    )
  ).rows;
  if (rows.length !== 2 || rows.some((row) => row.deliveries !== 0))
    throw new Error(
      'Fixtures already contain deliveries. Recreate the disposable database before a fresh session.',
    );
  console.log('Both fixture event slots are empty:', rows);
  for (const endpoint of [
    'http://localhost:3083/api/v1/health',
    'http://localhost:3083/api/v1/fixtures',
    'http://localhost:5183',
  ]) {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(`${endpoint}: ${response.status}`);
    console.log(`${endpoint}: HTTP ${response.status}`);
  }
} finally {
  await client.end();
}
