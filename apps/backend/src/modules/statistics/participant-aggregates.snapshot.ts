import type { Pool, PoolClient } from 'pg';

import { executeQuery, getDatabasePool, type QueryExecutor } from '../../database';
import type {
  ParticipantAggregateRow,
  ParticipantAggregatesSource,
} from './participant-aggregates.model';
import {
  loadParticipantAggregatesSource,
  participantAggregatesDefinitionVersion,
} from './participant-aggregates.repository';

/**
 * Stored participant aggregate rows (issue #592).
 *
 * Delivery rows remain the source of truth. A participant's stored rows are
 * served only while their snapshot state was built from the participant's
 * current `participant_statistics_version` under the running definition
 * version; in every other case the aggregates are derived live.
 *
 * Refresh is selective: a change recomputes each affected participant's query
 * once and rewrites only the affected scope rows; unaffected participants are
 * not recomputed and their rows stay byte-identical. Within one participant the
 * whole query runs once; a scope row whose figures did not change is left
 * untouched.
 */

interface ParticipantAggregateSnapshotRead {
  participantId: string;
  participantName: string;
  /**
   * The participant's current statistics data version, read before any live
   * derivation. Null when no tracked write has affected the participant, in
   * which case stored rows are never served or written.
   */
  dataVersion: number | null;
  /** The stored rows when they are current; otherwise null. */
  rows: ParticipantAggregateRow[] | null;
}

/**
 * - `refreshed`: the state row and every changed scope row were written.
 * - `current`: the stored rows were already current; nothing was written.
 * - `stale`: the participant's version moved after it was read; nothing was written.
 * - `busy`: another refresh holds the lease, or a row lock was not immediately
 *   available; nothing was written.
 * - `untracked`: the participant has no statistics version; nothing was written.
 */
type ParticipantAggregateSnapshotWrite = 'refreshed' | 'current' | 'stale' | 'busy' | 'untracked';

export interface ParticipantAggregateSnapshotStore {
  /** Returns null when the participant does not exist. */
  read(participantId: string): Promise<ParticipantAggregateSnapshotRead | null>;
  /**
   * Stores rows derived after `dataVersion` was read. Never waits for a lock:
   * when the lease or a row lock is held elsewhere it writes nothing.
   */
  write(
    participantId: string,
    dataVersion: number,
    rows: readonly ParticipantAggregateRow[],
  ): Promise<ParticipantAggregateSnapshotWrite>;
  /** Records a failed refresh attempt. Best effort: it never throws. */
  recordFailure(participantId: string, error: unknown): Promise<void>;
}

const lockNotAvailable = '55P03';
const maximumErrorLength = 500;

/** The scope key of a grouped row: its level, and its competition and season where grouped. */
export function participantAggregateScopeKey(row: ParticipantAggregateRow): string {
  const competition = row.competitionId ?? 'none';
  if (row.seasonGrouped) {
    return `season:${competition}:${row.season ?? ''}`;
  }
  return row.competitionGrouped ? `competition:${competition}` : 'career';
}

function isLockNotAvailable(error: unknown): boolean {
  const code =
    (error as { code?: unknown; cause?: { code?: unknown } } | null)?.code ??
    (error as { cause?: { code?: unknown } } | null)?.cause?.code;
  return code === lockNotAvailable;
}

async function inTransaction<T>(
  pool: Pool,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Any implicit row lock that is not free at once aborts the refresh rather
    // than delaying the read that triggered it.
    await client.query(`SET LOCAL lock_timeout = '1ms'`);
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/** Takes the participant's refresh lease for this transaction, without waiting. */
async function tryTakeLease(client: PoolClient, participantId: string): Promise<boolean> {
  const result = await client.query<{ acquired: boolean }>(
    `SELECT pg_try_advisory_xact_lock(
       hashtextextended('participant-aggregate-snapshot:' || $1::bigint::text, 0)
     ) AS acquired`,
    [participantId],
  );
  return result.rows[0]?.acquired === true;
}

/** Ends the transaction without writing and reports why. */
class NoWrite extends Error {
  constructor(readonly outcome: Exclude<ParticipantAggregateSnapshotWrite, 'refreshed'>) {
    super(outcome);
  }
}

export function createParticipantAggregateSnapshotStore(
  pool?: Pool,
): ParticipantAggregateSnapshotStore {
  const database = () => pool ?? getDatabasePool();

  return {
    async read(participantId) {
      const result = await executeQuery<{
        participantId: string;
        participantName: string;
        dataVersion: string | null;
        rows: ParticipantAggregateRow[] | null;
      }>(
        database(),
        `
          SELECT
            person.person_id::text AS "participantId",
            person.display_name AS "participantName",
            version.data_version::text AS "dataVersion",
            CASE
              WHEN state.data_version = version.data_version
               AND state.definition_version = $2
              THEN (
                SELECT COALESCE(
                  jsonb_agg(
                    snapshot.payload
                    ORDER BY
                      (snapshot.payload->>'competitionGrouped')::boolean DESC,
                      (snapshot.payload->>'seasonGrouped')::boolean DESC,
                      (snapshot.payload->>'competitionId')::bigint ASC NULLS LAST,
                      snapshot.payload->>'season' ASC
                  ),
                  '[]'::jsonb
                )
                FROM participant_aggregate_snapshot snapshot
                WHERE snapshot.participant_id = person.person_id
              )
            END AS rows
          FROM person
          LEFT JOIN participant_statistics_version version
            ON version.participant_id = person.person_id
          LEFT JOIN participant_aggregate_snapshot_state state
            ON state.participant_id = person.person_id
          WHERE person.person_id = $1::bigint
        `,
        [participantId, participantAggregatesDefinitionVersion],
      );
      const row = result.rows[0];
      if (!row) {
        return null;
      }

      return {
        participantId: row.participantId,
        participantName: row.participantName,
        dataVersion: row.dataVersion === null ? null : Number(row.dataVersion),
        rows: row.dataVersion === null ? null : row.rows,
      };
    },

    async write(participantId, dataVersion, rows) {
      try {
        return await inTransaction(database(), async (client) => {
          if (!(await tryTakeLease(client, participantId))) {
            throw new NoWrite('busy');
          }

          // Holding a share lock on the version row until commit means the rows
          // cannot be stored against a version a concurrent write has advanced.
          const version = await client.query<{ dataVersion: string }>(
            `SELECT data_version::text AS "dataVersion"
             FROM participant_statistics_version
             WHERE participant_id = $1::bigint
             FOR SHARE NOWAIT`,
            [participantId],
          );
          const currentVersion = version.rows[0]?.dataVersion;
          if (currentVersion === undefined) {
            throw new NoWrite('untracked');
          }
          if (Number(currentVersion) !== dataVersion) {
            throw new NoWrite('stale');
          }

          const state = await client.query<{ current: boolean }>(
            `SELECT (data_version = $2 AND definition_version = $3) AS current
             FROM participant_aggregate_snapshot_state
             WHERE participant_id = $1::bigint
             FOR UPDATE NOWAIT`,
            [participantId, dataVersion, participantAggregatesDefinitionVersion],
          );
          if (state.rows[0]?.current === true) {
            throw new NoWrite('current');
          }

          await client.query(
            `INSERT INTO participant_aggregate_snapshot_state (
               participant_id, data_version, definition_version, refresh_count, refreshed_at,
               attempt_count, last_error
             )
             VALUES ($1::bigint, $2, $3, 1, now(), 0, NULL)
             ON CONFLICT (participant_id) DO UPDATE
             SET data_version = EXCLUDED.data_version,
                 definition_version = EXCLUDED.definition_version,
                 refresh_count = participant_aggregate_snapshot_state.refresh_count + 1,
                 refreshed_at = now(),
                 attempt_count = 0,
                 last_error = NULL`,
            [participantId, dataVersion, participantAggregatesDefinitionVersion],
          );

          const scopeRows = rows.map((row) => ({
            key: participantAggregateScopeKey(row),
            payload: row,
          }));
          await client.query(
            `DELETE FROM participant_aggregate_snapshot
             WHERE participant_id = $1::bigint
               AND NOT (scope_key = ANY($2::text[]))`,
            [participantId, scopeRows.map((row) => row.key)],
          );
          // A row whose figures did not change is not rewritten, so its bytes,
          // versions and refresh count stay exactly as they were.
          await client.query(
            `INSERT INTO participant_aggregate_snapshot AS snapshot (
               participant_id, scope_key, payload, data_version, definition_version
             )
             SELECT $1::bigint, source.key, source.payload, $2, $3
             FROM jsonb_to_recordset($4::jsonb) AS source(key text, payload jsonb)
             ON CONFLICT (participant_id, scope_key) DO UPDATE
             SET payload = EXCLUDED.payload,
                 data_version = EXCLUDED.data_version,
                 definition_version = EXCLUDED.definition_version,
                 refresh_count = snapshot.refresh_count + 1,
                 refreshed_at = now()
             WHERE snapshot.payload IS DISTINCT FROM EXCLUDED.payload`,
            [
              participantId,
              dataVersion,
              participantAggregatesDefinitionVersion,
              JSON.stringify(scopeRows),
            ],
          );

          return 'refreshed' as const;
        });
      } catch (error) {
        if (error instanceof NoWrite) {
          return error.outcome;
        }
        if (isLockNotAvailable(error)) {
          return 'busy';
        }
        throw error;
      }
    },

    async recordFailure(participantId, error) {
      const message = (error instanceof Error ? error.message : String(error)).slice(
        0,
        maximumErrorLength,
      );
      try {
        await inTransaction(database(), async (client) => {
          if (!(await tryTakeLease(client, participantId))) {
            return;
          }
          await client.query(
            `INSERT INTO participant_aggregate_snapshot_state (participant_id, attempt_count, last_error)
             VALUES ($1::bigint, 1, $2)
             ON CONFLICT (participant_id) DO UPDATE
             SET attempt_count = participant_aggregate_snapshot_state.attempt_count + 1,
                 last_error = EXCLUDED.last_error`,
            [participantId, message],
          );
        });
      } catch {
        // Recording an attempt must never turn a failed refresh into a failed read.
      }
    },
  };
}

export type ParticipantAggregateRefreshOutcome =
  ParticipantAggregateSnapshotWrite | 'absent' | 'failed';

export interface RefreshParticipantAggregateSnapshotsOptions {
  store?: ParticipantAggregateSnapshotStore;
  loadSource?: (participantId: string) => Promise<ParticipantAggregatesSource | null>;
}

/**
 * Refreshes the stored rows of each listed participant whose rows are not
 * current. A participant whose rows are current is not recomputed. A failure
 * for one participant is recorded and does not stop the others; running the
 * refresh again retries it.
 */
export async function refreshParticipantAggregateSnapshots(
  participantIds: readonly string[],
  options: RefreshParticipantAggregateSnapshotsOptions = {},
): Promise<Map<string, ParticipantAggregateRefreshOutcome>> {
  const store = options.store ?? createParticipantAggregateSnapshotStore();
  const loadSource = options.loadSource ?? loadParticipantAggregatesSource;
  const outcomes = new Map<string, ParticipantAggregateRefreshOutcome>();

  for (const participantId of participantIds) {
    try {
      const snapshot = await store.read(participantId);
      if (!snapshot) {
        outcomes.set(participantId, 'absent');
      } else if (snapshot.dataVersion === null) {
        outcomes.set(participantId, 'untracked');
      } else if (snapshot.rows !== null) {
        outcomes.set(participantId, 'current');
      } else {
        const source = await loadSource(participantId);
        outcomes.set(
          participantId,
          source ? await store.write(participantId, snapshot.dataVersion, source.rows) : 'absent',
        );
      }
    } catch (error) {
      await store.recordFailure(participantId, error);
      outcomes.set(participantId, 'failed');
    }
  }

  return outcomes;
}

/**
 * Deletes every stored participant aggregate snapshot. Any write to aggregate
 * inputs that does not advance participant statistics versions (a
 * data-rewriting migration, a seed that bypasses ingest, a manual repair) must
 * call this, or run `SELECT invalidate_participant_aggregate_snapshots()`, in
 * the same transaction.
 */
export async function invalidateParticipantAggregateSnapshots(
  executor: QueryExecutor,
): Promise<number> {
  const result = await executeQuery<{ invalidated: string }>(
    executor,
    'SELECT invalidate_participant_aggregate_snapshots()::text AS invalidated',
  );
  return Number(result.rows[0]?.invalidated ?? 0);
}
