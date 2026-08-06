/**
 * Repeatable database connection check.
 *
 * Satisfies acceptance criteria C1, C4, C5 and C6 of the database foundation
 * issue. Reads DATABASE_URL and nothing else, opens a TLS connection, reports
 * what it connected to, and exits non-zero on failure so that the pipeline fails.
 *
 * Run with: npm run db:check
 */

import { Client } from 'pg';
import { readFileSync } from 'node:fs';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env and populate it.');
  process.exit(1);
}

// Certificate verification is deliberately left enabled. If the handshake fails,
// download the provider's CA certificate and point NODE_EXTRA_CA_CERTS at it.
// Do not set rejectUnauthorized to false to make this pass.
const client = new Client({
  connectionString,
 ssl: {
    rejectUnauthorized: true,
    ca: readFileSync(new URL('../certs/supabase-ca.crt', import.meta.url), 'utf8'),
  },
  connectionTimeoutMillis: 10_000,
});

async function main(): Promise<void> {
  const startedAt = Date.now();
  await client.connect();

  const { rows } = await client.query<{
    database: string;
    user: string;
    server_version: string;
  }>(
    `select current_database() as database,
            current_user      as user,
            current_setting('server_version') as server_version`
  );

  const [info] = rows;
  const elapsed = Date.now() - startedAt;

  // Confirms the driver can issue an extended-query (prepared) statement over
  // whichever connection variant was selected in criterion C2. This fails on a
  // transaction-mode pooler, which is the point of checking it.
  await client.query({
    name: 'db_check_prepared',
    text: 'select $1::int as ok',
    values: [1],
  });

  console.log('Database connection check passed.');
  console.log(`  database        : ${info.database}`);
  console.log(`  user            : ${info.user}`);
  console.log(`  server version  : ${info.server_version}`);
  console.log(`  prepared stmts  : supported`);
  console.log(`  elapsed         : ${elapsed} ms`);
}

main()
  .catch((error: unknown) => {
    console.error('Database connection check failed.');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => {
    void client.end();
  });