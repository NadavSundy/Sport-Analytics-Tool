import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { createBatchPublicationJobHandler } from '../../../worker/src/batch-publication-job';
import { createBatchValidationJobHandler } from '../../../worker/src/batch-validation-job';
import type { Logger } from '../../../worker/src/logger';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';
import { executeQuery } from '../../src/database';
import type { SynchronizeAccount } from '../../src/modules/accounts/account.service';
import { createBatchRepository } from '../../src/modules/batches/batch.repository';
import { createBatchService } from '../../src/modules/batches/batch.service';
import { BatchPayloadStorageService } from '../../src/modules/object-storage/batch-payload-storage.service';
import { FilesystemObjectStore } from '../../src/modules/object-storage/filesystem-object-store';
import { createStoredObjectRepository } from '../../src/modules/object-storage/stored-object.repository';
import { deriveFixtureStatistics } from '../../src/modules/statistics/fixture-statistics.derivation';
import { loadFixtureStatisticsSource } from '../../src/modules/statistics/fixture-statistics.repository';
import { createTestAccount, createTestApp } from '../test-app';

/**
 * Issue #708, deployed acceptance re-run, driven locally.
 *
 * The deployed environment cannot be re-verified: its Container App carries a
 * single revision that predates the fixes for defects A, B and C, so nothing
 * pushed since can be observed there. This drives the same workflow the
 * deployed run drove, against a real PostgreSQL, using the real service, the
 * real repository and the real worker job handlers — the same code paths the
 * deployed run exercised, minus the browser and the queue transport.
 *
 * The package is `evidence/validation/issue-708/onboarding-test-package-run-3.json`,
 * read from disk and submitted through `POST /api/v1/batches` exactly as the
 * upload form submits it. Nothing about it is rewritten for the test.
 *
 * What this covers, and what it does not:
 *
 * - **Defect C** (the canonical fixture path returning 500 on a constraint
 *   violation) is covered directly: step 3 is the request that failed five
 *   times on deployed.
 * - **Defect B** (settled tasks reappearing after revalidation) is covered
 *   directly: step 6 settles, revalidates, and asserts the settlement held.
 *   Both writers run — the backend derivation and the worker's
 *   `persistReviewerActionableOnboardingTasks`, which is the path #729 added
 *   and where defect B returned.
 * - **Defect A** is covered only at the contract boundary. The defect was in
 *   the reviewer interface, which offered a team control only for a
 *   `team_not_recognised` task while the team was checked for every decision.
 *   Step 5 proves the endpoint accepts a decision carrying both an identity
 *   and a team for a task whose reason is not `team_not_recognised`, which is
 *   what the interface has to be able to send. That the interface now renders
 *   the control is a frontend concern and is not observable from here.
 */

const packagePath = resolve(
  __dirname,
  '../../../../evidence/validation/issue-708/onboarding-test-package-run-3.json',
);

/** The identities the package carries. Read from the file, never assumed. */
interface PackageIdentity {
  competitionName: string;
  seasonName: string;
  fixtureSourceId: string;
  /**
   * What `fixture.source_ref` actually holds. The package carries a namespaced
   * source identifier; the backend stores only its value segment.
   */
  fixtureSourceRef: string;
  startDate: string;
  teamNames: [string, string];
  eventIds: string[];
}

const PARTICIPANTS = {
  noIdentifier: 'onboarding-test-Priya-Naicker',
  unlistedTeam: 'onboarding-test-Sipho-Dlamini',
  unknownIdentifier: 'onboarding-test-Lerato-Khumalo',
  durableIdentifier: 'onboarding-test-Thandi-Mokoena',
} as const;

const silentLogger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

interface Seeded {
  competitionId: string;
  submitterId: string;
  reviewerId: string;
}

describe.sequential('issue #708 participant onboarding, end to end', () => {
  let pool: Pool | undefined;
  let storageRoot: string | undefined;
  let store: FilesystemObjectStore | undefined;
  let storage: BatchPayloadStorageService | undefined;
  let identity: PackageIdentity | undefined;
  let seeded: Seeded | undefined;

  /** Carried between the ordered steps below. */
  const state: {
    batchReference?: string;
    batchId?: string;
    fixtureId?: string;
    taskReferences?: Record<string, string>;
  } = {};

  function databasePool(): Pool {
    if (!pool) throw new Error('Test database pool has not been initialised.');
    return pool;
  }

  function packageIdentity(): PackageIdentity {
    if (!identity) throw new Error('The package identity has not been read.');
    return identity;
  }

  function objectStore(): FilesystemObjectStore {
    if (!store) throw new Error('The object store has not been initialised.');
    return store;
  }

  function seed(): Seeded {
    if (!seeded) throw new Error('The test records have not been seeded.');
    return seeded;
  }

  function batchReference(): string {
    if (!state.batchReference) throw new Error('No batch has been submitted yet.');
    return state.batchReference;
  }

  function batchId(): string {
    if (!state.batchId) throw new Error('No batch has been submitted yet.');
    return state.batchId;
  }

  function fixtureId(): string {
    if (!state.fixtureId) throw new Error('No canonical fixture has been created yet.');
    return state.fixtureId;
  }

  /**
   * The real HTTP application over the real service and repository, so every
   * step is judged by what the endpoint accepts rather than by what the
   * repository would accept with the contract out of the way.
   */
  function app(role: 'submitter' | 'admin') {
    const account = createTestAccount(
      role === 'admin'
        ? { accountId: seed().reviewerId, role: 'admin', approvalState: 'approved' }
        : {
            accountId: seed().submitterId,
            role: 'submitter',
            approvalState: 'approved',
            competitionIds: [seed().competitionId],
          },
    );
    const synchronizeAccount: SynchronizeAccount = async () => account;
    return createTestApp(
      undefined,
      undefined,
      synchronizeAccount,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      createBatchService(storage, createBatchRepository(databasePool())),
    );
  }

  /**
   * The transactional outbox drained the way the worker drains it: claim a
   * message, dispatch its envelope to the real job handler, mark it published.
   * The queue transport is replaced; the handlers are not.
   *
   * Scoped to this batch's own jobs. The real worker drains the whole table,
   * but these files run in parallel against one database, and an unscoped
   * drain both dispatched other files' commands and published them out from
   * under their assertions.
   */
  async function drainOutbox(): Promise<number> {
    const workerId = `issue-708-e2e-${process.pid}`;
    const opened: Array<{ destroy(): void }> = [];
    const validation = createBatchValidationJobHandler(
      databasePool(),
      {
        // The worker opens the source more than once — a reference scan, then
        // the chunked read — and does not always consume a stream to its end.
        // These are FileHandle-backed, and Node now treats a descriptor closed
        // by the garbage collector as an error, so they are closed here once
        // the drain is done. Azure is the production reader; this stands in for
        // it, and the backend still writes through the real object store.
        read: async (storageKey: string) => {
          const stream = await objectStore().read(storageKey);
          opened.push(stream);
          return stream;
        },
      },
      silentLogger,
      { workerId, chunkSize: 100, leaseMs: 120_000 },
    );
    const publication = createBatchPublicationJobHandler(databasePool(), silentLogger, {
      workerId,
      chunkSize: 100,
      leaseMs: 120_000,
    });

    let handled = 0;
    try {
      for (;;) {
        const claimed = await databasePool().query<{ outboxMessageId: string; body: unknown }>(
          `WITH candidate AS (
             SELECT m.outbox_message_id FROM outbox_message m
               JOIN background_job j ON j.job_id = m.job_id
             WHERE m.published_at IS NULL
               AND (m.claim_expires_at IS NULL OR m.claim_expires_at < now())
               AND j.batch_id = $2::bigint
             ORDER BY m.created_at, m.outbox_message_id FOR UPDATE SKIP LOCKED LIMIT 1
           )
           UPDATE outbox_message m SET claim_owner=$1, claim_expires_at=now()+interval '5 minutes',
                  publish_attempts=publish_attempts+1
           FROM candidate WHERE m.outbox_message_id = candidate.outbox_message_id
           RETURNING m.outbox_message_id::text AS "outboxMessageId", m.body`,
          [workerId, batchId()],
        );
        const row = claimed.rows[0];
        if (!row) break;

        const body = row.body as { type?: string };
        const message = { body, deliveryCount: 1, messageId: row.outboxMessageId };
        const controller = new AbortController();
        if (body.type === 'batch.validate') await validation.handler(message, controller.signal);
        else if (body.type === 'batch.publish')
          await publication.handler(message, controller.signal);
        else throw new Error(`Unexpected outbox message type: ${String(body.type)}`);

        await databasePool().query(
          `UPDATE outbox_message SET published_at=now(), claim_owner=NULL, claim_expires_at=NULL
           WHERE outbox_message_id=$1::uuid`,
          [row.outboxMessageId],
        );
        handled += 1;
      }
    } finally {
      for (const stream of opened) stream.destroy();
    }
    return handled;
  }

  async function batchState(): Promise<string> {
    const { rows } = await databasePool().query<{ state: string }>(
      `SELECT state::text AS state FROM batch WHERE batch_id=$1::bigint`,
      [batchId()],
    );
    return rows[0]!.state;
  }

  async function onboardingTasks(): Promise<
    Array<{
      taskReference: string;
      submittedName: string;
      submittedTeamName: string | null;
      reason: string;
      state: string;
      personId: string | null;
      decidedBy: string | null;
    }>
  > {
    const { rows } = await databasePool().query<{
      taskReference: string;
      submittedName: string;
      submittedTeamName: string | null;
      reason: string;
      state: string;
      personId: string | null;
      decidedBy: string | null;
    }>(
      `SELECT task_reference::text AS "taskReference", submitted_name AS "submittedName",
              submitted_team_name AS "submittedTeamName", reason, state,
              person_id::text AS "personId", decided_by::text AS "decidedBy"
         FROM batch_participant_onboarding_task
        WHERE batch_id=$1::bigint
        ORDER BY submitted_name`,
      [batchId()],
    );
    return rows;
  }

  beforeAll(async () => {
    const databaseUrl = assertSafeTestDatabase(
      process.env.DATABASE_URL_TEST,
      process.env.DATABASE_URL,
      process.env.NODE_ENV,
    );
    pool = new Pool({ connectionString: databaseUrl.toString() });

    const raw = JSON.parse(await readFile(packagePath, 'utf8')) as {
      competition: { context: { name: string } };
      season: { context: { name: string } };
      fixtures: Array<{
        sourceId: string;
        context: { date: string; teams: Array<{ context: { name: string } }> };
        innings: Array<{ events: Array<{ eventId: string }> }>;
      }>;
    };
    const fixture = raw.fixtures[0]!;
    identity = {
      competitionName: raw.competition.context.name,
      seasonName: raw.season.context.name,
      fixtureSourceId: fixture.sourceId,
      fixtureSourceRef: fixture.sourceId.split(':', 3)[2]!,
      startDate: fixture.context.date,
      teamNames: [fixture.context.teams[0]!.context.name, fixture.context.teams[1]!.context.name],
      eventIds: fixture.innings.flatMap((innings) => innings.events.map((event) => event.eventId)),
    };

    storageRoot = await mkdtemp(join(tmpdir(), 'issue-708-e2e-'));
    store = new FilesystemObjectStore(storageRoot);
    storage = new BatchPayloadStorageService(
      store,
      createStoredObjectRepository(pool),
      async (requesterId, object) => requesterId === object.ownerId,
    );

    await assertPackageUnused();

    // The two fixture teams must already be canonical records: a v1.1 package
    // cannot introduce a team. This is the "check, do not edit" step the
    // package README asks an operator to do by hand before uploading.
    for (const name of packageIdentity().teamNames) {
      await executeQuery(
        pool,
        `INSERT INTO team (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [name],
      );
    }
    const competition = await executeQuery<{ competitionId: string }>(
      pool,
      `INSERT INTO competition (name) VALUES ($1)
       ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name
       RETURNING competition_id::text AS "competitionId"`,
      [packageIdentity().competitionName],
    );
    const submitter = await executeQuery<{ accountId: string }>(
      pool,
      `INSERT INTO app_user (auth_provider, auth_subject, display_name, application_role,
                             submitter_approval_state)
       VALUES ('test', $1, 'Issue 708 Submitter', 'submitter', 'approved')
       RETURNING app_user_id::text AS "accountId"`,
      [`issue-708-e2e-submitter-${randomUUID()}`],
    );
    const reviewer = await executeQuery<{ accountId: string }>(
      pool,
      `INSERT INTO app_user (auth_provider, auth_subject, display_name, application_role,
                             submitter_approval_state)
       VALUES ('test', $1, 'Issue 708 Reviewer', 'admin', 'approved')
       RETURNING app_user_id::text AS "accountId"`,
      [`issue-708-e2e-reviewer-${randomUUID()}`],
    );
    seeded = {
      competitionId: competition.rows[0]!.competitionId,
      submitterId: submitter.rows[0]!.accountId,
      reviewerId: reviewer.rows[0]!.accountId,
    };
    await executeQuery(
      pool,
      `INSERT INTO submitter_competition_scope (app_user_id, competition_id)
       VALUES ($1::bigint, $2::bigint) ON CONFLICT DO NOTHING`,
      [seeded.submitterId, seeded.competitionId],
    );
  }, 120_000);

  /**
   * The package carries fixed identities and can be used exactly once, which is
   * the property the three packages exist for. A database that already holds
   * its fixture would resolve to that fixture instead of receiving a proposal,
   * and the journey under test would never start — so the run is refused rather
   * than allowed to pass for the wrong reason.
   *
   * There is no cleanup to fall back on: batch and batch_item rows are
   * provenance and a trigger refuses to delete them, and batch_item references
   * innings, so the fixture cannot go either. The disposable PostgreSQL that
   * `npm run test:database` starts is fresh on every run, which is what makes
   * this repeatable.
   */
  async function assertPackageUnused(): Promise<void> {
    const { rows } = await executeQuery<{ count: string }>(
      databasePool(),
      `SELECT count(*)::text AS count FROM fixture WHERE source_ref=$1`,
      [packageIdentity().fixtureSourceRef],
    );
    if (rows[0]!.count !== '0') {
      throw new Error(
        `This database already holds ${packageIdentity().fixtureSourceId}, so ` +
          'onboarding-test-package-run-3.json has already been run against it. Each package is ' +
          'good for a single run: use a fresh database, or add a fourth package as the evidence ' +
          'README describes.',
      );
    }
  }

  afterAll(async () => {
    await pool?.end();
    if (storageRoot) await rm(storageRoot, { recursive: true, force: true });
  });

  test('1. the package is submitted as a batch and validated', async () => {
    // The file's own bytes. Sent as a string rather than a Buffer, which
    // superagent would re-encode as a JSON object of byte values.
    const payload = await readFile(packagePath, 'utf8');

    const response = await request(app('submitter'))
      .post('/api/v1/batches')
      .set('Authorization', 'Bearer test-token')
      .set('X-Competition-Id', seed().competitionId)
      .set('Idempotency-Key', `issue-708-e2e-${randomUUID()}`)
      .set('X-Batch-Package-Version', '1.1')
      .set('X-File-Name', 'onboarding-test-package-run-3.json')
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(response.status).toBe(202);
    state.batchReference = response.body.data.batchReference as string;

    const { rows } = await databasePool().query<{ batchId: string }>(
      `SELECT batch_id::text AS "batchId" FROM batch WHERE batch_reference=$1::uuid`,
      [state.batchReference],
    );
    expect(rows).toHaveLength(1);
    state.batchId = rows[0]!.batchId;

    expect(await drainOutbox()).toBe(1);
  }, 180_000);

  test('2. the batch reaches awaiting_review, not rejected', async () => {
    expect(await batchState()).toBe('awaiting_review');

    const report = await request(app('admin'))
      .get(`/api/v1/batches/${batchReference()}/report`)
      .set('Authorization', 'Bearer test-token');
    expect(report.status).toBe(200);

    // Five deliveries, none acceptable yet: every one names a fixture that
    // does not exist. The batch is held for a reviewer rather than rejected.
    expect(report.body.data.reviewSummary.validation.accepted).toBe(0);
    expect(report.body.data.items).toHaveLength(5);
  }, 120_000);

  test('3. the canonical fixture is created from the proposal', async () => {
    const report = await request(app('admin'))
      .get(`/api/v1/batches/${batchReference()}/report`)
      .set('Authorization', 'Bearer test-token');
    expect(report.status).toBe(200);

    // The same reference the reviewer workspace offers the action on: a
    // fixture reference with no candidate, carrying a v1.1 proposal.
    const items = report.body.data.items as Array<{
      ordinal: number;
      referenceResolutions: Array<{
        referencePath: string;
        entityType: string;
        candidates: unknown[];
        submittedReference: unknown;
      }>;
    }>;
    const proposal = items
      .flatMap((item) =>
        item.referenceResolutions.map((resolution) => ({ ordinal: item.ordinal, resolution })),
      )
      .find(
        (candidate) =>
          candidate.resolution.entityType === 'fixture' &&
          candidate.resolution.candidates.length === 0 &&
          typeof candidate.resolution.submittedReference === 'object' &&
          candidate.resolution.submittedReference !== null &&
          'proposal' in candidate.resolution.submittedReference,
      );
    expect(proposal).toBeDefined();

    // Defect C: this returned 500 five times on the deployed re-run, because
    // closing an onboarding task during the derivation omitted decided_by and
    // the state constraint refused the UPDATE. The whole decision is one
    // transaction, so the fixture was never created.
    const created = await request(app('admin'))
      .post(`/api/v1/batches/${batchReference()}/canonical-fixtures`)
      .set('Authorization', 'Bearer test-token')
      .send({
        itemOrdinal: proposal!.ordinal,
        referencePath: proposal!.resolution.referencePath,
        decisionKey: `create-${batchReference()}-${String(proposal!.ordinal)}-${proposal!.resolution.referencePath}`,
      });

    expect(created.status).toBe(202);

    const { rows } = await databasePool().query<{
      fixtureId: string;
      season: string;
      winnerId: string | null;
    }>(
      `SELECT fixture_id::text AS "fixtureId", season, winner_id::text AS "winnerId"
         FROM fixture WHERE source_ref=$1`,
      [packageIdentity().fixtureSourceRef],
    );
    expect(rows).toHaveLength(1);
    state.fixtureId = rows[0]!.fixtureId;
    expect(rows[0]!.season).toBe(packageIdentity().seasonName);

    // `fixture_winner_ck` requires a winner exactly when the outcome is `won`.
    // The proposal names one, and it is resolved to the fixture's own team.
    const winner = await databasePool().query<{ name: string }>(
      `SELECT name FROM team WHERE team_id=$1::bigint`,
      [rows[0]!.winnerId],
    );
    expect(winner.rows[0]!.name).toBe(packageIdentity().teamNames[0]);

    await drainOutbox();
  }, 180_000);

  test('4. three tasks appear with the expected reasons, and the durable identifier onboards itself', async () => {
    const tasks = await onboardingTasks();

    expect(
      tasks.map((task) => ({ name: task.submittedName, reason: task.reason, state: task.state })),
    ).toEqual([
      {
        name: PARTICIPANTS.unknownIdentifier,
        reason: 'identifier_not_found',
        state: 'outstanding',
      },
      { name: PARTICIPANTS.noIdentifier, reason: 'no_durable_identifier', state: 'outstanding' },
      { name: PARTICIPANTS.unlistedTeam, reason: 'team_not_recognised', state: 'outstanding' },
    ]);

    // The control: a participant carrying a durable registry identifier needs
    // no reviewer decision, so it is never reported as a task at all.
    expect(tasks.some((task) => task.submittedName === PARTICIPANTS.durableIdentifier)).toBe(false);
    const squad = await databasePool().query<{ displayName: string }>(
      `SELECT p.display_name AS "displayName" FROM fixture_squad fs
         JOIN person p ON p.person_id = fs.person_id
        WHERE fs.fixture_id=$1::bigint`,
      [fixtureId()],
    );
    expect(squad.rows.map((row) => row.displayName)).toEqual([PARTICIPANTS.durableIdentifier]);

    // Nine role references across five deliveries, three cards. The
    // deduplication issue #708 asks for.
    expect(tasks).toHaveLength(3);

    state.taskReferences = Object.fromEntries(
      tasks.map((task) => [task.submittedName, task.taskReference]),
    );
  }, 120_000);

  test('5. all three are settled in one array, including one needing an identity and a team', async () => {
    const references = state.taskReferences!;
    const tasks = await onboardingTasks();
    const unlisted = tasks.find((task) => task.submittedName === PARTICIPANTS.unlistedTeam)!;

    // The task the submission gave a team the fixture does not recognise. It
    // needs both halves of an answer at once, and neither can be inferred from
    // the other.
    expect(unlisted.submittedTeamName).toBe('onboarding-test-Unlisted-Wanderers');

    const response = await request(app('admin'))
      .post(`/api/v1/batches/${batchReference()}/participants`)
      .set('Authorization', 'Bearer test-token')
      .send({
        decisionKey: `onboard-${batchReference()}-1`,
        decisions: [
          {
            taskReference: references[PARTICIPANTS.noIdentifier],
            sourceId: 'cricsheet:participant:onboarding-test-priya-1',
          },
          {
            taskReference: references[PARTICIPANTS.unknownIdentifier],
            sourceId: 'cricsheet:participant:onboarding-test-lerato-1',
          },
          // Defect A at the contract boundary: an identity and a team in one
          // decision, for a task the interface used to offer no team control on.
          {
            taskReference: references[PARTICIPANTS.unlistedTeam],
            sourceId: 'cricsheet:participant:onboarding-test-sipho-1',
            teamName: packageIdentity().teamNames[0],
          },
        ],
      });

    expect(response.status).toBe(202);
    expect(response.body.data.onboarded).toBe(3);
    expect(response.body.data.alreadyOnboarded).toBe(0);
    expect(response.body.data.revalidationQueued).toBe(true);

    const settled = await onboardingTasks();
    expect(settled.every((task) => task.state === 'onboarded')).toBe(true);
    expect(settled.every((task) => task.decidedBy === seed().reviewerId)).toBe(true);

    // The reviewer's team, not the one the submission carried.
    const unlistedTask = settled.find((task) => task.submittedName === PARTICIPANTS.unlistedTeam)!;
    const placed = await databasePool().query<{ teamName: string }>(
      `SELECT t.name AS "teamName" FROM fixture_squad fs
         JOIN team t ON t.team_id = fs.team_id
        WHERE fs.fixture_id=$1::bigint AND fs.person_id=$2::bigint`,
      [fixtureId(), unlistedTask.personId],
    );
    expect(placed.rows[0]!.teamName).toBe(packageIdentity().teamNames[0]);

    // The person a decision creates carries the submitted name, not the
    // registry key. It is what the squad is matched by, so it decides whether
    // the references that used that name can ever resolve.
    const created = await databasePool().query<{ displayName: string; sourceRef: string }>(
      `SELECT display_name AS "displayName", source_ref AS "sourceRef"
         FROM person WHERE person_id=$1::bigint`,
      [unlistedTask.personId],
    );
    expect(created.rows[0]!.displayName).toBe(PARTICIPANTS.unlistedTeam);
    expect(created.rows[0]!.sourceRef).toBe('onboarding-test-sipho-1');

    // A name is still not a resolution key: nothing writes an alias for a
    // submitted name, so no name gained matching power anywhere.
    const aliases = await databasePool().query<{ count: string }>(
      `SELECT count(*)::text AS count FROM person_alias`,
    );
    expect(aliases.rows[0]!.count).toBe('0');
  }, 180_000);

  test('6. revalidation leaves every settled task settled', async () => {
    // Defect B: on the deployed run two settled tasks came back as outstanding
    // on the next pass while the squad rows they created stayed. Both writers
    // run here — the backend derivation and the worker's
    // persistReviewerActionableOnboardingTasks, which is where it returned.
    expect(await drainOutbox()).toBeGreaterThanOrEqual(1);

    const tasks = await onboardingTasks();
    expect(tasks).toHaveLength(3);
    expect(tasks.every((task) => task.state === 'onboarded')).toBe(true);
    expect(tasks.every((task) => task.personId !== null)).toBe(true);
    expect(tasks.every((task) => task.decidedBy === seed().reviewerId)).toBe(true);

    const outstanding = await databasePool().query<{ count: string }>(
      `SELECT count(*)::text AS count FROM batch_participant_onboarding_task
        WHERE batch_id=$1::bigint AND state='outstanding'`,
      [batchId()],
    );
    expect(outstanding.rows[0]!.count).toBe('0');
  }, 180_000);

  test('7. the participant references resolve and the items become acceptable', async () => {
    const report = await request(app('admin'))
      .get(`/api/v1/batches/${batchReference()}/report`)
      .set('Authorization', 'Bearer test-token');
    expect(report.status).toBe(200);

    const items = report.body.data.items as Array<{
      outcome: string;
      referenceResolutions: Array<{ entityType: string; referencePath: string }>;
    }>;

    const unresolvedParticipants = items.flatMap((item) =>
      item.referenceResolutions
        .filter((resolution) => resolution.entityType === 'participant')
        .map((resolution) => resolution.referencePath),
    );
    expect(unresolvedParticipants).toEqual([]);

    /*
     * How each one resolved, because the two settled cases resolve by
     * different mechanisms and only one of them needed the override.
     *
     * A participant submitted as a name resolves by squad-scoped exact name,
     * the platform's ordinary rule, now that the person the decision created
     * carries that name. A participant submitted with an identifier naming
     * nobody can never be name-matched and would resolve by nothing at all, so
     * it resolves by the reviewer's own recorded mapping.
     */
    const stored = await databasePool().query<{ resolvedReferences: unknown }>(
      `SELECT resolved_references AS "resolvedReferences" FROM batch_item
        WHERE batch_id=$1::bigint ORDER BY ordinal`,
      [batchId()],
    );
    const matchedBy: Record<string, number> = {};
    const visit = (value: unknown): void => {
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) {
        for (const nested of value) visit(nested);
        return;
      }
      const record = value as Record<string, unknown>;
      if (record.entityType === 'participant' && typeof record.matchedBy === 'string') {
        matchedBy[record.matchedBy] = (matchedBy[record.matchedBy] ?? 0) + 1;
        return;
      }
      for (const nested of Object.values(record)) visit(nested);
    };
    for (const row of stored.rows) visit(row.resolvedReferences);

    expect(matchedBy).toEqual({
      // Thandi's five references: the durable identifier the package carried,
      // which needed no decision at all.
      'source-identifier': 5,
      // Priya's five and Sipho's three, by name within the fixture squad —
      // the platform's ordinary rule, reached because the person each
      // decision created carries the submitted name.
      'exact-name': 8,
      // Lerato's two. A submitted identifier naming nobody can never be
      // name-matched, so these resolve by the reviewer's recorded mapping and
      // by nothing else.
      manual: 2,
    });

    expect(items.map((item) => item.outcome)).toEqual([
      'accepted',
      'accepted',
      'accepted',
      'accepted',
      'accepted',
    ]);
    expect(report.body.data.reviewSummary.validation.accepted).toBe(5);
    expect(await batchState()).toBe('awaiting_review');
  }, 120_000);

  test('8. approval publishes the deliveries, and fixture statistics derive', async () => {
    const approved = await request(app('admin'))
      .post(`/api/v1/batches/${batchReference()}/review`)
      .set('Authorization', 'Bearer test-token')
      .send({ decision: 'approved', reason: 'Issue #708 local end-to-end verification.' });
    expect(approved.status).toBe(200);

    expect(await drainOutbox()).toBeGreaterThanOrEqual(1);
    expect(await batchState()).toBe('published');

    const deliveries = await databasePool().query<{ count: string }>(
      `SELECT count(*)::text AS count FROM delivery d
         JOIN innings i ON i.innings_id = d.innings_id
        WHERE i.fixture_id=$1::bigint AND d.superseded_by IS NULL`,
      [fixtureId()],
    );
    expect(deliveries.rows[0]!.count).toBe(String(packageIdentity().eventIds.length));

    const source = await loadFixtureStatisticsSource(fixtureId(), databasePool());
    expect(source).not.toBeNull();
    const statistics = deriveFixtureStatistics(source!, { includeContributors: true });

    const teamTotals = statistics.statistics
      .filter((statistic) => statistic.scope === 'innings')
      .sort((left, right) => left.inningsOrdinal - right.inningsOrdinal);
    expect(teamTotals).toHaveLength(2);

    // The five deliveries the package carries: 1 off the bat, 1 wide, then 4,
    // in the first innings; 2 then 0 in the second.
    expect(teamTotals.map((statistic) => statistic.metrics.totalRuns)).toEqual([6, 2]);
    expect(teamTotals.map((statistic) => statistic.competitorName)).toEqual(
      packageIdentity().teamNames,
    );

    // Every participant the package named now carries fixture statistics of
    // its own, the three settled by decision included.
    const participants = statistics.statistics
      .filter((statistic) => statistic.scope === 'participant')
      .map((statistic) => statistic.participantName);
    expect(new Set(participants)).toEqual(new Set(Object.values(PARTICIPANTS)));
  }, 180_000);
});
