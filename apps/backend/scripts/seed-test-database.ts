import { Client } from 'pg';

import { assertSafeTestDatabase } from './test-database-safety';

async function seedTestDatabase(): Promise<void> {
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

    await client.query(
      `
        UPDATE database_health
        SET note = $1
        WHERE id = 1
      `,
      ['Test database seeded.'],
    );
  } finally {
    await client.end();
  }
}

seedTestDatabase().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Unknown database seed error.');
  process.exitCode = 1;
});
