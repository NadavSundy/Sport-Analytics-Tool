import { randomUUID } from 'node:crypto';

import { executeQuery, getDatabasePool, withTransaction, type QueryExecutor } from '../../database';

type BatchState =
  | 'received'
  | 'stored'
  | 'validating'
  | 'rejected'
  | 'awaiting_review'
  | 'publishing'
  | 'published'
  | 'partially_published'
  | 'failed'
  | 'superseded';

type BatchItemState = 'pending' | 'accepted' | 'rejected' | 'published' | 'duplicate_skipped';

type BatchCheckpointPhase = 'validating' | 'publishing';
type BatchReferenceResolutionState = 'unresolved' | 'resolved' | 'ambiguous' | 'invalid';
type BatchValidationSeverity = 'error' | 'warning';
type BatchReviewDecisionKind = 'approved' | 'rejected';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

interface BatchSource {
  checksum: string;
  uri: string;
  sizeBytes: number;
}

interface BatchRecord {
  batchId: string;
  batchReference: string;
  submitterId: string;
  competitionId: string;
  idempotencyKey: string;
  packageVersion: string;
  source: BatchSource | null;
  state: BatchState;
  itemCount: number;
  supersededBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CreateBatchInput {
  batchReference: string;
  submitterId: string;
  competitionId: string;
  idempotencyKey: string;
  packageVersion?: string;
  source?: BatchSource;
  state?: BatchState;
}

interface InsertBatchItemInput {
  ordinal: number;
  inningsId?: string | null;
  overNumber: number;
  positionInOver: number;
  payload: JsonValue;
  sourceIdentity?: string | null;
  sourceLocation?: JsonValue | null;
  referenceResolutionState?: BatchReferenceResolutionState;
  resolvedReferences?: JsonValue | null;
  state?: BatchItemState;
  rejectionCode?: string | null;
  rejectionDetail?: JsonValue | null;
  publishedEventId?: string | null;
}

interface BatchItemRecord {
  batchItemId: string;
  batchId: string;
  ordinal: number;
  inningsId: string | null;
  overNumber: number;
  positionInOver: number;
  payload: JsonValue;
  sourceIdentity: string | null;
  sourceLocation: JsonValue | null;
  referenceResolutionState: BatchReferenceResolutionState;
  resolvedReferences: JsonValue | null;
  state: BatchItemState;
  rejectionCode: string | null;
  rejectionDetail: JsonValue | null;
  publishedEventId: string | null;
}

interface BatchProgressRecord {
  total: number;
  processed: number;
  accepted: number;
  rejected: number;
}

interface BatchItemPageOptions {
  afterOrdinal?: number;
  limit: number;
}
interface BatchCheckpointRecord {
  batchId: string;
  phase: BatchCheckpointPhase;
  lastOrdinal: number;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
  attemptCount: number;
}

interface UpsertBatchCheckpointInput {
  batchId: string;
  phase: BatchCheckpointPhase;
  lastOrdinal: number;
  leaseOwner?: string | null;
  leaseExpiresAt?: string | null;
  attemptCount: number;
}

interface ValidationResultInput {
  batchId: string;
  batchItemId?: string | null;
  sourceOrdinal?: number | null;
  ruleCode: string;
  ruleVersion: string;
  severity: BatchValidationSeverity;
  filePath?: string | null;
  rowNumber?: number | null;
  fieldPath?: string | null;
  message: string;
}

interface ReviewDecisionInput {
  batchId: string;
  actorId: string;
  decision: BatchReviewDecisionKind;
  reason?: string | null;
}

/**
 * The outcome of resolving one staged item's references.
 *
 * `inningsId` stays null while the reference is unresolved, ambiguous or
 * invalid. `batch_item.innings_id` is nullable for exactly that reason, so that
 * an actionable record is retained without a placeholder canonical identifier.
 */
interface ReferenceResolutionUpdate {
  batchItemId: string;
  inningsId: string | null;
  sourceIdentity: string | null;
  referenceResolutionState: BatchReferenceResolutionState;
  resolvedReferences: JsonValue | null;
}

export interface BatchRepository {
  createBatch(input: CreateBatchInput): Promise<BatchRecord>;
  createBatchAndQueueValidation(input: CreateBatchInput): Promise<BatchRecord>;
  findBatchById(batchId: string): Promise<BatchRecord | null>;
  findBatchByIdempotencyKey(
    submitterId: string,
    idempotencyKey: string,
  ): Promise<BatchRecord | null>;
  findBatchByReference(batchReference: string): Promise<BatchRecord | null>;
  countNonTerminalBatches(submitterId: string): Promise<number>;
  getBatchProgress(batchId: string): Promise<BatchProgressRecord>;
  insertBatchItems(batchId: string, items: InsertBatchItemInput[]): Promise<BatchItemRecord[]>;
  listBatchItems(batchId: string, options: BatchItemPageOptions): Promise<BatchItemRecord[]>;
  findCheckpoint(
    batchId: string,
    phase: BatchCheckpointPhase,
  ): Promise<BatchCheckpointRecord | null>;
  upsertCheckpoint(input: UpsertBatchCheckpointInput): Promise<BatchCheckpointRecord>;
  recordValidationResult(input: ValidationResultInput): Promise<void>;
  recordReviewDecision(input: ReviewDecisionInput): Promise<void>;
  applyReferenceResolution(updates: ReferenceResolutionUpdate[]): Promise<BatchItemRecord[]>;
  linkPublishedDelivery(batchItemId: string, deliveryId: string): Promise<void>;
}

interface BatchRow {
  batchId: string;
  batchReference: string;
  submitterId: string;
  competitionId: string;
  idempotencyKey: string;
  packageVersion: string;
  sourceChecksum: string | null;
  sourceUri: string | null;
  sourceSizeBytes: string | null;
  state: BatchState;
  itemCount: number;
  supersededBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface BatchCheckpointRow {
  batchId: string;
  phase: BatchCheckpointPhase;
  lastOrdinal: number;
  leaseOwner: string | null;
  leaseExpiresAt: Date | null;
  attemptCount: number;
}

const batchSelection = `
  batch_id::text AS "batchId",
  batch_reference::text AS "batchReference",
  submitter_id::text AS "submitterId",
  competition_id::text AS "competitionId",
  idempotency_key AS "idempotencyKey",
  package_version AS "packageVersion",
  source_checksum AS "sourceChecksum",
  source_uri AS "sourceUri",
  source_size_bytes::text AS "sourceSizeBytes",
  state::text AS state,
  item_count AS "itemCount",
  superseded_by::text AS "supersededBy",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

const batchItemSelection = `
  batch_item_id::text AS "batchItemId",
  batch_id::text AS "batchId",
  ordinal,
  innings_id::text AS "inningsId",
  over_number AS "overNumber",
  position_in_over AS "positionInOver",
  payload,
  source_identity AS "sourceIdentity",
  source_location AS "sourceLocation",
  reference_resolution_state::text AS "referenceResolutionState",
  resolved_references AS "resolvedReferences",
  state::text AS state,
  rejection_code AS "rejectionCode",
  rejection_detail AS "rejectionDetail",
  published_event_id::text AS "publishedEventId"
`;

const checkpointSelection = `
  batch_id::text AS "batchId",
  phase::text AS phase,
  last_ordinal AS "lastOrdinal",
  lease_owner AS "leaseOwner",
  lease_expires_at AS "leaseExpiresAt",
  attempt_count AS "attemptCount"
`;

function mapBatch(row: BatchRow): BatchRecord {
  const source =
    row.sourceChecksum && row.sourceUri && row.sourceSizeBytes
      ? {
          checksum: row.sourceChecksum,
          uri: row.sourceUri,
          sizeBytes: Number(row.sourceSizeBytes),
        }
      : null;

  return {
    batchId: row.batchId,
    batchReference: row.batchReference,
    submitterId: row.submitterId,
    competitionId: row.competitionId,
    idempotencyKey: row.idempotencyKey,
    packageVersion: row.packageVersion,
    source,
    state: row.state,
    itemCount: row.itemCount,
    supersededBy: row.supersededBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapCheckpoint(row: BatchCheckpointRow): BatchCheckpointRecord {
  return {
    ...row,
    leaseExpiresAt: row.leaseExpiresAt?.toISOString() ?? null,
  };
}

function requireRow<Row>(row: Row | undefined, operation: string): Row {
  if (!row) {
    throw new Error(`${operation} returned no record`);
  }

  return row;
}

export function createBatchRepository(executor?: QueryExecutor): BatchRepository {
  function database(): QueryExecutor {
    return executor ?? getDatabasePool();
  }

  async function insertBatch(target: QueryExecutor, input: CreateBatchInput): Promise<BatchRecord> {
    const result = await executeQuery<BatchRow>(
      target,
      `
        INSERT INTO batch (
          batch_reference,
          submitter_id,
          competition_id,
          idempotency_key,
          package_version,
          source_checksum,
          source_uri,
          source_size_bytes,
          state
        )
        VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING ${batchSelection}
      `,
      [
        input.batchReference,
        input.submitterId,
        input.competitionId,
        input.idempotencyKey,
        input.packageVersion ?? '1.0',
        input.source?.checksum ?? null,
        input.source?.uri ?? null,
        input.source?.sizeBytes ?? null,
        input.state ?? 'received',
      ],
    );

    return mapBatch(requireRow(result.rows[0], 'Batch insertion'));
  }

  async function insertBatchAndValidationJob(
    target: QueryExecutor,
    input: CreateBatchInput,
  ): Promise<BatchRecord> {
    const batch = await insertBatch(target, input);
    const jobId = randomUUID();
    const outboxMessageId = randomUUID();

    await executeQuery(
      target,
      `
        INSERT INTO background_job (
          job_id, job_type, contract_version, idempotency_key, owner_id, batch_id
        )
        VALUES ($1::uuid, 'batch.validate', 1, $2, $3::bigint, $4::bigint)
      `,
      [jobId, `batch.validate:${batch.batchId}`, batch.submitterId, batch.batchId],
    );

    await executeQuery(
      target,
      `
        INSERT INTO outbox_message (
          outbox_message_id, job_id, message_type, contract_version, body
        )
        VALUES (
          $1::uuid,
          $2::uuid,
          'batch.validate',
          1,
          jsonb_build_object(
            'type', 'batch.validate',
            'version', 1,
            'commandId', $2::text,
            'jobId', $2::text,
            'batchId', $3::text,
            'batchReference', $4::text
          )
        )
      `,
      [outboxMessageId, jobId, batch.batchId, batch.batchReference],
    );

    await executeQuery(
      target,
      `
        INSERT INTO batch_state_transition (
          batch_id, from_state, to_state, actor_kind, actor_identifier, reason
        )
        VALUES ($1::bigint, NULL, $2::batch_state, 'api', $3, $4)
      `,
      [
        batch.batchId,
        batch.state,
        batch.submitterId,
        'Payload stored and asynchronous validation queued.',
      ],
    );

    return batch;
  }

  async function findBatch(where: string, values: unknown[]): Promise<BatchRecord | null> {
    const result = await executeQuery<BatchRow>(
      database(),
      `SELECT ${batchSelection} FROM batch WHERE ${where}`,
      values,
    );

    return result.rows[0] ? mapBatch(result.rows[0]) : null;
  }

  return {
    createBatch(input) {
      return insertBatch(database(), input);
    },

    createBatchAndQueueValidation(input) {
      if (executor) {
        // A caller-owned executor is already inside the caller's transaction.
        return insertBatchAndValidationJob(executor, input);
      }

      return withTransaction(getDatabasePool(), (client) =>
        insertBatchAndValidationJob(client, input),
      );
    },

    findBatchById(batchId) {
      return findBatch('batch_id = $1::bigint', [batchId]);
    },

    findBatchByIdempotencyKey(submitterId, idempotencyKey) {
      return findBatch('submitter_id = $1::bigint AND idempotency_key = $2', [
        submitterId,
        idempotencyKey,
      ]);
    },

    findBatchByReference(batchReference) {
      return findBatch('batch_reference = $1::uuid', [batchReference]);
    },

    async countNonTerminalBatches(submitterId) {
      const result = await executeQuery<{ count: string }>(
        database(),
        `SELECT count(*)::text AS count FROM batch
         WHERE submitter_id = $1::bigint
           AND state NOT IN ('rejected', 'published', 'partially_published', 'superseded')`,
        [submitterId],
      );
      return Number(result.rows[0]?.count ?? 0);
    },

    async getBatchProgress(batchId) {
      const result = await executeQuery<{
        total: number;
        processed: number;
        accepted: string;
        rejected: string;
      }>(
        database(),
        `
          SELECT
            b.item_count AS total,
            LEAST(
              b.item_count,
              GREATEST(0, COALESCE(c.last_ordinal, -1) + 1)
            ) AS processed,
            count(i.batch_item_id) FILTER (WHERE i.state = 'accepted')::text AS accepted,
            count(i.batch_item_id) FILTER (WHERE i.state = 'rejected')::text AS rejected
          FROM batch b
          LEFT JOIN batch_checkpoint c
            ON c.batch_id = b.batch_id AND c.phase = 'validating'
          LEFT JOIN batch_item i ON i.batch_id = b.batch_id
          WHERE b.batch_id = $1::bigint
          GROUP BY b.batch_id, b.item_count, c.last_ordinal
        `,
        [batchId],
      );
      const row = result.rows[0];
      return {
        total: row?.total ?? 0,
        processed: row?.processed ?? 0,
        accepted: Number(row?.accepted ?? 0),
        rejected: Number(row?.rejected ?? 0),
      };
    },

    async insertBatchItems(batchId, items) {
      if (items.length === 0) {
        return [];
      }

      const values: unknown[] = [batchId];
      const tuples = items.map((item) => {
        const first = values.length + 1;
        values.push(
          item.ordinal,
          item.inningsId ?? null,
          item.overNumber,
          item.positionInOver,
          JSON.stringify(item.payload),
          item.sourceIdentity ?? null,
          item.sourceLocation === undefined || item.sourceLocation === null
            ? null
            : JSON.stringify(item.sourceLocation),
          item.referenceResolutionState ?? 'resolved',
          item.resolvedReferences === undefined || item.resolvedReferences === null
            ? null
            : JSON.stringify(item.resolvedReferences),
          item.state ?? 'pending',
          item.rejectionCode ?? null,
          item.rejectionDetail === undefined || item.rejectionDetail === null
            ? null
            : JSON.stringify(item.rejectionDetail),
          item.publishedEventId ?? null,
        );

        return `(
          $1::bigint,
          $${first}::integer,
          $${first + 1}::bigint,
          $${first + 2}::smallint,
          $${first + 3}::smallint,
          $${first + 4}::jsonb,
          $${first + 5}::text,
          $${first + 6}::jsonb,
          $${first + 7}::batch_reference_resolution_state,
          $${first + 8}::jsonb,
          $${first + 9}::batch_item_state,
          $${first + 10}::text,
          $${first + 11}::jsonb,
          $${first + 12}::bigint
        )`;
      });

      const result = await executeQuery<BatchItemRecord>(
        database(),
        `
          INSERT INTO batch_item (
            batch_id,
            ordinal,
            innings_id,
            over_number,
            position_in_over,
            payload,
            source_identity,
            source_location,
            reference_resolution_state,
            resolved_references,
            state,
            rejection_code,
            rejection_detail,
            published_event_id
          )
          VALUES ${tuples.join(',')}
          RETURNING ${batchItemSelection}
        `,
        values,
      );

      return result.rows.sort((left, right) => left.ordinal - right.ordinal);
    },

    async listBatchItems(batchId, options) {
      const result = await executeQuery<BatchItemRecord>(
        database(),
        `
          SELECT ${batchItemSelection}
          FROM batch_item
          WHERE batch_id = $1::bigint
            AND ordinal > $2::integer
          ORDER BY ordinal ASC
          LIMIT $3::integer
        `,
        [batchId, options.afterOrdinal ?? -1, options.limit],
      );

      return result.rows;
    },

    async findCheckpoint(batchId, phase) {
      const result = await executeQuery<BatchCheckpointRow>(
        database(),
        `
          SELECT ${checkpointSelection}
          FROM batch_checkpoint
          WHERE batch_id = $1::bigint AND phase = $2::batch_checkpoint_phase
        `,
        [batchId, phase],
      );

      return result.rows[0] ? mapCheckpoint(result.rows[0]) : null;
    },

    async upsertCheckpoint(input) {
      const result = await executeQuery<BatchCheckpointRow>(
        database(),
        `
          INSERT INTO batch_checkpoint (
            batch_id,
            phase,
            last_ordinal,
            lease_owner,
            lease_expires_at,
            attempt_count
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (batch_id, phase) DO UPDATE SET
            last_ordinal = EXCLUDED.last_ordinal,
            lease_owner = EXCLUDED.lease_owner,
            lease_expires_at = EXCLUDED.lease_expires_at,
            attempt_count = EXCLUDED.attempt_count
          RETURNING ${checkpointSelection}
        `,
        [
          input.batchId,
          input.phase,
          input.lastOrdinal,
          input.leaseOwner ?? null,
          input.leaseExpiresAt ?? null,
          input.attemptCount,
        ],
      );

      return mapCheckpoint(requireRow(result.rows[0], 'Batch checkpoint upsert'));
    },

    async recordValidationResult(input) {
      await executeQuery(
        database(),
        `
          INSERT INTO batch_validation_result (
            batch_id, batch_item_id, source_ordinal, rule_code, rule_version,
            severity, file_path, row_number, field_path, message
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT DO NOTHING
        `,
        [
          input.batchId,
          input.batchItemId ?? null,
          input.sourceOrdinal ?? null,
          input.ruleCode,
          input.ruleVersion,
          input.severity,
          input.filePath ?? null,
          input.rowNumber ?? null,
          input.fieldPath ?? null,
          input.message,
        ],
      );
    },

    async recordReviewDecision(input) {
      await executeQuery(
        database(),
        `
          INSERT INTO batch_review_decision (batch_id, actor_id, decision, reason)
          VALUES ($1, $2, $3, $4)
        `,
        [input.batchId, input.actorId, input.decision, input.reason ?? null],
      );
    },

    async applyReferenceResolution(updates) {
      if (updates.length === 0) {
        return [];
      }

      // One statement for the whole chunk. Section 7.4 forbids a round trip per
      // item, and resolution produces an outcome for every item in the batch.
      const values: unknown[] = [];
      const tuples = updates.map((update) => {
        const first = values.length + 1;
        values.push(
          update.batchItemId,
          update.inningsId,
          update.sourceIdentity,
          update.referenceResolutionState,
          update.resolvedReferences === null ? null : JSON.stringify(update.resolvedReferences),
        );

        return `(
          $${String(first)}::bigint,
          $${String(first + 1)}::bigint,
          $${String(first + 2)}::text,
          $${String(first + 3)}::batch_reference_resolution_state,
          $${String(first + 4)}::jsonb
        )`;
      });

      const result = await executeQuery<BatchItemRecord>(
        database(),
        `
          UPDATE batch_item AS item
          SET innings_id = resolution.resolved_innings_id,
              source_identity = resolution.resolved_source_identity,
              reference_resolution_state = resolution.resolved_state,
              resolved_references = resolution.resolved_evidence
          -- The alias columns are named apart from batch_item's own, so that the
          -- unqualified names in RETURNING stay unambiguous.
          FROM (VALUES ${tuples.join(',')}) AS resolution (
            resolved_item_id,
            resolved_innings_id,
            resolved_source_identity,
            resolved_state,
            resolved_evidence
          )
          WHERE item.batch_item_id = resolution.resolved_item_id
          RETURNING ${batchItemSelection}
        `,
        values,
      );

      return result.rows.sort((left, right) => left.ordinal - right.ordinal);
    },

    async linkPublishedDelivery(batchItemId, deliveryId) {
      await executeQuery(
        database(),
        `
          WITH linked_item AS (
            UPDATE batch_item
            SET published_event_id = $2::bigint
            WHERE batch_item_id = $1::bigint
            RETURNING batch_item_id
          )
          UPDATE delivery
          SET source_batch_item_id = linked_item.batch_item_id
          FROM linked_item
          WHERE delivery.delivery_id = $2::bigint
        `,
        [batchItemId, deliveryId],
      );
    },
  };
}
