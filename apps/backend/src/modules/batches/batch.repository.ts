import { randomUUID } from 'node:crypto';

import {
  classifyPublishedCricketDelivery,
  type ComparableCricketDelivery,
  type FixtureProposal,
  type PublishedCricketDelivery,
} from '@sport-analytics/contracts';

import { executeQuery, getDatabasePool, withTransaction, type QueryExecutor } from '../../database';

import {
  BatchPublicationLeaseBusyError,
  publishAcceptedBatchChunk,
} from '@sport-analytics/batch-processing';
import type { FixtureOnboardingParticipant, FixtureOnboardingInnings } from './fixture-onboarding';

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
  sourceFileName: string | null;
  submitterDisplayName: string | null;
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
  replacesBatchReference?: string;
}

interface BatchLineageRecord {
  replacesBatchReference: string | null;
  supersededByBatchReference: string | null;
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
  operation?: 'upsert' | 'correction';
  correctsSourceIdentity?: string | null;
  correctionTargetDeliveryId?: string | null;
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
  operation: 'upsert' | 'correction' | null;
  correctsSourceIdentity: string | null;
  correctionTargetDeliveryId: string | null;
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
  fixtureId?: string | null;
  fixtureLabel?: string | null;
  inningsId: string | null;
  overNumber: number | null;
  positionInOver: number | null;
  sourceIdentity: string | null;
  sourceLocation: JsonValue | null;
  referenceResolutionState: BatchReferenceResolutionState | null;
  resolvedReferences: JsonValue | null;
  state: BatchItemState | null;
  rejectionCode: string | null;
  rejectionDetail?: JsonValue | null;
  payload?: JsonValue | null;
  publishedEventId: string | null;
  operation: 'upsert' | 'correction';
  correctsSourceIdentity: string | null;
  correctionTargetDeliveryId: string | null;
  publishedConflictSourceEventId?: string | null;
  errors: BatchReportErrorRecord[];
}

interface BatchRuleGroupRecord {
  ruleCode: string;
  count: number;
}

interface BatchFixtureSummaryRecord {
  fixtureId: string | null;
  label: string;
  total: number;
  accepted: number;
  rejected: number;
  unresolved: number;
}

interface BatchResolutionCountsRecord {
  resolved: number;
  ambiguous: number;
  unresolved: number;
  invalid: number;
  proposed: number;
}

interface BatchPublicationResult {
  published: number;
  duplicateSkipped: number;
  conflicts: number;
}

class BatchLeaseBusyError extends Error {
  constructor() {
    super('Another worker currently owns the publication lease.');
    this.name = 'BatchLeaseBusyError';
  }
}

interface BatchItemPageOptions {
  afterOrdinal?: number;
  acceptedOnly?: boolean;
  blockingOnly?: boolean;
  limit: number;
}

const BATCH_ITEM_APPROVAL_BLOCKER_SQL = `(
  i.reference_resolution_state IS DISTINCT FROM 'resolved'
  OR i.rejection_code LIKE '%CONFLICT%'
)`;
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

interface ResolvePublishedConflictInput {
  batchId: string;
  actorId: string;
  itemOrdinal: number;
  existingDeliveryId: string;
  decision: 'use_existing' | 'replace_published';
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

interface FixtureOnboardingUnresolvedParticipant {
  name: string;
  teamName?: string;
  candidates: { personId: string; displayName: string }[];
}

interface FixtureOnboardingSummary {
  inningsCreated: number;
  squadCreated: number;
  unresolvedParticipants: FixtureOnboardingUnresolvedParticipant[];
}

export class BatchReviewConflictError extends Error {}
export class BatchReviewResolutionError extends Error {}
export class BatchReferenceMappingConflictError extends Error {}
export class BatchPublishedConflictResolutionError extends Error {}
export class BatchReplacementConflictError extends Error {}

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
    status?: BatchState;
    limit: number;
  }): Promise<BatchRecord[]>;
  countNonTerminalBatches(submitterId: string): Promise<number>;
  getBatchProgress(batchId: string): Promise<BatchProgressRecord>;
  getBatchCounts(batchId: string): Promise<BatchCountsRecord>;
  getBatchLineage(batchId: string): Promise<BatchLineageRecord>;
  listBatchReportItems(
    batchId: string,
    options: BatchItemPageOptions,
  ): Promise<BatchReportItemRecord[]>;
  listBatchRuleGroups(batchId: string): Promise<BatchRuleGroupRecord[]>;
  countBlockingValidationErrors(batchId: string): Promise<number>;
  getBatchResolutionCounts(batchId: string): Promise<BatchResolutionCountsRecord>;
  listBatchFixtureSummaries(batchId: string): Promise<BatchFixtureSummaryRecord[]>;
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
  resolvePublishedConflict(input: ResolvePublishedConflictInput): Promise<BatchItemRecord>;
  queueReferenceMapping(input: QueueReferenceMappingInput): Promise<BatchReferenceMappingRecord>;
  createCanonicalFixtureAndQueueMapping(input: {
    batchId: string;
    batchReference: string;
    competitionId: string;
    actorId: string;
    itemOrdinal: number;
    referencePath: string;
    decisionKey: string;
    sourceRef: string;
    season: string;
    startDate: string;
    teamNames: string[];
    proposal: FixtureProposal;
    innings?: FixtureOnboardingInnings[];
    participants?: FixtureOnboardingParticipant[];
  }): Promise<BatchReferenceMappingRecord & { onboarding?: FixtureOnboardingSummary }>;
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
  sourceFileName: string | null;
  submitterDisplayName: string | null;
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
  (SELECT so.original_filename FROM stored_object so
    WHERE 'stored-object:' || so.object_id::text = batch.source_uri) AS "sourceFileName",
  (SELECT au.display_name FROM app_user au
    WHERE au.app_user_id = batch.submitter_id) AS "submitterDisplayName",
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
  published_event_id::text AS "publishedEventId",
  operation::text AS operation,
  corrects_source_identity AS "correctsSourceIdentity",
  correction_target_delivery_id::text AS "correctionTargetDeliveryId"
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
  ${table}.published_event_id::text AS "publishedEventId",
  ${table}.operation::text AS operation,
  ${table}.corrects_source_identity AS "correctsSourceIdentity",
  ${table}.correction_target_delivery_id::text AS "correctionTargetDeliveryId"
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
    sourceFileName: row.sourceFileName,
    submitterDisplayName: row.submitterDisplayName,
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

async function ensureBatchPublicationJob(
  target: QueryExecutor,
  batchId: string,
  ownerId: string,
): Promise<void> {
  const jobId = randomUUID();

  const inserted = await executeQuery<{ jobId: string }>(
    target,
    `INSERT INTO background_job (
       job_id,
       job_type,
       contract_version,
       idempotency_key,
       owner_id,
       batch_id,
       progress_total
     )
     SELECT
       $1::uuid,
       'batch.publish',
       1,
       $2,
       $3::bigint,
       $4::bigint,
       count(*)::integer
     FROM batch_item
     WHERE batch_id = $4::bigint
       AND state = 'accepted'
     ON CONFLICT (idempotency_key) DO NOTHING
     RETURNING job_id::text AS "jobId"`,
    [jobId, `batch.publish:${batchId}`, ownerId, batchId],
  );

  const createdJobId = inserted.rows[0]?.jobId;

  // A retry of the same approval must reuse the already-created job
  // rather than publishing twice.
  if (!createdJobId) {
    return;
  }

  const commandId = randomUUID();

  await executeQuery(
    target,
    `INSERT INTO outbox_message (
       outbox_message_id,
       job_id,
       message_type,
       contract_version,
       body
     )
     VALUES (
       $1::uuid,
       $2::uuid,
       'batch.publish',
       1,
       jsonb_build_object(
         'type', 'batch.publish',
         'version', 1,
         'commandId', $1::text,
         'jobId', $2::text,
         'batchId', $3::text
       )
     )`,
    [commandId, createdJobId, batchId],
  );
}

/**
 * Issue #584: a reviewer-approved fixture proposal only carries fixture-level
 * facts. Every innings and every squad member the new fixture needs still
 * exists only as an unresolved reference on the deliveries that named them.
 * This creates them deterministically so the batch's next validation pass can
 * resolve those references the same way it resolves them for any
 * already-known fixture, instead of leaving them permanently unresolved.
 *
 * A participant identified only by name is matched against the *global*
 * person table (there is no fixture squad yet to scope the match to). A name
 * matching more than one existing person is never guessed at: it is reported
 * back as ambiguous so a reviewer can disambiguate explicitly, and no
 * fixture_squad row is written for it.
 */
async function onboardFixtureCanonicalContext(
  executor: QueryExecutor,
  fixtureId: string,
  teamIdByName: Map<string, string>,
  innings: FixtureOnboardingInnings[],
  participants: FixtureOnboardingParticipant[],
): Promise<FixtureOnboardingSummary> {
  let inningsCreated = 0;
  if (innings.length > 0) {
    const rows = innings.flatMap((entry) => {
      const battingTeamId = teamIdByName.get(entry.battingTeamName);
      return battingTeamId ? [{ ordinal: entry.ordinal, battingTeamId }] : [];
    });
    if (rows.length > 0) {
      const result = await executeQuery(
        executor,
        `INSERT INTO innings (fixture_id, ordinal, batting_team_id)
         SELECT $1::bigint, r.ordinal, r."battingTeamId"::bigint
         FROM jsonb_to_recordset($2::jsonb) AS r(ordinal int, "battingTeamId" text)
         ON CONFLICT (fixture_id, ordinal) DO NOTHING
         RETURNING innings_id`,
        [fixtureId, JSON.stringify(rows)],
      );
      inningsCreated = result.rowCount ?? result.rows.length;
    }
  }

  let squadCreated = 0;
  const unresolvedParticipants: FixtureOnboardingUnresolvedParticipant[] = [];

  for (const participant of participants) {
    const teamId = participant.teamName ? teamIdByName.get(participant.teamName) : undefined;
    if (!teamId) continue;

    let personId: string | undefined;

    if (participant.sourceId) {
      // `person.source_ref` is a durable registry identifier (comment on the
      // column: "Names are not stable ... Names must never be used as a join
      // key."), so a participant carrying one can always be safely created
      // or reused without risking a false match.
      const identifier = participant.sourceId.split(':', 3);
      const namespace = identifier[0];
      const value = identifier[2];
      if (namespace === 'app' && value) {
        const existing = await executeQuery<{ personId: string }>(
          executor,
          `SELECT person_id::text AS "personId" FROM person WHERE person_id = $1::bigint`,
          [value],
        );
        personId = existing.rows[0]?.personId;
      } else if (value) {
        const upserted = await executeQuery<{ personId: string }>(
          executor,
          `INSERT INTO person (source_ref, display_name)
           VALUES ($1, COALESCE($2, $1))
           ON CONFLICT (source_ref) DO NOTHING
           RETURNING person_id::text AS "personId"`,
          [value, participant.name ?? null],
        );
        personId =
          upserted.rows[0]?.personId ??
          (
            await executeQuery<{ personId: string }>(
              executor,
              `SELECT person_id::text AS "personId" FROM person WHERE source_ref = $1`,
              [value],
            )
          ).rows[0]?.personId;
      }
      if (!personId && participant.name) {
        unresolvedParticipants.push({
          name: participant.name,
          ...(participant.teamName ? { teamName: participant.teamName } : {}),
          candidates: [],
        });
        continue;
      }
    } else if (participant.name) {
      // No durable identifier was submitted. A name alone is never enough to
      // safely create or match a canonical person (see the note on
      // `person.source_ref`), so this is always reported for a reviewer to
      // resolve explicitly - by supplying a registry identifier, or by
      // picking one of any existing aliases that share the name - rather
      // than guessed at or silently created.
      const aliasMatches = await executeQuery<{ personId: string; displayName: string }>(
        executor,
        `SELECT DISTINCT p.person_id::text AS "personId", p.display_name AS "displayName"
         FROM person p
         LEFT JOIN person_alias pa ON pa.person_id = p.person_id
         WHERE p.display_name = $1 OR pa.name = $1`,
        [participant.name],
      );
      unresolvedParticipants.push({
        name: participant.name,
        ...(participant.teamName ? { teamName: participant.teamName } : {}),
        candidates: aliasMatches.rows.map((row) => ({
          personId: row.personId,
          displayName: row.displayName,
        })),
      });
      continue;
    }

    if (!personId) continue;

    const inserted = await executeQuery(
      executor,
      `INSERT INTO fixture_squad (fixture_id, person_id, team_id)
       VALUES ($1::bigint, $2::bigint, $3::bigint)
       ON CONFLICT (fixture_id, person_id) DO NOTHING
       RETURNING fixture_id`,
      [fixtureId, personId, teamId],
    );
    squadCreated += inserted.rowCount ?? inserted.rows.length;
  }

  return { inningsCreated, squadCreated, unresolvedParticipants };
}

export function createBatchRepository(executor?: QueryExecutor): BatchRepository {
  function database(): QueryExecutor {
    return executor ?? getDatabasePool();
  }

  async function queryBlockingValidationErrorCount(
    target: QueryExecutor,
    batchId: string,
  ): Promise<number> {
    const result = await executeQuery<{ count: string }>(
      target,
      `SELECT count(*)::text AS count
       FROM batch_validation_result validation
       WHERE validation.batch_id = $1::bigint
         AND validation.severity = 'error'
         AND validation.active
         AND (
           (validation.batch_item_id IS NULL AND validation.source_ordinal IS NULL)
           OR EXISTS (
             SELECT 1
             FROM batch_item item
             WHERE item.batch_item_id = validation.batch_item_id
               AND item.batch_id = validation.batch_id
               AND item.state NOT IN ('rejected', 'duplicate_skipped')
           )
         )`,
      [batchId],
    );
    return Number(result.rows[0]?.count ?? 0);
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
        let replacementTarget: BatchRecord | null = null;
        if (input.replacesBatchReference) {
          const target = await executeQuery<BatchRow>(
            executor,
            `SELECT ${batchSelection} FROM batch
             WHERE batch_reference = $1::uuid
             FOR UPDATE`,
            [input.replacesBatchReference],
          );
          replacementTarget = target.rows[0] ? mapBatch(target.rows[0]) : null;
          if (
            !replacementTarget ||
            replacementTarget.submitterId !== input.submitterId ||
            replacementTarget.competitionId !== input.competitionId
          ) {
            throw new BatchReplacementConflictError(
              'The selected correction request cannot be replaced by this upload.',
            );
          }
          if (existing && existing.source?.checksum !== input.source?.checksum) {
            throw new BatchReplacementConflictError(
              'The replacement upload key is already associated with different batch content.',
            );
          }
          if (
            replacementTarget.state === 'superseded' &&
            replacementTarget.supersededBy === existing?.batchId
          ) {
            return { batch: existing, created: false, activeLimitReached: false };
          }
          if (replacementTarget.state !== 'correction_requested') {
            throw new BatchReplacementConflictError(
              'Only a batch returned for correction can receive a replacement upload.',
            );
          }
          if (existing) {
            const alreadyReplaces = await executeQuery<{ batchReference: string }>(
              executor,
              `SELECT batch_reference::text AS "batchReference" FROM batch
               WHERE superseded_by = $1::bigint
               LIMIT 1`,
              [existing.batchId],
            );
            if (alreadyReplaces.rows[0]) {
              throw new BatchReplacementConflictError(
                'This replacement upload is already linked to another correction request.',
              );
            }
          }
        }
        if (existing && !replacementTarget) {
          return { batch: existing, created: false, activeLimitReached: false };
        }
        const active = await executeQuery<{ count: string }>(
          executor,
          `SELECT count(*)::text AS count FROM batch
           WHERE submitter_id = $1::bigint
             AND state NOT IN (
               'rejected', 'correction_requested', 'published', 'partially_published', 'superseded',
               'failed'
             )`,
          [input.submitterId],
        );
        if (Number(active.rows[0]?.count ?? 0) >= 3) {
          return { batch: null, created: false, activeLimitReached: true };
        }
        const replacement = existing ?? (await insertBatchAndValidationJob(executor, input));
        if (replacementTarget) {
          const linked = await executeQuery(
            executor,
            `UPDATE batch
             SET state = 'superseded', superseded_by = $2::bigint
             WHERE batch_id = $1::bigint
               AND state = 'correction_requested'
               AND superseded_by IS NULL
             RETURNING batch_id`,
            [replacementTarget.batchId, replacement.batchId],
          );
          if (!linked.rows[0]) {
            throw new BatchReplacementConflictError(
              'The correction request was replaced by another upload.',
            );
          }
          await executeQuery(
            executor,
            `INSERT INTO batch_state_transition (
               batch_id, from_state, to_state, actor_kind, actor_identifier, reason
             ) VALUES (
               $1::bigint, 'correction_requested', 'superseded', 'api', $2, $3
             )`,
            [
              replacementTarget.batchId,
              input.submitterId,
              `Corrected replacement batch ${replacement.batchReference} submitted.`,
            ],
          );
        }
        return {
          batch: replacement,
          created: !existing,
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
      if (options.status) {
        values.push(options.status);
        filters.push(`state = $${values.length}::batch_state`);
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
             'rejected', 'correction_requested', 'published', 'partially_published', 'superseded',
             'failed'
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

    async getBatchLineage(batchId) {
      const result = await executeQuery<BatchLineageRecord>(
        database(),
        `SELECT
           predecessor.batch_reference::text AS "replacesBatchReference",
           replacement.batch_reference::text AS "supersededByBatchReference"
         FROM batch current_batch
         LEFT JOIN batch predecessor ON predecessor.superseded_by = current_batch.batch_id
         LEFT JOIN batch replacement ON replacement.batch_id = current_batch.superseded_by
         WHERE current_batch.batch_id = $1::bigint
         ORDER BY predecessor.batch_id DESC
         LIMIT 1`,
        [batchId],
      );
      return (
        result.rows[0] ?? {
          replacesBatchReference: null,
          supersededByBatchReference: null,
        }
      );
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
            fixture.fixture_id::text AS "fixtureId",
            CASE
              WHEN fixture.fixture_id IS NULL THEN NULL
              ELSE COALESCE(
                (SELECT string_agg(team.name, ' vs ' ORDER BY fixture_team.ordinal)
                 FROM fixture_team JOIN team ON team.team_id = fixture_team.team_id
                 WHERE fixture_team.fixture_id = fixture.fixture_id),
                'Fixture ' || fixture.fixture_id::text
              ) || ' · ' || fixture.start_date::text
            END AS "fixtureLabel",
            i.innings_id::text AS "inningsId",
            i.over_number AS "overNumber",
            i.position_in_over AS "positionInOver",
            i.source_identity AS "sourceIdentity",
            i.source_location AS "sourceLocation",
            i.reference_resolution_state::text AS "referenceResolutionState",
            i.resolved_references AS "resolvedReferences",
            i.state::text AS state,
            i.rejection_code AS "rejectionCode",
            i.rejection_detail AS "rejectionDetail",
            i.payload,
            i.published_event_id::text AS "publishedEventId",
            i.operation::text AS operation,
            i.corrects_source_identity AS "correctsSourceIdentity",
            i.correction_target_delivery_id::text AS "correctionTargetDeliveryId",
            conflict_delivery.source_event_id::text AS "publishedConflictSourceEventId",
            COALESCE(errors.rows, '[]'::jsonb) AS errors
          FROM subjects
          LEFT JOIN batch_item i
            ON i.batch_id = $1::bigint AND i.ordinal = subjects.ordinal
          LEFT JOIN delivery conflict_delivery
            ON conflict_delivery.delivery_id = CASE
              WHEN i.rejection_detail->>'existingDeliveryId' ~ '^[0-9]+$'
                THEN (i.rejection_detail->>'existingDeliveryId')::bigint
              ELSE NULL
            END
           AND conflict_delivery.superseded_at IS NULL
          LEFT JOIN innings ON innings.innings_id = i.innings_id
          LEFT JOIN fixture ON fixture.fixture_id = innings.fixture_id
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
            AND (
              NOT $4::boolean OR (
                i.state IN ('accepted', 'published')
                AND i.reference_resolution_state = 'resolved'
                AND i.rejection_code IS NULL
                AND jsonb_array_length(COALESCE(errors.rows, '[]'::jsonb)) = 0
              )
            )
            AND (
              NOT $5::boolean OR (
                i.batch_item_id IS NOT NULL
                AND ${BATCH_ITEM_APPROVAL_BLOCKER_SQL}
              )
            )
          ORDER BY subjects.ordinal
          LIMIT $3::integer
        `,
        [
          batchId,
          options.afterOrdinal ?? -1,
          options.limit,
          options.acceptedOnly ?? false,
          options.blockingOnly ?? false,
        ],
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

    async countBlockingValidationErrors(batchId) {
      return queryBlockingValidationErrorCount(database(), batchId);
    },

    async getBatchResolutionCounts(batchId) {
      const result = await executeQuery<{
        resolved: string;
        ambiguous: string;
        unresolved: string;
        invalid: string;
        proposed: string;
      }>(
        database(),
        `SELECT
           count(*) FILTER (WHERE reference_resolution_state = 'resolved')::text AS resolved,
           count(*) FILTER (WHERE reference_resolution_state = 'ambiguous')::text AS ambiguous,
           count(*) FILTER (WHERE reference_resolution_state = 'unresolved')::text AS unresolved,
           count(*) FILTER (WHERE reference_resolution_state = 'invalid')::text AS invalid,
           count(*) FILTER (
             WHERE reference_resolution_state <> 'resolved'
               AND jsonb_path_exists(resolved_references, '$.**.candidates[*]')
           )::text AS proposed
         FROM batch_item WHERE batch_id = $1::bigint`,
        [batchId],
      );
      const row = requireRow(result.rows[0], 'Batch resolution count lookup');
      return {
        resolved: Number(row.resolved),
        ambiguous: Number(row.ambiguous),
        unresolved: Number(row.unresolved),
        invalid: Number(row.invalid),
        proposed: Number(row.proposed),
      };
    },

    async listBatchFixtureSummaries(batchId) {
      const result = await executeQuery<{
        fixtureId: string | null;
        label: string;
        total: string;
        accepted: string;
        rejected: string;
        unresolved: string;
      }>(
        database(),
        `SELECT f.fixture_id::text AS "fixtureId",
                COALESCE(
                  (SELECT string_agg(t.name, ' vs ' ORDER BY ft.ordinal)
                   FROM fixture_team ft JOIN team t ON t.team_id = ft.team_id
                   WHERE ft.fixture_id = f.fixture_id) || ' · ' || f.start_date::text,
                  'Fixture unresolved'
                ) AS label,
                count(*)::text AS total,
                count(*) FILTER (WHERE bi.state IN ('accepted','published','duplicate_skipped'))::text AS accepted,
                count(*) FILTER (WHERE bi.state = 'rejected')::text AS rejected,
                count(*) FILTER (WHERE bi.reference_resolution_state <> 'resolved')::text AS unresolved
         FROM batch_item bi
         LEFT JOIN innings i ON i.innings_id = bi.innings_id
         LEFT JOIN fixture f ON f.fixture_id = i.fixture_id
         WHERE bi.batch_id = $1::bigint
         GROUP BY f.fixture_id, f.start_date
         ORDER BY min(bi.ordinal)`,
        [batchId],
      );
      return result.rows.map((row) => ({
        fixtureId: row.fixtureId,
        label: row.label,
        total: Number(row.total),
        accepted: Number(row.accepted),
        rejected: Number(row.rejected),
        unresolved: Number(row.unresolved),
      }));
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
          item.operation ?? 'upsert',
          item.correctsSourceIdentity ?? null,
          item.correctionTargetDeliveryId ?? null,
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
          $${first + 12}::bigint,
          $${first + 13}::batch_item_operation,
          $${first + 14}::text,
          $${first + 15}::bigint
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
            published_event_id,
            operation,
            corrects_source_identity,
            correction_target_delivery_id
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

        const resumePublication = existing.decision === 'approved' && batch.state === 'publishing';

        if (resumePublication) {
          await ensureBatchPublicationJob(executor, input.batchId, existing.actorId);
        }

        return {
          batch,
          review: existing,
          resumePublication,
        };
      }
      if (batch.state !== 'awaiting_review') {
        throw new BatchReviewConflictError(
          'Only a validated batch awaiting review can be decided.',
        );
      }
      if (input.decision === 'approved') {
        const blockingValidationErrors = await queryBlockingValidationErrorCount(
          executor,
          input.batchId,
        );
        const otherBlockers = await executeQuery<{ count: string }>(
          executor,
          `SELECT (
             (SELECT count(*) FROM batch_item i
              WHERE i.batch_id = $1::bigint
                AND ${BATCH_ITEM_APPROVAL_BLOCKER_SQL})
           )::text AS count`,
          [input.batchId],
        );
        if (blockingValidationErrors + Number(otherBlockers.rows[0]?.count ?? 0) > 0) {
          throw new BatchReviewResolutionError(
            'Resolve all blocking validation errors, conflicts and references before approval.',
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

      if (input.decision === 'approved') {
        await ensureBatchPublicationJob(executor, input.batchId, input.actorId);
      }

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

    async resolvePublishedConflict(input) {
      if (!executor) {
        return withTransaction(getDatabasePool(), (client) =>
          createBatchRepository(client).resolvePublishedConflict(input),
        );
      }

      const lockedBatch = await executeQuery<BatchRow>(
        executor,
        `SELECT ${batchSelection} FROM batch WHERE batch_id=$1::bigint FOR UPDATE`,
        [input.batchId],
      );
      const batch = mapBatch(requireRow(lockedBatch.rows[0], 'Batch conflict resolution lookup'));
      if (batch.state !== 'awaiting_review') {
        throw new BatchPublishedConflictResolutionError(
          'Only a batch awaiting review can resolve published-delivery conflicts.',
        );
      }

      const itemResult = await executeQuery<BatchItemRecord>(
        executor,
        `SELECT ${batchItemSelectionFor('batch_item')}
         FROM batch_item
         WHERE batch_id=$1::bigint AND ordinal=$2::integer
         FOR UPDATE`,
        [input.batchId, input.itemOrdinal],
      );
      const item = requireRow(itemResult.rows[0], 'Batch conflict item lookup');
      if (item.rejectionCode !== 'PUBLISHED_DELIVERY_CONFLICT' || item.state !== 'rejected') {
        throw new BatchPublishedConflictResolutionError(
          'This staged item no longer has a published-delivery conflict to resolve.',
        );
      }

      const submitted = comparableDeliveryForItem(item, payloadRecord(item.payload));
      const currentMatches = await publishedDeliveryMatchesForItem(executor, item);
      const conflicts = currentMatches.filter(
        (match) => classifyPublishedCricketDelivery(submitted, match.delivery) === 'conflict',
      );
      const target = conflicts.find((match) => match.deliveryId === input.existingDeliveryId);
      if (!target || conflicts.length !== 1) {
        throw new BatchPublishedConflictResolutionError(
          'The published conflict changed or is ambiguous. Refresh the report before deciding.',
        );
      }

      let correctionIdentity: { sourceEventId: string; sequenceNumber: number } | null = null;
      if (input.decision === 'replace_published') {
        const targetIdentity = await executeQuery<{
          sourceEventId: string | null;
          sequenceNumber: number;
        }>(
          executor,
          `SELECT source_event_id::text AS "sourceEventId",
                  innings_sequence AS "sequenceNumber"
           FROM ensure_delivery_legacy_lineage($1::bigint)`,
          [target.deliveryId],
        );
        const identity = targetIdentity.rows[0];
        if (!identity?.sourceEventId) {
          throw new BatchPublishedConflictResolutionError(
            'This published delivery predates immutable lineage. Keep the published delivery or migrate its provenance before approving a correction.',
          );
        }
        correctionIdentity = {
          sourceEventId: identity.sourceEventId,
          sequenceNumber: identity.sequenceNumber,
        };
      }

      await executeQuery(
        executor,
        `INSERT INTO batch_published_conflict_resolution (
           batch_id,batch_item_id,existing_delivery_id,actor_id,decision,reason
         ) VALUES ($1::bigint,$2::bigint,$3::bigint,$4::bigint,$5::batch_published_conflict_decision,$6)`,
        [
          input.batchId,
          item.batchItemId,
          target.deliveryId,
          input.actorId,
          input.decision,
          input.reason,
        ],
      );

      // batch_validation_result_current_ck requires an inactive result to record
      // when it was superseded; setting active alone rejects every resolution (#529).
      await executeQuery(
        executor,
        `UPDATE batch_validation_result
         SET active=false, superseded_at=now()
         WHERE batch_id=$1::bigint
           AND batch_item_id=$2::bigint
           AND rule_code='PUBLISHED_DELIVERY_CONFLICT'
           AND active`,
        [input.batchId, item.batchItemId],
      );

      if (input.decision === 'use_existing') {
        await executeQuery(
          executor,
          `UPDATE batch_item
           SET state='duplicate_skipped',
               rejection_code=NULL,
               rejection_detail=NULL,
               published_event_id=$2::bigint,
               operation='upsert',
               corrects_source_identity=NULL,
               correction_target_delivery_id=NULL
           WHERE batch_item_id=$1::bigint`,
          [item.batchItemId, target.deliveryId],
        );
      } else {
        await executeQuery(
          executor,
          `UPDATE batch_item
           SET state='accepted',
               rejection_code=NULL,
               rejection_detail=NULL,
               published_event_id=NULL,
               operation='correction',
               corrects_source_identity=$2,
               correction_target_delivery_id=$3::bigint,
               payload=jsonb_set(payload, '{sequenceNumber}', to_jsonb($4::integer), true)
           WHERE batch_item_id=$1::bigint`,
          [
            item.batchItemId,
            correctionIdentity!.sourceEventId,
            target.deliveryId,
            correctionIdentity!.sequenceNumber,
          ],
        );
      }

      const updated = await executeQuery<BatchItemRecord>(
        executor,
        `SELECT ${batchItemSelectionFor('batch_item')}
         FROM batch_item WHERE batch_item_id=$1::bigint`,
        [item.batchItemId],
      );
      return requireRow(updated.rows[0], 'Resolved batch conflict reload');
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

    async createCanonicalFixtureAndQueueMapping(input) {
      if (!executor)
        return withTransaction(getDatabasePool(), (client) =>
          createBatchRepository(client).createCanonicalFixtureAndQueueMapping(input),
        );
      const existing = await executeQuery<{ fixtureId: string; competitionId: string }>(
        executor,
        `SELECT fixture_id::text AS "fixtureId", competition_id::text AS "competitionId"
         FROM fixture WHERE source_ref=$1 FOR UPDATE`,
        [input.sourceRef],
      );
      const existingFixture = existing.rows[0];
      if (existingFixture && existingFixture.competitionId !== input.competitionId) {
        throw new BatchReferenceMappingConflictError(
          'A fixture with this source reference belongs to a different competition.',
        );
      }
      let fixtureId = existingFixture?.fixtureId;
      let onboarding: FixtureOnboardingSummary | undefined;
      if (!fixtureId) {
        const teams = await executeQuery<{ teamId: string; name: string }>(
          executor,
          `SELECT team_id::text AS "teamId", name FROM team WHERE name = ANY($1::text[])`,
          [input.teamNames],
        );
        if (teams.rows.length !== 2)
          throw new BatchReferenceMappingConflictError(
            'Both proposed fixture teams must already be canonical records.',
          );
        const teamIdByName = new Map(teams.rows.map((row) => [row.name, row.teamId]));
        const proposal = input.proposal;
        const inserted = await executeQuery<{ fixtureId: string }>(
          executor,
          `INSERT INTO fixture (source_ref,competition_id,season,match_type,team_type,gender,balls_per_over,start_date,end_date,outcome,source_version,source_revision)
           VALUES ($1,$2::bigint,$3,$4,$5,$6,$7::smallint,$8::date,$9::date,$10::outcome_kind,$11,$12::int)
           ON CONFLICT (source_ref) DO NOTHING RETURNING fixture_id::text AS "fixtureId"`,
          [
            input.sourceRef,
            input.competitionId,
            input.season,
            proposal.matchType,
            proposal.teamType,
            proposal.gender,
            proposal.ballsPerOver,
            input.startDate,
            proposal.endDate,
            proposal.outcome,
            proposal.sourceVersion,
            proposal.sourceRevision,
          ],
        );
        fixtureId = inserted.rows[0]?.fixtureId;
        if (!fixtureId) {
          const concurrentFixture = (
            await executeQuery<{ fixtureId: string; competitionId: string }>(
              executor,
              `SELECT fixture_id::text AS "fixtureId", competition_id::text AS "competitionId"
               FROM fixture WHERE source_ref=$1`,
              [input.sourceRef],
            )
          ).rows[0];
          if (concurrentFixture && concurrentFixture.competitionId !== input.competitionId) {
            throw new BatchReferenceMappingConflictError(
              'A fixture with this source reference belongs to a different competition.',
            );
          }
          fixtureId = concurrentFixture?.fixtureId;
        }
        if (!fixtureId)
          throw new BatchReferenceMappingConflictError('The fixture could not be created.');
        await executeQuery(
          executor,
          `INSERT INTO fixture_team (fixture_id,team_id,ordinal)
          SELECT $1::bigint, team_id, ordinal FROM unnest($2::text[]) WITH ORDINALITY AS proposed(name,ordinal)
          JOIN team ON team.name=proposed.name ON CONFLICT DO NOTHING`,
          [fixtureId, input.teamNames],
        );
        onboarding = await onboardFixtureCanonicalContext(
          executor,
          fixtureId,
          teamIdByName,
          input.innings ?? [],
          input.participants ?? [],
        );
      }
      await executeQuery(
        executor,
        `INSERT INTO batch_canonical_fixture_decision (batch_id,reference_path,fixture_id,actor_id)
        VALUES ($1::bigint,$2,$3::bigint,$4::bigint) ON CONFLICT (batch_id,reference_path) DO NOTHING`,
        [input.batchId, input.referencePath, fixtureId, input.actorId],
      );
      const mapped = await createBatchRepository(executor).queueReferenceMapping({
        decisionReference: randomUUID(),
        batchId: input.batchId,
        actorId: input.actorId,
        itemOrdinal: input.itemOrdinal,
        referencePath: input.referencePath,
        entityType: 'fixture',
        candidateId: fixtureId,
        candidateLabel: `Canonical fixture ${fixtureId}`,
        decisionKey: input.decisionKey,
      });
      return onboarding ? { ...mapped, onboarding } : mapped;
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
      const totals: BatchPublicationResult = {
        published: 0,
        duplicateSkipped: 0,
        conflicts: 0,
      };

      for (;;) {
        try {
          const result = executor
            ? await publishAcceptedBatchChunk(executor, batchId, workerId, {
                chunkSize: 100,
                leaseMs: 300_000,
              })
            : await withTransaction(getDatabasePool(), (target) =>
                publishAcceptedBatchChunk(target, batchId, workerId, {
                  chunkSize: 100,
                  leaseMs: 300_000,
                }),
              );

          totals.published += result.published;
          totals.duplicateSkipped += result.duplicateSkipped;
          totals.conflicts += result.conflicts;

          if (result.complete) {
            return totals;
          }
        } catch (error) {
          if (error instanceof BatchPublicationLeaseBusyError) {
            throw new BatchLeaseBusyError();
          }

          throw error;
        }
      }
    },
  };
}
