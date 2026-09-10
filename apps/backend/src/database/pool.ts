import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Pool, type PoolConfig } from 'pg';

import { DatabaseAccessError, translateDatabaseError } from './errors';

let applicationPool: Pool | undefined;

interface DatabasePoolOptions {
  connectionString: string;
  ssl?: PoolConfig['ssl'];
  max?: number;
}

function createDatabasePool(options: DatabasePoolOptions): Pool {
  const pool = new Pool({
    connectionString: options.connectionString,
    ssl: options.ssl,
    max: options.max ?? 10,
    min: 1,
    // A request that cannot obtain a connection must fail rather than wait
    // forever: an unbounded wait never rejects, so the interface never leaves
    // its loading state and the reader is given no error and no retry.
    // evidence/validation/issue-369-idle-backend-latency.md records this bound
    // as part of that fix; it was lost from the change that landed.
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

function loadApplicationTlsConfiguration(connectionString: string): PoolConfig['ssl'] {
  const hostname = new URL(connectionString).hostname;
  if (hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1') {
    return undefined;
  }

  const certificatePath = resolve(__dirname, '../../certs/supabase-ca.crt');

  return {
    rejectUnauthorized: true,
    ca: readFileSync(certificatePath, 'utf8'),
  };
}

export function getDatabasePool(): Pool {
  if (!applicationPool) {
    const connectionString = loadApplicationDatabaseUrl();
    applicationPool = createDatabasePool({
      connectionString,
      ssl: loadApplicationTlsConfiguration(connectionString),
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
