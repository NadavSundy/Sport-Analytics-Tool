import { Client } from 'pg';

import { assertSafeTestDatabase } from './test-database-safety';

async function resetTestDatabase(): Promise<void> {
  const databaseUrl = assertSafeTestDatabase(
    process.env.DATABASE_URL_TEST,
    process.env.DATABASE_URL,
    process.env.NODE_ENV,
  );

  const client = new Client({
    connectionString: databaseUrl.toString(),
  });

  try {
    await client.connect();

    await client.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO public;
    `);
  } finally {
    await client.end();
  }
}

resetTestDatabase().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Unknown database reset error.');
  process.exitCode = 1;
});
