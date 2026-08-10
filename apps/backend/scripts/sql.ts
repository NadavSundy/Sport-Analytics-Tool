/**
 * Run an ad-hoc SQL file against the project database.
 *
 * Exists to support schema validation and measurement. It is not part of the
 * application and holds no business logic.
 *
 * Usage:
 *   npm run db:sql --workspace=@sport-analytics/backend -- <path-to-query.sql>
 *
 * The path is resolved relative to apps/backend.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from 'pg';

const queryPath = process.argv[2];
if (!queryPath) {
  console.error('Usage: db:sql -- <path-to-query.sql>');
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: readFileSync(new URL('../certs/supabase-ca.crt', import.meta.url), 'utf8'),
  },
});

async function main(): Promise<void> {
  const sql = readFileSync(resolve(process.cwd(), queryPath), 'utf8');
  await client.connect();
  const result = await client.query(sql);
  for (const part of Array.isArray(result) ? result : [result]) {
    if (part.rows?.length) console.table(part.rows);
    else console.log(`${part.command}: ${part.rowCount ?? 0}`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => {
    void client.end();
  });
