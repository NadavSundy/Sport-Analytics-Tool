import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { executeQuery } from '../../src/database';
import { createStoredObjectRepository } from '../../src/modules/object-storage/stored-object.repository';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';

const sourcePrefix = `stored-object-test-${process.pid}`;

async function migrationSections(): Promise<{ down: string; up: string }> {
  const migration = await readFile(
    new URL(
      '../../../../database/migrations/20260902193000000_stored-objects.sql',
      import.meta.url,
    ),
    'utf8',
  );
  const marker = '-- Down Migration';
  const markerIndex = migration.indexOf(marker);
  if (markerIndex < 0) {
    throw new Error('The stored-object migration does not define a down migration.');
  }
  return {
    up: migration.slice(0, markerIndex),
    down: migration.slice(markerIndex + marker.length),
  };
}

describe.sequential('stored-object repository database integration', () => {
  let pool: Pool | undefined;

  function databasePool(): Pool {
    if (!pool) {
      throw new Error('Test database pool has not been initialized.');
    }
    return pool;
  }

  async function withRolledBackTransaction<T>(
    operation: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await databasePool().connect();
    try {
      await client.query('BEGIN');
      return await operation(client);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  }

  beforeAll(() => {
    const databaseUrl = assertSafeTestDatabase(
      process.env.DATABASE_URL_TEST,
      process.env.DATABASE_URL,
      process.env.NODE_ENV,
    );
    pool = new Pool({ connectionString: databaseUrl.toString() });
  });

  afterAll(async () => {
    await pool?.end();
  });

  test('persists complete metadata and retains it after expiry', async () => {
    await withRolledBackTransaction(async (client) => {
      const owner = await executeQuery<{ ownerId: string }>(
        client,
        `
          INSERT INTO app_user (auth_provider, auth_subject, application_role)
          VALUES ('test', $1, 'submitter')
          RETURNING app_user_id::text AS "ownerId"
        `,
        [sourcePrefix],
      );
      const repository = createStoredObjectRepository(client);
      const objectId = randomUUID();
      const created = await repository.create({
        objectId,
        ownerId: owner.rows[0].ownerId,
        originalFilename: 'season.ndjson',
        mediaType: 'application/x-ndjson',
        byteSize: 1234,
        sha256: 'a'.repeat(64),
        storageKey: `incoming/batch-source/2026/09/02/${objectId}`,
        providerVersionId: 'azure-version-1',
        retentionExpiresAt: '2026-12-01T12:00:00.000Z',
      });

      expect(created).toMatchObject({
        objectId,
        originalFilename: 'season.ndjson',
        mediaType: 'application/x-ndjson',
        byteSize: 1234,
        sha256: 'a'.repeat(64),
        retentionState: 'retained',
      });

      await repository.updateRetentionState(objectId, 'deletion_pending');
      const expired = await repository.updateRetentionState(
        objectId,
        'expired',
        '2026-12-01T12:01:00.000Z',
      );
      expect(expired).toMatchObject({
        objectId,
        storageKey: created.storageKey,
        sha256: created.sha256,
        retentionState: 'expired',
        deletedAt: '2026-12-01T12:01:00.000Z',
      });

      await expect(
        client.query('DELETE FROM stored_object WHERE object_id = $1', [objectId]),
      ).rejects.toMatchObject({ code: '23514' });
    });
  });

  test('round-trips the migration in an isolated schema', async () => {
    const client = await databasePool().connect();
    const schemaName = `issue358_roundtrip_${process.pid}`;
    const quotedSchemaName = `"${schemaName}"`;
    const migration = await migrationSections();

    try {
      await client.query(`CREATE SCHEMA ${quotedSchemaName}`);
      await client.query(`SET search_path TO ${quotedSchemaName}`);
      await client.query('CREATE TABLE app_user (app_user_id bigint PRIMARY KEY)');
      await client.query(migration.up);
      const created = await client.query<{ relationName: string | null }>(
        `SELECT to_regclass('stored_object')::text AS "relationName"`,
      );
      expect(created.rows[0].relationName).toBe('stored_object');

      await client.query(migration.down);
      const removed = await client.query<{ relationName: string | null }>(
        `SELECT to_regclass('stored_object')::text AS "relationName"`,
      );
      expect(removed.rows[0].relationName).toBeNull();
    } finally {
      await client.query('RESET search_path');
      await client.query(`DROP SCHEMA IF EXISTS ${quotedSchemaName} CASCADE`);
      client.release();
    }
  });
});
