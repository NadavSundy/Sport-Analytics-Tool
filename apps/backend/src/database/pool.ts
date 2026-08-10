import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Pool, type PoolConfig } from 'pg';

import { DatabaseAccessError, translateDatabaseError } from './errors';

let applicationPool: Pool | undefined;

export interface DatabasePoolOptions {
  connectionString: string;
  ssl?: PoolConfig['ssl'];
  max?: number;
}

export function createDatabasePool(options: DatabasePoolOptions): Pool {
  const pool = new Pool({
    connectionString: options.connectionString,
    ssl: options.ssl,
    max: options.max ?? 10,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });

  pool.on('error', () => {
    // Do not expose the raw driver error because it may contain
    // database or connection details.
    console.error('Unexpected PostgreSQL pool error.');
  });

  return pool;
}

function loadApplicationDatabaseUrl(): string {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString?.trim()) {
    throw new DatabaseAccessError('DATABASE_UNAVAILABLE', 'DATABASE_URL is not configured.');
  }

  return connectionString;
}

function loadApplicationTlsConfiguration(): PoolConfig['ssl'] {
  const certificatePath = resolve(__dirname, '../../certs/supabase-ca.crt');

  return {
    rejectUnauthorized: true,
    ca: readFileSync(certificatePath, 'utf8'),
  };
}

export function getDatabasePool(): Pool {
  if (!applicationPool) {
    applicationPool = createDatabasePool({
      connectionString: loadApplicationDatabaseUrl(),
      ssl: loadApplicationTlsConfiguration(),
    });
  }

  return applicationPool;
}

export async function closeDatabasePool(): Promise<void> {
  if (!applicationPool) {
    return;
  }

  const pool = applicationPool;
  applicationPool = undefined;

  try {
    await pool.end();
  } catch (error) {
    throw translateDatabaseError(error);
  }
}
