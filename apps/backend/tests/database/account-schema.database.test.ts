import { readFile } from 'node:fs/promises';

import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { executeQuery } from '../../src/database';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';

const sourcePrefix = `account-schema-test-${process.pid}`;

async function migrationSections(fileName: string): Promise<{ down: string; up: string }> {
  const migration = await readFile(
    new URL(`../../../../database/migrations/${fileName}`, import.meta.url),
    'utf8',
  );
  const downMarker = '-- Down Migration';
  const downMarkerIndex = migration.indexOf(downMarker);

  if (downMarkerIndex < 0) {
    throw new Error(`${fileName} does not define a down migration.`);
  }

  return {
    up: migration.slice(0, downMarkerIndex),
    down: migration.slice(downMarkerIndex + downMarker.length),
  };
}

describe.sequential('application account authorization schema', () => {
  let pool: Pool | undefined;

  function databasePool(): Pool {
    if (!pool) {
      throw new Error('Test database pool has not been initialized.');
    }

    return pool;
  }

  async function withRolledBackTransaction(
    operation: (client: PoolClient) => Promise<void>,
  ): Promise<void> {
    const client = await databasePool().connect();

    try {
      await client.query('BEGIN');
      await operation(client);
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
    if (pool) {
      await pool.end();
    }
  });

  test('round-trips the account authorization migration in an isolated schema', async () => {
    const client = await databasePool().connect();
    const schemaName = `issue43_roundtrip_${process.pid}`;
    const quotedSchemaName = `"${schemaName}"`;
    const deliverySchema = await migrationSections('20260806150357535_delivery-event-schema.sql');
    const authorizationSchema = await migrationSections(
      '20260812120000000_account-authorisation.sql',
    );
    const accountTimestampSchema = await migrationSections(
      '20260815133241837_add-app-user-updated-at.sql',
    );
    const applicationRoleSchema = await migrationSections(
      '20260816120000000_standardise-application-role.sql',
    );

    try {
      await client.query(`CREATE SCHEMA ${quotedSchemaName}`);
      await client.query(`SET search_path TO ${quotedSchemaName}`);
      await client.query(deliverySchema.up);
      await client.query(authorizationSchema.up);
      await client.query(accountTimestampSchema.up);
      await client.query(applicationRoleSchema.up);

      const applied = await client.query<{ scopeExists: boolean }>(
        `SELECT to_regclass($1) IS NOT NULL AS "scopeExists"`,
        [`${schemaName}.submitter_competition_scope`],
      );
      expect(applied.rows[0].scopeExists).toBe(true);

      await client.query(applicationRoleSchema.down);
      await client.query(accountTimestampSchema.down);
      await client.query(authorizationSchema.down);

      const rolledBack = await client.query<{
        approvalColumnCount: number;
        scopeExists: boolean;
        updatedAtColumnCount: number;
      }>(
        `
          SELECT
            to_regclass($1) IS NOT NULL AS "scopeExists",
            (
              SELECT count(*)::int
              FROM information_schema.columns
              WHERE table_schema = $2
                AND table_name = 'app_user'
                AND column_name = 'submitter_approval_state'
            ) AS "approvalColumnCount",
            (
              SELECT count(*)::int
              FROM information_schema.columns
              WHERE table_schema = $2
                AND table_name = 'app_user'
                AND column_name = 'updated_at'
            ) AS "updatedAtColumnCount"
        `,
        [`${schemaName}.submitter_competition_scope`, schemaName],
      );
      expect(rolledBack.rows[0]).toEqual({
        scopeExists: false,
        approvalColumnCount: 0,
        updatedAtColumnCount: 0,
      });

      await client.query(authorizationSchema.up);
      await client.query(accountTimestampSchema.up);
      await client.query(applicationRoleSchema.up);

      const reapplied = await client.query<{
        approvalColumnCount: number;
        scopeExists: boolean;
        updatedAtColumnCount: number;
      }>(
        `
          SELECT
            to_regclass($1) IS NOT NULL AS "scopeExists",
            (
              SELECT count(*)::int
              FROM information_schema.columns
              WHERE table_schema = $2
                AND table_name = 'app_user'
                AND column_name = 'submitter_approval_state'
            ) AS "approvalColumnCount",
            (
              SELECT count(*)::int
              FROM information_schema.columns
              WHERE table_schema = $2
                AND table_name = 'app_user'
                AND column_name = 'updated_at'
            ) AS "updatedAtColumnCount"
        `,
        [`${schemaName}.submitter_competition_scope`, schemaName],
      );
      expect(reapplied.rows[0]).toEqual({
        scopeExists: true,
        approvalColumnCount: 1,
        updatedAtColumnCount: 1,
      });
    } finally {
      await client.query('RESET search_path');
      await client.query(`DROP SCHEMA IF EXISTS ${quotedSchemaName} CASCADE`);
      client.release();
    }
  });

  test('migrates approved submitters and administrators without changing account identity', async () => {
    const client = await databasePool().connect();
    const schemaName = `issue154_role_migration_${process.pid}`;
    const quotedSchemaName = `"${schemaName}"`;
    const deliverySchema = await migrationSections('20260806150357535_delivery-event-schema.sql');
    const authorizationSchema = await migrationSections(
      '20260812120000000_account-authorisation.sql',
    );
    const applicationRoleSchema = await migrationSections(
      '20260816120000000_standardise-application-role.sql',
    );

    try {
      await client.query(`CREATE SCHEMA ${quotedSchemaName}`);
      await client.query(`SET search_path TO ${quotedSchemaName}`);
      await client.query(deliverySchema.up);
      await client.query(authorizationSchema.up);
      await client.query(
        `
          INSERT INTO app_user (
            auth_provider,
            auth_subject,
            application_role,
            submitter_approval_state
          )
          VALUES
            ('supabase', 'legacy-viewer', 'viewer', 'not_requested'),
            ('supabase', 'legacy-approved-submitter', 'viewer', 'approved'),
            ('supabase', 'legacy-administrator', 'administrator', 'approved')
        `,
      );
      await client.query("INSERT INTO competition (name) VALUES ('Legacy scoped competition')");
      await client.query(
        `
          INSERT INTO submitter_competition_scope (app_user_id, competition_id)
          SELECT app_user_id, competition_id
          FROM app_user
          CROSS JOIN competition
          WHERE auth_subject = 'legacy-approved-submitter'
            AND competition.name = 'Legacy scoped competition'
        `,
      );

      await client.query(applicationRoleSchema.up);

      const migrated = await client.query<{ role: string; subject: string }>(
        `
          SELECT auth_subject AS subject, application_role AS role
          FROM app_user
          ORDER BY auth_subject
        `,
      );
      expect(migrated.rows).toEqual([
        { subject: 'legacy-administrator', role: 'admin' },
        { subject: 'legacy-approved-submitter', role: 'submitter' },
        { subject: 'legacy-viewer', role: 'viewer' },
      ]);

      const preservedScope = await client.query<{ scopeCount: number }>(
        `
          SELECT count(*)::int AS "scopeCount"
          FROM submitter_competition_scope scope
          JOIN app_user account USING (app_user_id)
          WHERE account.auth_subject = 'legacy-approved-submitter'
        `,
      );
      expect(preservedScope.rows[0].scopeCount).toBe(1);

      await client.query(applicationRoleSchema.down);

      const restored = await client.query<{ role: string; subject: string }>(
        `
          SELECT auth_subject AS subject, application_role AS role
          FROM app_user
          ORDER BY auth_subject
        `,
      );
      expect(restored.rows).toEqual([
        { subject: 'legacy-administrator', role: 'administrator' },
        { subject: 'legacy-approved-submitter', role: 'viewer' },
        { subject: 'legacy-viewer', role: 'viewer' },
      ]);
    } finally {
      await client.query('RESET search_path');
      await client.query(`DROP SCHEMA IF EXISTS ${quotedSchemaName} CASCADE`);
      client.release();
    }
  });

  test('aborts role migration when an unknown legacy value exists', async () => {
    const client = await databasePool().connect();
    const schemaName = `issue154_unknown_role_${process.pid}`;
    const quotedSchemaName = `"${schemaName}"`;
    const deliverySchema = await migrationSections('20260806150357535_delivery-event-schema.sql');
    const authorizationSchema = await migrationSections(
      '20260812120000000_account-authorisation.sql',
    );
    const applicationRoleSchema = await migrationSections(
      '20260816120000000_standardise-application-role.sql',
    );

    try {
      await client.query(`CREATE SCHEMA ${quotedSchemaName}`);
      await client.query(`SET search_path TO ${quotedSchemaName}`);
      await client.query(deliverySchema.up);
      await client.query(authorizationSchema.up);
      await client.query('ALTER TABLE app_user DROP CONSTRAINT app_user_application_role_ck');
      await client.query(
        `
          INSERT INTO app_user (auth_provider, auth_subject, application_role)
          VALUES ('supabase', 'unknown-role', 'owner')
        `,
      );

      await expect(client.query(applicationRoleSchema.up)).rejects.toThrow(
        /unsupported values: 'owner'/,
      );

      const unchanged = await client.query<{ role: string }>(
        "SELECT application_role AS role FROM app_user WHERE auth_subject = 'unknown-role'",
      );
      expect(unchanged.rows[0].role).toBe('owner');
    } finally {
      await client.query('RESET search_path');
      await client.query(`DROP SCHEMA IF EXISTS ${quotedSchemaName} CASCADE`);
      client.release();
    }
  });

  test('exposes the migrated account, approval, and competition-scope structures', async () => {
    const columns = await executeQuery<{
      tableName: string;
      columnName: string;
      nullable: string;
    }>(
      databasePool(),
      `
        SELECT
          table_name AS "tableName",
          column_name AS "columnName",
          is_nullable AS nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND (
            (table_name = 'app_user' AND column_name IN (
              'auth_provider',
              'auth_subject',
              'application_role',
              'submitter_approval_state',
              'created_at',
              'last_authenticated_at',
              'updated_at'
            ))
            OR
            (table_name = 'submitter_competition_scope' AND column_name IN (
              'app_user_id',
              'competition_id',
              'created_at'
            ))
          )
        ORDER BY table_name, column_name
      `,
    );

    expect(columns.rows).toEqual([
      { tableName: 'app_user', columnName: 'application_role', nullable: 'NO' },
      { tableName: 'app_user', columnName: 'auth_provider', nullable: 'NO' },
      { tableName: 'app_user', columnName: 'auth_subject', nullable: 'NO' },
      { tableName: 'app_user', columnName: 'created_at', nullable: 'NO' },
      { tableName: 'app_user', columnName: 'last_authenticated_at', nullable: 'NO' },
      { tableName: 'app_user', columnName: 'submitter_approval_state', nullable: 'NO' },
      { tableName: 'app_user', columnName: 'updated_at', nullable: 'NO' },
      {
        tableName: 'submitter_competition_scope',
        columnName: 'app_user_id',
        nullable: 'NO',
      },
      {
        tableName: 'submitter_competition_scope',
        columnName: 'competition_id',
        nullable: 'NO',
      },
      {
        tableName: 'submitter_competition_scope',
        columnName: 'created_at',
        nullable: 'NO',
      },
    ]);

    const constraints = await executeQuery<{ constraintName: string }>(
      databasePool(),
      `
        SELECT conname AS "constraintName"
        FROM pg_constraint
        WHERE conrelid IN ('app_user'::regclass, 'submitter_competition_scope'::regclass)
        ORDER BY conname
      `,
    );
    const constraintNames = constraints.rows.map(({ constraintName }) => constraintName);

    expect(constraintNames).toEqual(
      expect.arrayContaining([
        'app_user_application_role_ck',
        'app_user_auth_provider_auth_subject_key',
        'app_user_submitter_approval_state_ck',
        'submitter_competition_scope_app_user_id_fkey',
        'submitter_competition_scope_competition_id_fkey',
        'submitter_competition_scope_pkey',
      ]),
    );

    const indexes = await executeQuery<{ indexName: string }>(
      databasePool(),
      `
        SELECT indexname AS "indexName"
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'submitter_competition_scope'
      `,
    );

    expect(indexes.rows.map(({ indexName }) => indexName)).toEqual(
      expect.arrayContaining([
        'submitter_competition_scope_pkey',
        'submitter_competition_scope_competition_idx',
      ]),
    );
  });

  test('maps one provider identity to one application account', async () => {
    await expect(
      withRolledBackTransaction(async (client) => {
        await executeQuery(
          client,
          `
            INSERT INTO app_user (auth_provider, auth_subject)
            VALUES ('supabase', $1)
          `,
          [`${sourcePrefix}-duplicate-identity`],
        );
        await executeQuery(
          client,
          `
            INSERT INTO app_user (auth_provider, auth_subject)
            VALUES ('supabase', $1)
          `,
          [`${sourcePrefix}-duplicate-identity`],
        );
      }),
    ).rejects.toMatchObject({ code: 'DATABASE_CONFLICT' });
  });

  test('keeps identity mapping provider-neutral', async () => {
    await withRolledBackTransaction(async (client) => {
      const subject = `${sourcePrefix}-provider-neutral`;

      await executeQuery(
        client,
        `
          INSERT INTO app_user (auth_provider, auth_subject)
          VALUES ('supabase', $1), ('test-provider', $1)
        `,
        [subject],
      );

      const accounts = await executeQuery<{ accountCount: number }>(
        client,
        `
          SELECT count(*)::int AS "accountCount"
          FROM app_user
          WHERE auth_subject = $1
        `,
        [subject],
      );

      expect(accounts.rows[0].accountCount).toBe(2);
    });
  });

  test('defaults new accounts to viewer and accepts explicit submitter and admin roles', async () => {
    await withRolledBackTransaction(async (client) => {
      const accounts = await executeQuery<{ role: string; subject: string }>(
        client,
        `
          INSERT INTO app_user (auth_provider, auth_subject, application_role)
          VALUES
            ('supabase', $1, DEFAULT),
            ('supabase', $2, 'submitter'),
            ('supabase', $3, 'admin')
          RETURNING auth_subject AS subject, application_role AS role
        `,
        [
          `${sourcePrefix}-default-viewer`,
          `${sourcePrefix}-explicit-submitter`,
          `${sourcePrefix}-explicit-admin`,
        ],
      );

      expect(accounts.rows).toEqual([
        { subject: `${sourcePrefix}-default-viewer`, role: 'viewer' },
        { subject: `${sourcePrefix}-explicit-submitter`, role: 'submitter' },
        { subject: `${sourcePrefix}-explicit-admin`, role: 'admin' },
      ]);
    });
  });

  test('supports approval and revocation without changing authentication identity', async () => {
    await withRolledBackTransaction(async (client) => {
      const account = await executeQuery<{ accountId: string }>(
        client,
        `
          INSERT INTO app_user (auth_provider, auth_subject, submitter_approval_state)
          VALUES ('supabase', $1, 'pending')
          RETURNING app_user_id::text AS "accountId"
        `,
        [`${sourcePrefix}-approval-lifecycle`],
      );
      const accountId = account.rows[0].accountId;

      const approved = await executeQuery<{ approvalState: string }>(
        client,
        `
          UPDATE app_user
          SET submitter_approval_state = 'approved'
          WHERE app_user_id = $1
          RETURNING submitter_approval_state AS "approvalState"
        `,
        [accountId],
      );
      expect(approved.rows[0].approvalState).toBe('approved');

      const revoked = await executeQuery<{ approvalState: string; subject: string }>(
        client,
        `
          UPDATE app_user
          SET submitter_approval_state = 'rejected'
          WHERE app_user_id = $1
          RETURNING
            submitter_approval_state AS "approvalState",
            auth_subject AS subject
        `,
        [accountId],
      );

      expect(revoked.rows[0]).toEqual({
        approvalState: 'rejected',
        subject: `${sourcePrefix}-approval-lifecycle`,
      });
    });
  });

  test('tracks the most recent application-account update', async () => {
    await withRolledBackTransaction(async (client) => {
      const account = await executeQuery<{ accountId: string; updatedAt: Date }>(
        client,
        `
          INSERT INTO app_user (
            auth_provider,
            auth_subject,
            submitter_approval_state,
            updated_at
          )
          VALUES ('supabase', $1, 'pending', TIMESTAMPTZ '2000-01-01 00:00:00+00')
          RETURNING
            app_user_id::text AS "accountId",
            updated_at AS "updatedAt"
        `,
        [`${sourcePrefix}-updated-at`],
      );

      const updated = await executeQuery<{ updatedAt: Date }>(
        client,
        `
          UPDATE app_user
          SET submitter_approval_state = 'approved'
          WHERE app_user_id = $1
          RETURNING updated_at AS "updatedAt"
        `,
        [account.rows[0].accountId],
      );

      expect(updated.rows[0].updatedAt.getTime()).toBeGreaterThan(
        account.rows[0].updatedAt.getTime(),
      );
    });
  });

  test.each([
    ['application role', 'administrator'],
    ['application role', 'owner'],
    ['approval state', 'self_approved'],
  ])('rejects an unsupported %s', async (field, invalidValue) => {
    await expect(
      withRolledBackTransaction(async (client) => {
        if (field === 'application role') {
          await executeQuery(
            client,
            `
              INSERT INTO app_user (auth_provider, auth_subject, application_role)
              VALUES ('supabase', $1, $2)
            `,
            [`${sourcePrefix}-invalid-role`, invalidValue],
          );
          return;
        }

        await executeQuery(
          client,
          `
            INSERT INTO app_user (auth_provider, auth_subject, submitter_approval_state)
            VALUES ('supabase', $1, $2)
          `,
          [`${sourcePrefix}-invalid-approval`, invalidValue],
        );
      }),
    ).rejects.toMatchObject({ code: 'DATABASE_CONSTRAINT_ERROR' });
  });

  test('prevents duplicate competition grants', async () => {
    await expect(
      withRolledBackTransaction(async (client) => {
        const account = await executeQuery<{ accountId: string }>(
          client,
          `
            INSERT INTO app_user (auth_provider, auth_subject, submitter_approval_state)
            VALUES ('supabase', $1, 'approved')
            RETURNING app_user_id::text AS "accountId"
          `,
          [`${sourcePrefix}-duplicate-scope`],
        );
        const competition = await executeQuery<{ competitionId: string }>(
          client,
          `
            INSERT INTO competition (name)
            VALUES ($1)
            RETURNING competition_id::text AS "competitionId"
          `,
          [`${sourcePrefix}-duplicate-scope-competition`],
        );
        const values = [account.rows[0].accountId, competition.rows[0].competitionId];

        await executeQuery(
          client,
          `
            INSERT INTO submitter_competition_scope (app_user_id, competition_id)
            VALUES ($1, $2)
          `,
          values,
        );
        await executeQuery(
          client,
          `
            INSERT INTO submitter_competition_scope (app_user_id, competition_id)
            VALUES ($1, $2)
          `,
          values,
        );
      }),
    ).rejects.toMatchObject({ code: 'DATABASE_CONFLICT' });
  });

  test.each([
    ['unknown account', '9223372036854775806', null],
    ['unknown competition', null, '9223372036854775806'],
  ])('rejects a grant for an %s', async (_case, missingAccountId, missingCompetitionId) => {
    await expect(
      withRolledBackTransaction(async (client) => {
        const account = await executeQuery<{ accountId: string }>(
          client,
          `
            INSERT INTO app_user (auth_provider, auth_subject, submitter_approval_state)
            VALUES ('supabase', $1, 'approved')
            RETURNING app_user_id::text AS "accountId"
          `,
          [`${sourcePrefix}-foreign-key-account-${_case}`],
        );
        const competition = await executeQuery<{ competitionId: string }>(
          client,
          `
            INSERT INTO competition (name)
            VALUES ($1)
            RETURNING competition_id::text AS "competitionId"
          `,
          [`${sourcePrefix}-foreign-key-competition-${_case}`],
        );

        await executeQuery(
          client,
          `
            INSERT INTO submitter_competition_scope (app_user_id, competition_id)
            VALUES ($1, $2)
          `,
          [
            missingAccountId ?? account.rows[0].accountId,
            missingCompetitionId ?? competition.rows[0].competitionId,
          ],
        );
      }),
    ).rejects.toMatchObject({ code: 'DATABASE_REFERENCE_ERROR' });
  });

  test('removes competition grants when either parent record is removed', async () => {
    await withRolledBackTransaction(async (client) => {
      const account = await executeQuery<{ accountId: string }>(
        client,
        `
          INSERT INTO app_user (auth_provider, auth_subject, submitter_approval_state)
          VALUES ('supabase', $1, 'approved')
          RETURNING app_user_id::text AS "accountId"
        `,
        [`${sourcePrefix}-cascade`],
      );
      const competition = await executeQuery<{ competitionId: string }>(
        client,
        `
          INSERT INTO competition (name)
          VALUES ($1)
          RETURNING competition_id::text AS "competitionId"
        `,
        [`${sourcePrefix}-cascade-competition`],
      );
      const accountId = account.rows[0].accountId;

      await executeQuery(
        client,
        `
          INSERT INTO submitter_competition_scope (app_user_id, competition_id)
          VALUES ($1, $2)
        `,
        [accountId, competition.rows[0].competitionId],
      );
      await executeQuery(client, 'DELETE FROM app_user WHERE app_user_id = $1', [accountId]);

      const remainingScopes = await executeQuery<{ scopeCount: number }>(
        client,
        `
          SELECT count(*)::int AS "scopeCount"
          FROM submitter_competition_scope
          WHERE app_user_id = $1
        `,
        [accountId],
      );

      expect(remainingScopes.rows[0].scopeCount).toBe(0);

      const secondAccount = await executeQuery<{ accountId: string }>(
        client,
        `
          INSERT INTO app_user (auth_provider, auth_subject, submitter_approval_state)
          VALUES ('supabase', $1, 'approved')
          RETURNING app_user_id::text AS "accountId"
        `,
        [`${sourcePrefix}-competition-cascade`],
      );
      const secondAccountId = secondAccount.rows[0].accountId;

      await executeQuery(
        client,
        `
          INSERT INTO submitter_competition_scope (app_user_id, competition_id)
          VALUES ($1, $2)
        `,
        [secondAccountId, competition.rows[0].competitionId],
      );
      await executeQuery(client, 'DELETE FROM competition WHERE competition_id = $1', [
        competition.rows[0].competitionId,
      ]);

      const remainingCompetitionScopes = await executeQuery<{ scopeCount: number }>(
        client,
        `
          SELECT count(*)::int AS "scopeCount"
          FROM submitter_competition_scope
          WHERE app_user_id = $1
        `,
        [secondAccountId],
      );

      expect(remainingCompetitionScopes.rows[0].scopeCount).toBe(0);
    });
  });
});
