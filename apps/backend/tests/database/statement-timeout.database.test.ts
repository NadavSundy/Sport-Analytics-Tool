import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { DatabaseAccessError, executeQuery, withTransaction } from '../../src/database';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';

/**
 * The statement bound against a real PostgreSQL server (issue #812).
 *
 * The application configures `statement_timeout` on the pool, which `pg` sends
 * as a startup parameter, so PostgreSQL itself cancels an over-running
 * statement and the driver reports SQLSTATE 57014. These tests use a short
 * bound so a cancellation can be provoked in under a second; the production
 * default is three orders of magnitude larger.
 */
describe('bounded statement execution time', () => {
  const statementTimeoutMs = 200;
  let pool: Pool | undefined;
  let unboundedPool: Pool | undefined;

  function boundedPool(): Pool {
    if (!pool) throw new Error('Test database pool has not been initialised.');
    return pool;
  }

  beforeAll(() => {
    const databaseUrl = assertSafeTestDatabase(
      process.env.DATABASE_URL_TEST,
      process.env.DATABASE_URL,
      process.env.NODE_ENV,
    );

    pool = new Pool({
      connectionString: databaseUrl.toString(),
      statement_timeout: statementTimeoutMs,
      max: 3,
    });
    unboundedPool = new Pool({ connectionString: databaseUrl.toString(), max: 1 });
  });

  afterAll(async () => {
    await Promise.all([pool?.end(), unboundedPool?.end()]);
  });

  test('applies the bound to every connection the pool opens', async () => {
    const settings = await Promise.all(
      [0, 1, 2].map(() =>
        executeQuery<{ statement_timeout: string }>(boundedPool(), 'SHOW statement_timeout').then(
          (result) => result.rows[0]?.statement_timeout,
        ),
      ),
    );

    expect(settings).toEqual([
      `${statementTimeoutMs}ms`,
      `${statementTimeoutMs}ms`,
      `${statementTimeoutMs}ms`,
    ]);
  });

  test('cancels a statement over the bound and reports a translated error', async () => {
    const rejection = await executeQuery(boundedPool(), 'SELECT pg_sleep(1)').then(
      () => undefined,
      (error: unknown) => error,
    );

    expect(rejection).toBeInstanceOf(DatabaseAccessError);
    const translated = rejection as DatabaseAccessError;
    expect(translated.code).toBe('DATABASE_STATEMENT_TIMEOUT');
    expect(translated.message).toBe(
      'The database statement exceeded its time limit and was cancelled.',
    );
    // The cancellation must arrive as a rejected promise carrying the SQLSTATE,
    // not as a driver error raised outside the caller's control.
    expect((translated.cause as { code?: string } | undefined)?.code).toBe('57014');
  });

  test('leaves the pooled connection usable after a cancellation', async () => {
    await expect(executeQuery(boundedPool(), 'SELECT pg_sleep(1)')).rejects.toBeInstanceOf(
      DatabaseAccessError,
    );

    const result = await executeQuery<{ ok: number }>(boundedPool(), 'SELECT 1 AS ok');

    expect(result.rows[0]?.ok).toBe(1);
  });

  test('admits a statement inside the bound', async () => {
    const result = await executeQuery(boundedPool(), 'SELECT pg_sleep(0.05)');

    expect(result.rowCount).toBe(1);
  });

  test('rolls back a transaction whose statement is cancelled', async () => {
    const rejection = await withTransaction(boundedPool(), async (client) => {
      await executeQuery(client, 'SELECT pg_sleep(1)');
    }).then(
      () => undefined,
      (error: unknown) => error,
    );

    expect(rejection).toBeInstanceOf(DatabaseAccessError);
    expect((rejection as DatabaseAccessError).code).toBe('DATABASE_STATEMENT_TIMEOUT');

    // The rollback must leave the session clean rather than stuck in a failed
    // transaction, or every later checkout of this connection would fail.
    const result = await executeQuery<{ ok: number }>(boundedPool(), 'SELECT 1 AS ok');
    expect(result.rows[0]?.ok).toBe(1);
  });

  // Confirms the bound comes from the pool configuration rather than from the
  // server or the connection string, which is what keeps migrations, operator
  // scripts and the existing database tests unaffected.
  test('does not bound a pool that did not configure it', async () => {
    if (!unboundedPool) throw new Error('Unbounded test pool has not been initialised.');

    const shown = await executeQuery<{ statement_timeout: string }>(
      unboundedPool,
      'SHOW statement_timeout',
    );

    expect(shown.rows[0]?.statement_timeout).toBe('0');
    await expect(executeQuery(unboundedPool, 'SELECT pg_sleep(0.1)')).resolves.toBeDefined();
  });
});
