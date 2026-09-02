import { executeQuery, getDatabasePool, type QueryExecutor } from '../../database';

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
  submitterId: string;
  competitionId: string;
  idempotencyKey: string;
  packageVersion?: string;
  source?: BatchSource;
  state?: BatchState;
}

interface InsertBatchItemInput {
  ordinal: number;
  inningsId: string;
  overNumber: number;
  positionInOver: number;
  payload: JsonValue;
  state?: BatchItemState;
  rejectionCode?: string | null;
  rejectionDetail?: JsonValue | null;
  publishedEventId?: string | null;
}

interface BatchItemRecord {
  batchItemId: string;
  batchId: string;
  ordinal: number;
  inningsId: string;
  overNumber: number;
  positionInOver: number;
  payload: JsonValue;
  state: BatchItemState;
  rejectionCode: string | null;
  rejectionDetail: JsonValue | null;
  publishedEventId: string | null;
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

export interface BatchRepository {
  createBatch(input: CreateBatchInput): Promise<BatchRecord>;
  findBatchById(batchId: string): Promise<BatchRecord | null>;
  findBatchByIdempotencyKey(
    submitterId: string,
    idempotencyKey: string,
  ): Promise<BatchRecord | null>;
  insertBatchItems(batchId: string, items: InsertBatchItemInput[]): Promise<BatchItemRecord[]>;
  listBatchItems(batchId: string, options: BatchItemPageOptions): Promise<BatchItemRecord[]>;
  findCheckpoint(
    batchId: string,
    phase: BatchCheckpointPhase,
  ): Promise<BatchCheckpointRecord | null>;
  upsertCheckpoint(input: UpsertBatchCheckpointInput): Promise<BatchCheckpointRecord>;
  recordValidationResult(input: ValidationResultInput): Promise<void>;
  recordReviewDecision(input: ReviewDecisionInput): Promise<void>;
  linkPublishedDelivery(batchItemId: string, deliveryId: string): Promise<void>;
}

interface BatchRow {
  batchId: string;
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

  async function findBatch(where: string, values: unknown[]): Promise<BatchRecord | null> {
    const result = await executeQuery<BatchRow>(
      database(),
      `SELECT ${batchSelection} FROM batch WHERE ${where}`,
      values,
    );

    return result.rows[0] ? mapBatch(result.rows[0]) : null;
  }

  return {
    async createBatch(input) {
      const result = await executeQuery<BatchRow>(
        database(),
        `
          INSERT INTO batch (
            submitter_id,
            competition_id,
            idempotency_key,
            package_version,
            source_checksum,
            source_uri,
            source_size_bytes,
            state
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING ${batchSelection}
        `,
        [
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

    async insertBatchItems(batchId, items) {
      if (items.length === 0) {
        return [];
      }

      const values: unknown[] = [batchId];
      const tuples = items.map((item) => {
        const first = values.length + 1;
        values.push(
          item.ordinal,
          item.inningsId,
          item.overNumber,
          item.positionInOver,
          JSON.stringify(item.payload),
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
          $${first + 5}::batch_item_state,
          $${first + 6}::text,
          $${first + 7}::jsonb,
          $${first + 8}::bigint
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

    async linkPublishedDelivery(batchItemId, deliveryId) {
      await executeQuery(
        database(),
        `
          UPDATE delivery
          SET source_batch_item_id = $2::bigint
          WHERE delivery_id = $1::bigint
        `,
        [deliveryId, batchItemId],
      );
    },
  };
}
