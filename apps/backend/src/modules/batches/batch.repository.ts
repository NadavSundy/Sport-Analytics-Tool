import { randomUUID } from 'node:crypto';

import {
  classifyPublishedCricketDelivery,
  type ComparableCricketDelivery,
  type PublishedCricketDelivery,
} from '@sport-analytics/contracts';

import { executeQuery, getDatabasePool, withTransaction, type QueryExecutor } from '../../database';

type BatchState =
  | 'received'
  | 'stored'
  | 'validating'
  | 'rejected'
  | 'awaiting_review'
  | 'correction_requested'
  | 'publishing'
  | 'published'
  | 'partially_published'
  | 'failed'
  | 'superseded';

type BatchItemState = 'pending' | 'accepted' | 'rejected' | 'published' | 'duplicate_skipped';

type BatchCheckpointPhase = 'validating' | 'publishing';
type BatchReferenceResolutionState = 'unresolved' | 'resolved' | 'ambiguous' | 'invalid';
type BatchValidationSeverity = 'error' | 'warning';
type BatchReviewDecisionKind = 'approved' | 'rejected' | 'returned_for_correction';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

interface BatchSource {
  checksum: string;
  uri: string;
  sizeBytes: number;
}

export interface BatchRecord {
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

interface BatchCountsRecord {
  accepted: number;
  rejected: number;
  unresolved: number;
  duplicate: number;
  conflicting: number;
}

interface BatchReportErrorRecord {
  ruleCode: string;
  message: string;
  filePath: string | null;
  rowNumber: number | null;
  fieldPath: string | null;
}

export interface BatchReportItemRecord {
  batchItemId: string | null;
  ordinal: number;
  inningsId: string | null;
  overNumber: number | null;
  positionInOver: number | null;
  sourceIdentity: string | null;
  sourceLocation: JsonValue | null;
  referenceResolutionState: BatchReferenceResolutionState | null;
  resolvedReferences: JsonValue | null;
  state: BatchItemState | null;
  rejectionCode: string | null;
  publishedEventId: string | null;
  errors: BatchReportErrorRecord[];
}

interface BatchRuleGroupRecord {
  ruleCode: string;
  count: number;
}

interface BatchPublicationResult {
  published: number;
  duplicateSkipped: number;
  conflicts: number;
}

const publicationChunkSize = 100;

export class BatchLeaseBusyError extends Error {
  constructor() {
    super('Another worker currently owns the publication lease.');
    this.name = 'BatchLeaseBusyError';
  }
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

interface BatchReviewDecisionRecord {
  decision: BatchReviewDecisionKind;
  actorId: string;
  actorDisplayName: string | null;
  reason: string;
  decidedAt: string;
}

interface ApplyReviewDecisionInput extends ReviewDecisionInput {
  reason: string;
}

interface QueueReferenceMappingInput {
  decisionReference: string;
  batchId: string;
  actorId: string;
  itemOrdinal: number;
  referencePath: string;
  entityType: string;
  candidateId: string;
  candidateLabel: string;
  decisionKey: string;
}

interface BatchReferenceMappingRecord {
  decisionReference: string;
  itemOrdinal: number;
  referencePath: string;
  entityType: string;
  candidateId: string;
  candidateLabel: string;
  decisionKey: string;
  state: 'queued' | 'applied' | 'failed';
  decidedAt: string;
}

export class BatchReviewConflictError extends Error {}
export class BatchReviewResolutionError extends Error {}
export class BatchReferenceMappingConflictError extends Error {}

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
  createOrFindBatchAndQueueValidation(
    input: CreateBatchInput,
  ): Promise<{ batch: BatchRecord | null; created: boolean; activeLimitReached: boolean }>;
  findBatchById(batchId: string): Promise<BatchRecord | null>;
  findBatchByIdempotencyKey(
    submitterId: string,
    idempotencyKey: string,
  ): Promise<BatchRecord | null>;
  findBatchByReference(batchReference: string): Promise<BatchRecord | null>;
  listBatches(options: {
    submitterId?: string;
    competitionIds?: string[];
    beforeCreatedAt?: string;
    beforeBatchId?: string;
    limit: number;
  }): Promise<BatchRecord[]>;
  countNonTerminalBatches(submitterId: string): Promise<number>;
  getBatchProgress(batchId: string): Promise<BatchProgressRecord>;
  getBatchCounts(batchId: string): Promise<BatchCountsRecord>;
  listBatchReportItems(
    batchId: string,
    options: BatchItemPageOptions,
  ): Promise<BatchReportItemRecord[]>;
  listBatchRuleGroups(batchId: string): Promise<BatchRuleGroupRecord[]>;
  insertBatchItems(batchId: string, items: InsertBatchItemInput[]): Promise<BatchItemRecord[]>;
  listBatchItems(batchId: string, options: BatchItemPageOptions): Promise<BatchItemRecord[]>;
  findCheckpoint(
    batchId: string,
    phase: BatchCheckpointPhase,
  ): Promise<BatchCheckpointRecord | null>;
  upsertCheckpoint(input: UpsertBatchCheckpointInput): Promise<BatchCheckpointRecord>;
  recordValidationResult(input: ValidationResultInput): Promise<void>;
  recordReviewDecision(input: ReviewDecisionInput): Promise<void>;
  getLatestReviewDecision(batchId: string): Promise<BatchReviewDecisionRecord | null>;
  applyReviewDecision(input: ApplyReviewDecisionInput): Promise<{
    batch: BatchRecord;
    review: BatchReviewDecisionRecord;
    resumePublication: boolean;
  }>;
  queueReferenceMapping(input: QueueReferenceMappingInput): Promise<BatchReferenceMappingRecord>;
  applyReferenceResolution(updates: ReferenceResolutionUpdate[]): Promise<BatchItemRecord[]>;
  linkPublishedDelivery(batchItemId: string, deliveryId: string): Promise<void>;
  publishAcceptedItems(batchId: string, workerId: string): Promise<BatchPublicationResult>;
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

function batchItemSelectionFor(table: string): string {
  return `
  ${table}.batch_item_id::text AS "batchItemId",
  ${table}.batch_id::text AS "batchId",
  ${table}.ordinal AS ordinal,
  ${table}.innings_id::text AS "inningsId",
  ${table}.over_number AS "overNumber",
  ${table}.position_in_over AS "positionInOver",
  ${table}.payload,
  ${table}.source_identity AS "sourceIdentity",
  ${table}.source_location AS "sourceLocation",
  ${table}.reference_resolution_state::text AS "referenceResolutionState",
  ${table}.resolved_references AS "resolvedReferences",
  ${table}.state::text AS state,
  ${table}.rejection_code AS "rejectionCode",
  ${table}.rejection_detail AS "rejectionDetail",
  ${table}.published_event_id::text AS "publishedEventId"
`;
}

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

function payloadRecord(value: JsonValue): { [key: string]: JsonValue } {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    throw new Error('Accepted batch item payload is not an object.');
  }
  return value;
}

function payloadNumber(payload: { [key: string]: JsonValue }, key: string): number {
  const value = payload[key];
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`Accepted batch item payload has no integer ${key}.`);
  }
  return value;
}

function payloadString(payload: { [key: string]: JsonValue }, key: string): string {
  const value = payload[key];
  if (typeof value !== 'string') throw new Error(`Accepted batch item payload has no ${key}.`);
  return value;
}

interface PublishedBatchDeliveryRow {
  deliveryId: string;
  inningsId: string;
  sequenceNumber: number;
  overNumber: number;
  positionInOver: number;
  ballNumber: string;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  offBat: number;
  runsExtras: number;
  total: number;
  nonBoundary: boolean;
  wides: number | null;
  noBalls: number | null;
  byes: number | null;
  legByes: number | null;
  penalty: number | null;
  wickets: PublishedCricketDelivery['wickets'];
}

function optionalPayloadNumber(
  payload: { [key: string]: JsonValue },
  key: string,
): number | undefined {
  const value = payload[key];

  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`Accepted batch item payload has invalid integer ${key}.`);
  }

  return value;
}

function comparableWickets(payload: {
  [key: string]: JsonValue;
}): ComparableCricketDelivery['wickets'] {
  const rawWickets = payload.wickets;

  if (rawWickets === undefined) {
    return [];
  }

  if (!Array.isArray(rawWickets)) {
    throw new Error('Accepted batch item wickets are not an array.');
  }

  return rawWickets.map((rawWicket) => {
    const wicket = payloadRecord(rawWicket);
    const rawFielders = wicket.fielders ?? [];

    if (!Array.isArray(rawFielders)) {
      throw new Error('Accepted batch item wicket fielders are not an array.');
    }

    return {
      kind: payloadString(wicket, 'kind'),
      playerOutId: payloadString(wicket, 'playerOutId'),
      fielders: rawFielders.map((rawFielder) => {
        const fielder = payloadRecord(rawFielder);
        const participantId = fielder.participantId;

        if (
          participantId !== undefined &&
          participantId !== null &&
          typeof participantId !== 'string'
        ) {
          throw new Error('Accepted batch item fielder has an invalid participantId.');
        }

        return {
          ...(typeof participantId === 'string' ? { participantId } : {}),
          substitute: typeof fielder.substitute === 'boolean' ? fielder.substitute : false,
        };
      }),
    };
  });
}

function comparableDeliveryForItem(
  item: BatchItemRecord,
  payload: { [key: string]: JsonValue },
): ComparableCricketDelivery {
  if (!item.inningsId) {
    throw new Error('Accepted batch item has no canonical innings.');
  }

  const runs = payloadRecord(payload.runs ?? null);
  const extras = payloadRecord(payload.extras ?? {});

  return {
    inningsId: item.inningsId,
    sequenceNumber: payloadNumber(payload, 'sequenceNumber'),
    overNumber: item.overNumber,
    positionInOver: item.positionInOver,
    ballNumber: payloadString(payload, 'ballNumber'),
    strikerId: payloadString(payload, 'strikerId'),
    nonStrikerId: payloadString(payload, 'nonStrikerId'),
    bowlerId: payloadString(payload, 'bowlerId'),
    runs: {
      offBat: payloadNumber(runs, 'offBat'),
      extras: payloadNumber(runs, 'extras'),
      total: payloadNumber(runs, 'total'),
      nonBoundary: typeof runs.nonBoundary === 'boolean' ? runs.nonBoundary : false,
    },
    extras: {
      wides: optionalPayloadNumber(extras, 'wides'),
      noBalls: optionalPayloadNumber(extras, 'noBalls'),
      byes: optionalPayloadNumber(extras, 'byes'),
      legByes: optionalPayloadNumber(extras, 'legByes'),
      penalty: optionalPayloadNumber(extras, 'penalty'),
    },
    wickets: comparableWickets(payload),
  };
}

function mapPublishedBatchDelivery(row: PublishedBatchDeliveryRow): PublishedCricketDelivery {
  return {
    inningsId: row.inningsId,
    sequenceNumber: row.sequenceNumber,
    overNumber: row.overNumber,
    positionInOver: row.positionInOver,
    ballNumber: row.ballNumber,
    strikerId: row.strikerId,
    nonStrikerId: row.nonStrikerId,
    bowlerId: row.bowlerId,
    runs: {
      offBat: row.offBat,
      extras: row.runsExtras,
      total: row.total,
      nonBoundary: row.nonBoundary,
    },
    extras: {
      wides: row.wides,
      noBalls: row.noBalls,
      byes: row.byes,
      legByes: row.legByes,
      penalty: row.penalty,
    },
    wickets: row.wickets,
  };
}

async function publishedDeliveryMatchesForItem(
  target: QueryExecutor,
  item: BatchItemRecord,
): Promise<
  Array<{
    deliveryId: string;
    delivery: PublishedCricketDelivery;
  }>
> {
  if (!item.inningsId) {
    return [];
  }

  const result = await executeQuery<PublishedBatchDeliveryRow>(
    target,
    `
        SELECT
          d.delivery_id::text AS "deliveryId",
          d.innings_id::text AS "inningsId",
          d.innings_sequence AS "sequenceNumber",
          d.over_number AS "overNumber",
          d.position_in_over AS "positionInOver",
          d.ball_number AS "ballNumber",
          d.striker_id::text AS "strikerId",
          d.non_striker_id::text AS "nonStrikerId",
          d.bowler_id::text AS "bowlerId",
          d.runs_off_bat AS "offBat",
          d.runs_extras AS "runsExtras",
          d.runs_total AS "total",
          d.non_boundary AS "nonBoundary",
          d.extra_wides AS wides,
          d.extra_noballs AS "noBalls",
          d.extra_byes AS byes,
          d.extra_legbyes AS "legByes",
          d.extra_penalty AS penalty,
          COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'kind', wicket.kind,
                'playerOutId',
                  wicket.player_out_id::text,
                'fielders', COALESCE((
                  SELECT jsonb_agg(
                    jsonb_build_object(
                      'participantId',
                        fielder.person_id::text,
                      'substitute',
                        fielder.is_substitute
                    )
                    ORDER BY fielder.ordinal
                  )
                  FROM delivery_wicket_fielder fielder
                  WHERE fielder.wicket_id =
                        wicket.wicket_id
                ), '[]'::jsonb)
              )
              ORDER BY wicket.ordinal
            )
            FROM delivery_wicket wicket
            WHERE wicket.delivery_id =
                  d.delivery_id
          ), '[]'::jsonb) AS wickets
        FROM delivery_current d
        LEFT JOIN delivery lineage
          ON lineage.delivery_id = d.delivery_id
        LEFT JOIN batch_item source_item
          ON source_item.batch_item_id =
             lineage.source_batch_item_id
        WHERE (
          d.innings_id = $1::bigint
          AND d.over_number = $2::smallint
          AND d.position_in_over = $3::smallint
        )
        OR (
          $4::text IS NOT NULL
          AND source_item.source_identity = $4
        )
        ORDER BY d.delivery_id
      `,
    [item.inningsId, item.overNumber, item.positionInOver, item.sourceIdentity],
  );

  return result.rows.map((row) => ({
    deliveryId: row.deliveryId,
    delivery: mapPublishedBatchDelivery(row),
  }));
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

    async createOrFindBatchAndQueueValidation(input) {
      if (executor) {
        // Receipt races are scoped to a submitter. Locking its durable account
        // row serialises the key lookup, active-batch limit and insertion.
        await executeQuery(
          executor,
          'SELECT 1 FROM app_user WHERE app_user_id = $1::bigint FOR UPDATE',
          [input.submitterId],
        );
        const existing = await findBatch('submitter_id = $1::bigint AND idempotency_key = $2', [
          input.submitterId,
          input.idempotencyKey,
        ]);
        if (existing) return { batch: existing, created: false, activeLimitReached: false };
        const active = await executeQuery<{ count: string }>(
          executor,
          `SELECT count(*)::text AS count FROM batch
           WHERE submitter_id = $1::bigint
             AND state NOT IN (
               'rejected', 'correction_requested', 'published', 'partially_published', 'superseded'
             )`,
          [input.submitterId],
        );
        if (Number(active.rows[0]?.count ?? 0) >= 3) {
          return { batch: null, created: false, activeLimitReached: true };
        }
        return {
          batch: await insertBatchAndValidationJob(executor, input),
          created: true,
          activeLimitReached: false,
        };
      }

      return withTransaction(getDatabasePool(), (client) =>
        createBatchRepository(client).createOrFindBatchAndQueueValidation(input),
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

    async listBatches(options) {
      const values: unknown[] = [];
      const filters: string[] = [];
      if (options.submitterId) {
        values.push(options.submitterId);
        filters.push(`submitter_id = $${values.length}::bigint`);
      }
      if (options.competitionIds) {
        values.push(options.competitionIds);
        filters.push(`competition_id = ANY($${values.length}::bigint[])`);
      }
      if (options.beforeCreatedAt && options.beforeBatchId) {
        values.push(options.beforeCreatedAt, options.beforeBatchId);
        filters.push(
          `(created_at, batch_id) < ($${values.length - 1}::timestamptz, $${values.length}::bigint)`,
        );
      }
      values.push(options.limit);
      const result = await executeQuery<BatchRow>(
        database(),
        `SELECT ${batchSelection} FROM batch
         ${filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : ''}
         ORDER BY created_at DESC, batch_id DESC
         LIMIT $${values.length}::integer`,
        values,
      );
      return result.rows.map(mapBatch);
    },

    async countNonTerminalBatches(submitterId) {
      const result = await executeQuery<{ count: string }>(
        database(),
        `SELECT count(*)::text AS count FROM batch
         WHERE submitter_id = $1::bigint
           AND state NOT IN (
             'rejected', 'correction_requested', 'published', 'partially_published', 'superseded'
           )`,
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
            count(i.batch_item_id) FILTER (
              WHERE i.state IN ('accepted', 'published', 'duplicate_skipped')
            )::text AS accepted,
            (
              count(i.batch_item_id) FILTER (WHERE i.state = 'rejected') +
              (SELECT count(DISTINCT v.source_ordinal)
               FROM batch_validation_result v
               WHERE v.batch_id = b.batch_id AND v.severity = 'error'
                 AND v.active
                 AND v.batch_item_id IS NULL)
            )::text AS rejected
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

    async getBatchCounts(batchId) {
      const result = await executeQuery<{
        accepted: string;
        rejected: string;
        unresolved: string;
        duplicate: string;
        conflicting: string;
      }>(
        database(),
        `
          WITH rejected_subjects AS (
            SELECT ordinal FROM batch_item
            WHERE batch_id = $1::bigint AND state = 'rejected'
            UNION
            SELECT source_ordinal FROM batch_validation_result
            WHERE batch_id = $1::bigint AND severity = 'error'
              AND active
              AND batch_item_id IS NULL AND source_ordinal IS NOT NULL
          )
          SELECT
            (SELECT count(*) FROM batch_item WHERE batch_id = $1::bigint
              AND state IN ('accepted', 'published', 'duplicate_skipped'))::text AS accepted,
            (SELECT count(*) FROM rejected_subjects)::text AS rejected,
            (SELECT count(*) FROM batch_item WHERE batch_id = $1::bigint
              AND reference_resolution_state <> 'resolved')::text AS unresolved,
            (SELECT count(DISTINCT ordinal) FROM (
              SELECT ordinal FROM batch_item WHERE batch_id = $1::bigint
                AND state = 'duplicate_skipped'
              UNION
              SELECT source_ordinal FROM batch_validation_result
              WHERE batch_id = $1::bigint AND rule_code = 'DUPLICATE_BATCH_ITEM'
                AND active
                AND source_ordinal IS NOT NULL
            ) duplicates)::text AS duplicate,
            (SELECT count(DISTINCT ordinal) FROM (
              SELECT ordinal FROM batch_item WHERE batch_id = $1::bigint
                AND rejection_code LIKE '%CONFLICT%'
              UNION
              SELECT source_ordinal FROM batch_validation_result
              WHERE batch_id = $1::bigint AND rule_code LIKE '%CONFLICT%'
                AND active
                AND source_ordinal IS NOT NULL
            ) conflicts)::text AS conflicting
        `,
        [batchId],
      );
      const row = requireRow(result.rows[0], 'Batch count lookup');
      return {
        accepted: Number(row.accepted),
        rejected: Number(row.rejected),
        unresolved: Number(row.unresolved),
        duplicate: Number(row.duplicate),
        conflicting: Number(row.conflicting),
      };
    },

    async listBatchReportItems(batchId, options) {
      const result = await executeQuery<BatchReportItemRecord>(
        database(),
        `
          WITH subjects AS (
            SELECT ordinal FROM batch_item WHERE batch_id = $1::bigint
            UNION
            SELECT COALESCE(v.source_ordinal, i.ordinal)
            FROM batch_validation_result v
            LEFT JOIN batch_item i ON i.batch_item_id = v.batch_item_id
            WHERE v.batch_id = $1::bigint
              AND v.active
              AND COALESCE(v.source_ordinal, i.ordinal) IS NOT NULL
          )
          SELECT
            i.batch_item_id::text AS "batchItemId",
            subjects.ordinal,
            i.innings_id::text AS "inningsId",
            i.over_number AS "overNumber",
            i.position_in_over AS "positionInOver",
            i.source_identity AS "sourceIdentity",
            i.source_location AS "sourceLocation",
            i.reference_resolution_state::text AS "referenceResolutionState",
            i.resolved_references AS "resolvedReferences",
            i.state::text AS state,
            i.rejection_code AS "rejectionCode",
            i.published_event_id::text AS "publishedEventId",
            COALESCE(errors.rows, '[]'::jsonb) AS errors
          FROM subjects
          LEFT JOIN batch_item i
            ON i.batch_id = $1::bigint AND i.ordinal = subjects.ordinal
          LEFT JOIN LATERAL (
            SELECT jsonb_agg(
              jsonb_build_object(
                'ruleCode', v.rule_code,
                'message', v.message,
                'filePath', v.file_path,
                'rowNumber', v.row_number,
                'fieldPath', v.field_path
              ) ORDER BY v.batch_validation_result_id
            ) AS rows
            FROM batch_validation_result v
            WHERE v.batch_id = $1::bigint
              AND v.active
              AND COALESCE(v.source_ordinal, subjects.ordinal) = subjects.ordinal
              AND (v.batch_item_id IS NULL OR v.batch_item_id = i.batch_item_id)
              AND v.severity = 'error'
          ) errors ON true
          WHERE subjects.ordinal > $2::integer
          ORDER BY subjects.ordinal
          LIMIT $3::integer
        `,
        [batchId, options.afterOrdinal ?? -1, options.limit],
      );
      return result.rows;
    },

    async listBatchRuleGroups(batchId) {
      const result = await executeQuery<{ ruleCode: string; count: string }>(
        database(),
        `SELECT rule_code AS "ruleCode", count(*)::text AS count
         FROM batch_validation_result
         WHERE batch_id = $1::bigint AND severity = 'error' AND active
         GROUP BY rule_code
         ORDER BY rule_code`,
        [batchId],
      );
      return result.rows.map((row) => ({ ruleCode: row.ruleCode, count: Number(row.count) }));
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

    async getLatestReviewDecision(batchId) {
      const result = await executeQuery<{
        decision: BatchReviewDecisionKind;
        actorId: string;
        actorDisplayName: string | null;
        reason: string | null;
        decidedAt: Date;
      }>(
        database(),
        `SELECT d.decision::text AS decision,
                d.actor_id::text AS "actorId",
                a.display_name AS "actorDisplayName",
                d.reason,
                d.decided_at AS "decidedAt"
         FROM batch_review_decision d
         JOIN app_user a ON a.app_user_id = d.actor_id
         WHERE d.batch_id = $1::bigint
         ORDER BY d.decided_at DESC, d.batch_review_decision_id DESC
         LIMIT 1`,
        [batchId],
      );
      const row = result.rows[0];
      return row
        ? {
            decision: row.decision,
            actorId: row.actorId,
            actorDisplayName: row.actorDisplayName,
            reason: row.reason ?? 'Legacy review decision.',
            decidedAt: row.decidedAt.toISOString(),
          }
        : null;
    },

    async applyReviewDecision(input) {
      if (!executor) {
        return withTransaction(getDatabasePool(), (client) =>
          createBatchRepository(client).applyReviewDecision(input),
        );
      }

      const locked = await executeQuery<BatchRow>(
        executor,
        `SELECT ${batchSelection} FROM batch WHERE batch_id = $1::bigint FOR UPDATE`,
        [input.batchId],
      );
      const batch = mapBatch(requireRow(locked.rows[0], 'Batch review lookup'));
      const existing = await this.getLatestReviewDecision(input.batchId);
      if (existing) {
        if (existing.decision !== input.decision) {
          throw new BatchReviewConflictError('This batch already has a different review decision.');
        }
        return {
          batch,
          review: existing,
          resumePublication: existing.decision === 'approved' && batch.state === 'publishing',
        };
      }
      if (batch.state !== 'awaiting_review') {
        throw new BatchReviewConflictError(
          'Only a validated batch awaiting review can be decided.',
        );
      }
      if (input.decision === 'approved') {
        const unresolved = await executeQuery<{ count: string }>(
          executor,
          `SELECT count(*)::text AS count FROM batch_item
           WHERE batch_id = $1::bigint
             AND reference_resolution_state IS DISTINCT FROM 'resolved'`,
          [input.batchId],
        );
        if (Number(unresolved.rows[0]?.count ?? 0) > 0) {
          throw new BatchReviewResolutionError(
            'Resolve every ambiguous or unresolved reference before approval.',
          );
        }
      }

      const inserted = await executeQuery<{
        decision: BatchReviewDecisionKind;
        decidedAt: Date;
      }>(
        executor,
        `INSERT INTO batch_review_decision (batch_id, actor_id, decision, reason)
         VALUES ($1::bigint, $2::bigint, $3::batch_review_decision_kind, $4)
         RETURNING decision::text AS decision, decided_at AS "decidedAt"`,
        [input.batchId, input.actorId, input.decision, input.reason],
      );
      const decision = requireRow(inserted.rows[0], 'Batch review decision insertion');
      const targetState: BatchState =
        input.decision === 'approved'
          ? 'publishing'
          : input.decision === 'returned_for_correction'
            ? 'correction_requested'
            : 'rejected';
      const updated = await executeQuery<BatchRow>(
        executor,
        `UPDATE batch SET state = $2::batch_state
         WHERE batch_id = $1::bigint
         RETURNING ${batchSelection}`,
        [input.batchId, targetState],
      );
      await executeQuery(
        executor,
        `INSERT INTO batch_state_transition (
           batch_id, from_state, to_state, actor_kind, actor_identifier, reason
         ) VALUES ($1::bigint, 'awaiting_review', $2::batch_state, 'reviewer', $3, $4)`,
        [input.batchId, targetState, input.actorId, input.reason],
      );
      return {
        batch: mapBatch(requireRow(updated.rows[0], 'Batch review state update')),
        review: {
          decision: decision.decision,
          actorId: input.actorId,
          actorDisplayName: null,
          reason: input.reason,
          decidedAt: decision.decidedAt.toISOString(),
        },
        resumePublication: input.decision === 'approved',
      };
    },

    async queueReferenceMapping(input) {
      if (!executor) {
        return withTransaction(getDatabasePool(), (client) =>
          createBatchRepository(client).queueReferenceMapping(input),
        );
      }

      const locked = await executeQuery<BatchRow>(
        executor,
        `SELECT ${batchSelection} FROM batch WHERE batch_id = $1::bigint FOR UPDATE`,
        [input.batchId],
      );
      const batch = mapBatch(requireRow(locked.rows[0], 'Batch mapping lookup'));
      const existing = await executeQuery<{
        decisionReference: string;
        itemOrdinal: number;
        referencePath: string;
        entityType: string;
        candidateId: string;
        candidateLabel: string;
        decisionKey: string;
        state: BatchReferenceMappingRecord['state'];
        decidedAt: Date;
      }>(
        executor,
        `SELECT decision_reference::text AS "decisionReference", item_ordinal AS "itemOrdinal",
                reference_path AS "referencePath", entity_type AS "entityType",
                candidate_id::text AS "candidateId", candidate_label AS "candidateLabel",
                decision_key AS "decisionKey", state::text AS state, decided_at AS "decidedAt"
         FROM batch_reference_mapping_decision
         WHERE batch_id = $1::bigint
           AND ((item_ordinal = $2::integer AND reference_path = $3) OR decision_key = $4)
         FOR UPDATE`,
        [input.batchId, input.itemOrdinal, input.referencePath, input.decisionKey],
      );
      const prior = existing.rows[0];
      if (prior) {
        if (
          prior.referencePath !== input.referencePath ||
          prior.itemOrdinal !== input.itemOrdinal ||
          prior.candidateId !== input.candidateId ||
          prior.decisionKey !== input.decisionKey
        ) {
          throw new BatchReferenceMappingConflictError(
            'This reference or decision key already has a different mapping.',
          );
        }
        return { ...prior, decidedAt: prior.decidedAt.toISOString() };
      }
      if (!['rejected', 'awaiting_review', 'correction_requested'].includes(batch.state)) {
        throw new BatchReferenceMappingConflictError(
          'Reference mappings can only be applied after validation has finished.',
        );
      }

      const inserted = await executeQuery<{
        decisionReference: string;
        state: BatchReferenceMappingRecord['state'];
        decidedAt: Date;
      }>(
        executor,
        `INSERT INTO batch_reference_mapping_decision (
           decision_reference, batch_id, item_ordinal, reference_path, entity_type, candidate_id,
           candidate_label, actor_id, decision_key
         ) VALUES ($1::uuid,$2::bigint,$3::integer,$4,$5,$6::bigint,$7,$8::bigint,$9)
         RETURNING decision_reference::text AS "decisionReference", state::text AS state,
                   decided_at AS "decidedAt"`,
        [
          input.decisionReference,
          input.batchId,
          input.itemOrdinal,
          input.referencePath,
          input.entityType,
          input.candidateId,
          input.candidateLabel,
          input.actorId,
          input.decisionKey,
        ],
      );

      await executeQuery(
        executor,
        `UPDATE batch_validation_result
         SET active = false, superseded_at = now()
         WHERE batch_id = $1::bigint AND active`,
        [input.batchId],
      );
      await executeQuery(
        executor,
        `UPDATE batch_item
         SET innings_id=NULL, state='pending', rejection_code=NULL, rejection_detail=NULL
         WHERE batch_id=$1::bigint AND published_event_id IS NULL`,
        [input.batchId],
      );
      await executeQuery(
        executor,
        `UPDATE batch_checkpoint
         SET last_ordinal = -1, lease_owner = NULL, lease_expires_at = NULL, attempt_count = 0
         WHERE batch_id = $1::bigint AND phase = 'validating'`,
        [input.batchId],
      );
      const job = await executeQuery<{ jobId: string }>(
        executor,
        `UPDATE background_job
         SET state='queued', progress_current=0, progress_total=NULL, attempt_count=0,
             started_at=NULL, completed_at=NULL, last_error_code=NULL, last_error_message=NULL
         WHERE batch_id=$1::bigint AND job_type='batch.validate'
         RETURNING job_id::text AS "jobId"`,
        [input.batchId],
      );
      const jobId = requireRow(job.rows[0], 'Batch validation job reset').jobId;
      await executeQuery(
        executor,
        `INSERT INTO outbox_message (
           outbox_message_id, job_id, message_type, contract_version, body
         ) VALUES ($1::uuid,$2::uuid,'batch.validate',1,
           jsonb_build_object('type','batch.validate','version',1,'commandId',$1::text,
             'jobId',$2::text,'batchId',$3::text,'batchReference',$4::text))`,
        [randomUUID(), jobId, batch.batchId, batch.batchReference],
      );
      await executeQuery(executor, `UPDATE batch SET state='stored' WHERE batch_id=$1::bigint`, [
        input.batchId,
      ]);
      await executeQuery(
        executor,
        `INSERT INTO batch_state_transition (
           batch_id,from_state,to_state,actor_kind,actor_identifier,reason
         ) VALUES ($1::bigint,$2::batch_state,'stored','api',$3,$4)`,
        [
          input.batchId,
          batch.state,
          input.actorId,
          `Reference mapping queued for ${input.referencePath}.`,
        ],
      );

      const row = requireRow(inserted.rows[0], 'Batch mapping decision insertion');
      return {
        decisionReference: row.decisionReference,
        itemOrdinal: input.itemOrdinal,
        referencePath: input.referencePath,
        entityType: input.entityType,
        candidateId: input.candidateId,
        candidateLabel: input.candidateLabel,
        decisionKey: input.decisionKey,
        state: row.state,
        decidedAt: row.decidedAt.toISOString(),
      };
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

    async publishAcceptedItems(batchId, workerId) {
      const publish = async (
        target: QueryExecutor,
      ): Promise<BatchPublicationResult & { complete: boolean }> => {
        const batch = await executeQuery<{
          state: BatchState;
          submitterId: string;
          checksum: string;
        }>(
          target,
          `SELECT state::text AS state, submitter_id::text AS "submitterId", source_checksum AS checksum
           FROM batch WHERE batch_id = $1::bigint FOR UPDATE`,
          [batchId],
        );
        const current = requireRow(batch.rows[0], 'Batch publication lookup');
        if (current.state === 'published')
          return { published: 0, duplicateSkipped: 0, conflicts: 0, complete: true };
        if (current.state !== 'publishing') {
          throw new Error('Only an approved batch awaiting publication may be published.');
        }

        const existingCheckpoint = await executeQuery<{
          lastOrdinal: number;
          leaseOwner: string | null;
          leaseExpiresAt: Date | null;
        }>(
          target,
          `SELECT last_ordinal AS "lastOrdinal", lease_owner AS "leaseOwner",
                  lease_expires_at AS "leaseExpiresAt"
           FROM batch_checkpoint
           WHERE batch_id=$1::bigint AND phase='publishing'
           FOR UPDATE`,
          [batchId],
        );
        const checkpoint = existingCheckpoint.rows[0];
        if (
          checkpoint?.leaseOwner &&
          checkpoint.leaseOwner !== workerId &&
          checkpoint.leaseExpiresAt &&
          checkpoint.leaseExpiresAt.getTime() > Date.now()
        ) {
          throw new BatchLeaseBusyError();
        }
        const lastOrdinal = checkpoint?.lastOrdinal ?? -1;

        await executeQuery(
          target,
          `INSERT INTO batch_checkpoint (batch_id,phase,last_ordinal,lease_owner,lease_expires_at,attempt_count)
           VALUES ($1::bigint,'publishing',-1,$2,now()+interval '5 minutes',1)
           ON CONFLICT (batch_id,phase) DO UPDATE SET
             lease_owner=EXCLUDED.lease_owner,
             lease_expires_at=EXCLUDED.lease_expires_at,
             attempt_count=CASE
               WHEN batch_checkpoint.lease_owner=EXCLUDED.lease_owner
                    AND batch_checkpoint.lease_expires_at>now()
                 THEN batch_checkpoint.attempt_count
               ELSE batch_checkpoint.attempt_count+1
             END`,
          [batchId, workerId],
        );

        const items = await executeQuery<BatchItemRecord & { fixtureId: string }>(
          target,
          `SELECT ${batchItemSelectionFor('batch_item')}, innings.fixture_id::text AS "fixtureId"
           FROM batch_item JOIN innings ON innings.innings_id = batch_item.innings_id
           WHERE batch_item.batch_id=$1::bigint AND batch_item.state='accepted'
             AND batch_item.ordinal>$2::integer
           ORDER BY batch_item.ordinal
           LIMIT $3::integer
           FOR UPDATE OF batch_item`,
          [batchId, lastOrdinal, publicationChunkSize],
        );
        const result: BatchPublicationResult = { published: 0, duplicateSkipped: 0, conflicts: 0 };
        const newPublications: Array<{
          item: BatchItemRecord & { fixtureId: string };
          delivery: ComparableCricketDelivery;
        }> = [];

        for (const item of items.rows) {
          const payload = payloadRecord(item.payload);
          const submitted = comparableDeliveryForItem(item, payload);

          const publishedMatches = await publishedDeliveryMatchesForItem(target, item);

          const classified = publishedMatches.map((match) => ({
            ...match,
            classification: classifyPublishedCricketDelivery(submitted, match.delivery),
          }));

          const conflict = classified.find((match) => match.classification === 'conflict');

          if (conflict) {
            await executeQuery(
              target,
              `
                UPDATE batch_item
                SET state='rejected',
                    rejection_code=
                      'PUBLISHED_DELIVERY_CONFLICT',
                    rejection_detail=
                      jsonb_build_object(
                        'existingDeliveryId',
                        $2::text
                      )
                WHERE batch_item_id=$1::bigint
              `,
              [item.batchItemId, conflict.deliveryId],
            );

            await executeQuery(
              target,
              `
                INSERT INTO batch_validation_result (
                  batch_id,
                  batch_item_id,
                  source_ordinal,
                  rule_code,
                  rule_version,
                  severity,
                  field_path,
                  message
                )
                VALUES (
                  $1::bigint,
                  $2::bigint,
                  $3::integer,
                  'PUBLISHED_DELIVERY_CONFLICT',
                  '1.0',
                  'error',
                  'delivery',
                  'A published delivery or published source identity exists with different cricket content.'
                )
                ON CONFLICT DO NOTHING
              `,
              [batchId, item.batchItemId, item.ordinal],
            );

            result.conflicts += 1;
            continue;
          }

          const duplicate = classified.find((match) => match.classification === 'exact-duplicate');

          if (duplicate) {
            await executeQuery(
              target,
              `
                UPDATE batch_item
                SET state='duplicate_skipped',
                    published_event_id=$2::bigint
                WHERE batch_item_id=$1::bigint
              `,
              [item.batchItemId, duplicate.deliveryId],
            );

            await executeQuery(
              target,
              `
                INSERT INTO batch_validation_result (
                  batch_id,
                  batch_item_id,
                  source_ordinal,
                  rule_code,
                  rule_version,
                  severity,
                  field_path,
                  message
                )
                VALUES (
                  $1::bigint,
                  $2::bigint,
                  $3::integer,
                  'EXACT_PUBLISHED_DUPLICATE',
                  '1.0',
                  'warning',
                  'delivery',
                  'The staged event exactly matches an already-published delivery.'
                )
                ON CONFLICT DO NOTHING
              `,
              [batchId, item.batchItemId, item.ordinal],
            );

            result.duplicateSkipped += 1;
            continue;
          }

          newPublications.push({ item, delivery: submitted });
        }

        if (newPublications.length > 0) {
          const publicationRows = newPublications.map(({ item, delivery }) => ({
            batchItemId: item.batchItemId,
            fixtureId: item.fixtureId,
            inningsId: delivery.inningsId,
            overNumber: delivery.overNumber,
            positionInOver: delivery.positionInOver,
            sequenceNumber: delivery.sequenceNumber,
            ballNumber: delivery.ballNumber,
            strikerId: delivery.strikerId,
            nonStrikerId: delivery.nonStrikerId,
            bowlerId: delivery.bowlerId,
            offBat: delivery.runs.offBat,
            runsExtras: delivery.runs.extras,
            total: delivery.runs.total,
            nonBoundary: delivery.runs.nonBoundary,
            wides: delivery.extras.wides,
            noBalls: delivery.extras.noBalls,
            byes: delivery.extras.byes,
            legByes: delivery.extras.legByes,
            penalty: delivery.extras.penalty,
          }));
          const published = await executeQuery<{ count: string }>(
            target,
            `WITH source AS (
               SELECT * FROM jsonb_to_recordset($3::jsonb) AS item(
                 "batchItemId" bigint, "fixtureId" bigint, "inningsId" bigint,
                 "overNumber" smallint, "positionInOver" smallint, "sequenceNumber" integer,
                 "ballNumber" text, "strikerId" bigint, "nonStrikerId" bigint, "bowlerId" bigint,
                 "offBat" smallint, "runsExtras" smallint, "total" smallint,
                 "nonBoundary" boolean, wides smallint, "noBalls" smallint,
                 byes smallint, "legByes" smallint, penalty smallint
               )
             ), inserted_submissions AS (
               INSERT INTO submission (
                 submitted_by, fixture_id, schema_version, event_count, source_sha256, status
               )
               SELECT $1::bigint, "fixtureId", '1.0', count(*)::integer, $2, 'accepted'
               FROM source GROUP BY "fixtureId"
               RETURNING submission_id, fixture_id
             ), inserted_deliveries AS (
               INSERT INTO delivery (
                 innings_id, over_number, position_in_over, innings_sequence, ball_number,
                 striker_id, non_striker_id, bowler_id, runs_off_bat, runs_extras, runs_total,
                 non_boundary, extra_wides, extra_noballs, extra_byes, extra_legbyes,
                 extra_penalty, submission_id, source_batch_item_id
               )
               SELECT s."inningsId", s."overNumber", s."positionInOver", s."sequenceNumber",
                 s."ballNumber", s."strikerId", s."nonStrikerId", s."bowlerId", s."offBat",
                 s."runsExtras", s.total, s."nonBoundary", s.wides, s."noBalls", s.byes,
                 s."legByes", s.penalty, submission.submission_id, s."batchItemId"
               FROM source s
               JOIN inserted_submissions submission ON submission.fixture_id=s."fixtureId"
               ON CONFLICT DO NOTHING
               RETURNING delivery_id, source_batch_item_id
             ), updated_items AS (
               UPDATE batch_item item
               SET state='published', published_event_id=delivery.delivery_id
               FROM inserted_deliveries delivery
               WHERE item.batch_item_id=delivery.source_batch_item_id
               RETURNING item.batch_item_id
             )
             SELECT count(*)::text AS count FROM updated_items`,
            [current.submitterId, current.checksum, JSON.stringify(publicationRows)],
          );
          const publishedCount = Number(published.rows[0]?.count ?? 0);
          if (publishedCount !== newPublications.length) {
            throw new Error('Concurrent delivery publication requires a retry.');
          }

          const wickets = newPublications.flatMap(({ item, delivery }) =>
            delivery.wickets.map((wicket, ordinal) => ({
              batchItemId: item.batchItemId,
              ordinal,
              kind: wicket.kind,
              playerOutId: wicket.playerOutId,
            })),
          );
          if (wickets.length > 0) {
            await executeQuery(
              target,
              `INSERT INTO delivery_wicket (delivery_id, ordinal, kind, source_kind, player_out_id)
               SELECT delivery.delivery_id, wicket.ordinal, wicket.kind, wicket.kind,
                 wicket."playerOutId"
               FROM jsonb_to_recordset($1::jsonb) AS wicket(
                 "batchItemId" bigint, ordinal smallint, kind text, "playerOutId" bigint
               )
               JOIN delivery ON delivery.source_batch_item_id=wicket."batchItemId"`,
              [JSON.stringify(wickets)],
            );
          }

          const fielders = newPublications.flatMap(({ item, delivery }) =>
            delivery.wickets.flatMap((wicket, wicketOrdinal) =>
              wicket.fielders.map((fielder, ordinal) => ({
                batchItemId: item.batchItemId,
                wicketOrdinal,
                ordinal,
                participantId: fielder.participantId,
                substitute: fielder.substitute,
              })),
            ),
          );
          if (fielders.length > 0) {
            await executeQuery(
              target,
              `INSERT INTO delivery_wicket_fielder (wicket_id, ordinal, person_id, is_substitute)
               SELECT wicket.wicket_id, fielder.ordinal, fielder."participantId",
                 fielder.substitute
               FROM jsonb_to_recordset($1::jsonb) AS fielder(
                 "batchItemId" bigint, "wicketOrdinal" smallint, ordinal smallint,
                 "participantId" bigint, substitute boolean
               )
               JOIN delivery ON delivery.source_batch_item_id=fielder."batchItemId"
               JOIN delivery_wicket wicket ON wicket.delivery_id=delivery.delivery_id
                 AND wicket.ordinal=fielder."wicketOrdinal"`,
              [JSON.stringify(fielders)],
            );
          }
          result.published += publishedCount;
        }

        const remaining = await executeQuery<{ exists: boolean }>(
          target,
          `SELECT EXISTS(
             SELECT 1 FROM batch_item
             WHERE batch_id=$1::bigint AND state='accepted' AND ordinal>$2::integer
           ) AS exists`,
          [batchId, items.rows.at(-1)?.ordinal ?? lastOrdinal],
        );
        const newLastOrdinal = items.rows.at(-1)?.ordinal ?? lastOrdinal;
        if (remaining.rows[0]?.exists) {
          const advanced = await executeQuery<{ lastOrdinal: number }>(
            target,
            `UPDATE batch_checkpoint
             SET last_ordinal=$3::integer,
                 lease_expires_at=now()+interval '5 minutes'
             WHERE batch_id=$1::bigint AND phase='publishing'
               AND lease_owner=$2 AND lease_expires_at>now()`,
            [batchId, workerId, newLastOrdinal],
          );
          if (advanced.rowCount !== 1) throw new BatchLeaseBusyError();
          return { ...result, complete: false };
        }
        const conflictCount = await executeQuery<{ count: string }>(
          target,
          `SELECT count(*)::text AS count FROM batch_item
           WHERE batch_id=$1::bigint
             AND rejection_code IN (
               'PUBLISHED_NATURAL_KEY_CONFLICT',
               'PUBLISHED_DELIVERY_CONFLICT'
             )`,
          [batchId],
        );
        const finalState =
          Number(conflictCount.rows[0]?.count ?? 0) > 0 ? 'partially_published' : 'published';
        const released = await executeQuery<{ lastOrdinal: number }>(
          target,
          `UPDATE batch_checkpoint SET last_ordinal=COALESCE(
             (SELECT max(ordinal) FROM batch_item WHERE batch_id=$1::bigint), -1
           ), lease_owner=NULL, lease_expires_at=NULL
           WHERE batch_id=$1::bigint AND phase='publishing' AND lease_owner=$2
             AND lease_expires_at>now()
           RETURNING last_ordinal AS "lastOrdinal"`,
          [batchId, workerId],
        );
        if (released.rowCount !== 1) throw new BatchLeaseBusyError();
        await executeQuery(
          target,
          `UPDATE batch SET state=$2::batch_state WHERE batch_id=$1::bigint`,
          [batchId, finalState],
        );
        await executeQuery(
          target,
          `INSERT INTO batch_state_transition (batch_id,from_state,to_state,actor_kind,actor_identifier,reason)
           VALUES ($1::bigint,'publishing',$2::batch_state,'worker',$3,'Publication completed idempotently.')`,
          [batchId, finalState, workerId],
        );
        return { ...result, complete: true };
      };
      const totals: BatchPublicationResult = { published: 0, duplicateSkipped: 0, conflicts: 0 };
      for (;;) {
        const result = executor
          ? await publish(executor)
          : await withTransaction(getDatabasePool(), publish);
        totals.published += result.published;
        totals.duplicateSkipped += result.duplicateSkipped;
        totals.conflicts += result.conflicts;
        if (result.complete) return totals;
      }
    },
  };
}
