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

    try {
      await client.query(`CREATE SCHEMA ${quotedSchemaName}`);
      await client.query(`SET search_path TO ${quotedSchemaName}`);
      await client.query(deliverySchema.up);
      await client.query(authorizationSchema.up);
      await client.query(accountTimestampSchema.up);

      const applied = await client.query<{ scopeExists: boolean }>(
        `SELECT to_regclass($1) IS NOT NULL AS "scopeExists"`,
        [`${schemaName}.submitter_competition_scope`],
      );
      expect(applied.rows[0].scopeExists).toBe(true);

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

  test('retains cricket provenance and statistics after an account is tombstoned', async () => {
    const client = await databasePool().connect();
    const schemaName = `issue66_retention_${process.pid}`;
    const quotedSchemaName = `"${schemaName}"`;
    const deliverySchema = await migrationSections('20260806150357535_delivery-event-schema.sql');
    const authorizationSchema = await migrationSections(
      '20260812120000000_account-authorisation.sql',
    );
    const accountTimestampSchema = await migrationSections(
      '20260815133241837_add-app-user-updated-at.sql',
    );
    const deletionSchema = await migrationSections(
      '20260816160000000_account-deletion-tombstone.sql',
    );

    try {
      await client.query(`CREATE SCHEMA ${quotedSchemaName}`);
      await client.query(`SET search_path TO ${quotedSchemaName}`);
      await client.query(deliverySchema.up);
      await client.query(authorizationSchema.up);
      await client.query(accountTimestampSchema.up);
      await client.query(deletionSchema.up);

      const account = await client.query<{ accountId: string }>(
        `
          INSERT INTO app_user (
            auth_provider,
            auth_subject,
            display_name,
            application_role,
            submitter_approval_state
          )
          VALUES ('supabase', 'issue-66-subject', 'Delete Me', 'viewer', 'approved')
          RETURNING app_user_id::text AS "accountId"
        `,
      );
      const accountId = account.rows[0].accountId;
      const competition = await client.query<{ competitionId: string }>(
        `INSERT INTO competition (name) VALUES ('Issue 66 Competition')
         RETURNING competition_id::text AS "competitionId"`,
      );
      const teams = await client.query<{ teamId: string }>(
        `INSERT INTO team (name) VALUES ('Issue 66 Batting'), ('Issue 66 Bowling')
         RETURNING team_id::text AS "teamId"`,
      );
      const people = await client.query<{ personId: string }>(
        `
          INSERT INTO person (source_ref, display_name)
          VALUES
            ('issue-66-striker', 'Striker'),
            ('issue-66-non-striker', 'Non-striker'),
            ('issue-66-bowler', 'Bowler')
          RETURNING person_id::text AS "personId"
        `,
      );
      const submission = await client.query<{ submissionId: string }>(
        `INSERT INTO submission (submitted_by, status)
         VALUES ($1, 'accepted')
         RETURNING submission_id::text AS "submissionId"`,
        [accountId],
      );
      const fixture = await client.query<{ fixtureId: string }>(
        `
          INSERT INTO fixture (
            source_ref,
            competition_id,
            season,
            match_type,
            team_type,
            gender,
            balls_per_over,
            start_date,
            end_date,
            outcome,
            source_version,
            source_revision,
            first_seen_in
          )
          VALUES (
            'issue-66-fixture', $1, '2026', 'T20', 'club', 'mixed', 6,
            CURRENT_DATE, CURRENT_DATE, 'tie', '1.0', 1, $2
          )
          RETURNING fixture_id::text AS "fixtureId"
        `,
        [competition.rows[0].competitionId, submission.rows[0].submissionId],
      );
      const innings = await client.query<{ inningsId: string }>(
        `INSERT INTO innings (fixture_id, ordinal, batting_team_id)
         VALUES ($1, 0, $2)
         RETURNING innings_id::text AS "inningsId"`,
        [fixture.rows[0].fixtureId, teams.rows[0].teamId],
      );

      await client.query(
        `
          INSERT INTO submitter_competition_scope (app_user_id, competition_id)
          VALUES ($1, $2)
        `,
        [accountId, competition.rows[0].competitionId],
      );
      await client.query(
        `
          INSERT INTO delivery (
            innings_id,
            over_number,
            position_in_over,
            innings_sequence,
            ball_number,
            striker_id,
            non_striker_id,
            bowler_id,
            runs_off_bat,
            runs_extras,
            runs_total,
            submission_id
          )
          VALUES ($1, 0, 0, 1, '0.1', $2, $3, $4, 4, 0, 4, $5)
        `,
        [
          innings.rows[0].inningsId,
          people.rows[0].personId,
          people.rows[1].personId,
          people.rows[2].personId,
          submission.rows[0].submissionId,
        ],
      );

      const before = await client.query<{ deliveries: number; runs: number }>(
        `SELECT count(*)::int AS deliveries, sum(runs_total)::int AS runs FROM delivery_current`,
      );

      await client.query(`DELETE FROM submitter_competition_scope WHERE app_user_id = $1`, [
        accountId,
      ]);
      await client.query(
        `
          UPDATE app_user
          SET
            auth_subject = 'deleted:123e4567-e89b-42d3-a456-426614174066',
            display_name = NULL,
            application_role = 'viewer',
            submitter_approval_state = 'not_requested',
            disabled_at = now(),
            deletion_state = 'deleted',
            deletion_requested_at = now(),
            auth_deleted_at = now(),
            deleted_at = now(),
            deleted_auth_subject_hash = repeat('a', 64)
          WHERE app_user_id = $1
        `,
        [accountId],
      );

      const retained = await client.query<{
        accountId: string;
        approvalState: string;
        deliveryCount: number;
        displayName: string | null;
        fixtureCount: number;
        role: string;
        runs: number;
        scopeCount: number;
        submissionCount: number;
        subject: string;
      }>(
        `
          SELECT
            u.app_user_id::text AS "accountId",
            u.auth_subject AS subject,
            u.display_name AS "displayName",
            u.application_role AS role,
            u.submitter_approval_state AS "approvalState",
            (SELECT count(*)::int FROM submitter_competition_scope WHERE app_user_id = u.app_user_id) AS "scopeCount",
            (SELECT count(*)::int FROM submission WHERE submitted_by = u.app_user_id) AS "submissionCount",
            (SELECT count(*)::int FROM fixture WHERE first_seen_in = $2) AS "fixtureCount",
            (SELECT count(*)::int FROM delivery_current WHERE submission_id = $2) AS "deliveryCount",
            (SELECT sum(runs_total)::int FROM delivery_current WHERE submission_id = $2) AS runs
          FROM app_user u
          WHERE u.app_user_id = $1
        `,
        [accountId, submission.rows[0].submissionId],
      );

      expect(before.rows[0]).toEqual({ deliveries: 1, runs: 4 });
      expect(retained.rows[0]).toEqual({
        accountId,
        approvalState: 'not_requested',
        deliveryCount: 1,
        displayName: null,
        fixtureCount: 1,
        role: 'viewer',
        runs: 4,
        scopeCount: 0,
        submissionCount: 1,
        subject: 'deleted:123e4567-e89b-42d3-a456-426614174066',
      });

      const submissionForeignKey = await client.query<{ deleteAction: string }>(
        `
          SELECT confdeltype AS "deleteAction"
          FROM pg_constraint
          WHERE conrelid = 'submission'::regclass
            AND conname = 'submission_submitted_by_fkey'
        `,
      );
      expect(submissionForeignKey.rows[0].deleteAction).toBe('a');

      await expect(client.query(deletionSchema.down)).rejects.toThrow(
        'Cannot roll back account deletion schema while deletion state exists',
      );
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
