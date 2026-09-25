import { createHash } from 'node:crypto';
import type { Readable } from 'node:stream';

import {
  resolvePackageReferences,
  type ReferenceResolutionOverride,
} from '@sport-analytics/batch-processing';
import {
  createCricketValidationState,
  submissionEventSchema,
  validateCricketBusinessRules,
  type CricketValidationContext,
  type CricketValidationResult,
  type CricketValidationState,
  type SubmissionEvent,
} from '@sport-analytics/contracts';
import {
  classifyPublishedCricketDelivery,
  diffPublishedCricketDelivery,
  type PublishedCricketDelivery,
} from '@sport-analytics/contracts';
import type { Pool, PoolClient } from 'pg';
import { z } from 'zod';

import {
  buildReferenceChunk,
  canonicaliseCandidates,
  normalisedBatchCandidates,
  scanBatchReferences,
  type NormalisedCandidate,
  type OpenBatchSource,
  type SourceFault,
} from './batch-package';
import { PermanentJobError, type ReceivedJob } from './delivery-pump';
import type { Logger } from './logger';

const batchValidationJobSchema = z.object({
  type: z.literal('batch.validate'),
  version: z.literal(1),
  commandId: z.string().uuid(),
  jobId: z.string().uuid(),
  batchId: z.string().regex(/^[1-9]\d*$/),
  batchReference: z.string().uuid(),
  traceId: z.string().trim().min(1).max(128).optional(),
});

interface ReferenceMappingRow {
  decisionReference: string;
  itemOrdinal: number;
  referencePath: string;
  entityType: ReferenceResolutionOverride['entityType'];
  canonicalId: string;
}

export function isReviewerActionableFixtureResolution(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;

  const resolution = value as {
    entityType?: unknown;
    state?: unknown;
    submittedReference?: unknown;
  };
  if (resolution.entityType !== 'fixture' || resolution.state !== 'unresolved') return false;

  const submitted = resolution.submittedReference;
  if (!submitted || typeof submitted !== 'object') return false;

  const fixture = submitted as { sourceId?: unknown; proposal?: unknown };
  if (
    typeof fixture.sourceId !== 'string' ||
    !fixture.proposal ||
    typeof fixture.proposal !== 'object'
  ) {
    return false;
  }

  // Proposal metadata has already crossed the package contract boundary before
  // reaching resolved_references. This guard rejects legacy/malformed evidence
  // without duplicating the complete upload contract in the worker.
  const proposal = fixture.proposal as Record<string, unknown>;
  return (
    typeof proposal.endDate === 'string' &&
    typeof proposal.matchType === 'string' &&
    typeof proposal.teamType === 'string' &&
    typeof proposal.gender === 'string' &&
    typeof proposal.ballsPerOver === 'number' &&
    Number.isInteger(proposal.ballsPerOver) &&
    proposal.ballsPerOver > 0 &&
    typeof proposal.outcome === 'string' &&
    typeof proposal.sourceVersion === 'string' &&
    typeof proposal.sourceRevision === 'number' &&
    Number.isInteger(proposal.sourceRevision) &&
    proposal.sourceRevision >= 0
  );
}

/**
 * A batch with nothing publishable is rejected, unless a reviewer still has
 * something they can do about it.
 *
 * Two kinds of outstanding work qualify. Issue #695 added the first: unresolved
 * fixture evidence carrying a complete proposal, which an administrator can turn
 * into a canonical fixture. Issue #708 adds the second: participants that
 * fixture creation could not onboard, recorded as tasks against the batch.
 *
 * The second exists because the first cures itself. Once the reviewer creates
 * the fixture it resolves, so the #695 guard stops applying — and if the new
 * fixture's squad is incomplete, every delivery still fails to resolve and the
 * batch was rejected terminally at the exact moment the reviewer had most
 * recently acted on it.
 */
export function finalBatchValidationState(
  accepted: number,
  hasReviewerActionableProposal: boolean,
  hasOutstandingOnboardingTask = false,
): 'awaiting_review' | 'rejected' {
  return accepted > 0 || hasReviewerActionableProposal || hasOutstandingOnboardingTask
    ? 'awaiting_review'
    : 'rejected';
}

type ParticipantOnboardingReason =
  'team_not_recognised' | 'no_durable_identifier' | 'identifier_not_found';

interface ReviewerActionableParticipantReference {
  fixtureId: string;
  participantKey: string;
  submittedName: string;
  submittedSourceId: string | null;
  submittedTeamName: string | null;
  reason: ParticipantOnboardingReason;
}

/**
 * Finds the subset of unresolved references a reviewer can settle through the
 * participant onboarding workflow. The resolver deliberately leaves a person
 * outside a resolved fixture squad unresolved; that is not malformed input,
 * because an authorised reviewer can associate the person with the fixture.
 */
export function reviewerActionableParticipantReferences(
  resolvedReferences: Record<string, unknown>,
): ReviewerActionableParticipantReference[] {
  const outcomes: Array<Record<string, unknown>> = [];
  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    const record = value as Record<string, unknown>;
    if (typeof record.entityType === 'string' && typeof record.state === 'string') {
      outcomes.push(record);
      return;
    }
    for (const nested of Object.values(record)) visit(nested);
  };
  visit(resolvedReferences);

  const fixtureId = outcomes.find(
    (outcome) =>
      outcome.entityType === 'fixture' &&
      outcome.state === 'resolved' &&
      typeof outcome.canonicalId === 'string' &&
      /^[1-9]\d*$/.test(outcome.canonicalId),
  )?.canonicalId;
  if (typeof fixtureId !== 'string') return [];

  return outcomes.flatMap((outcome) => {
    if (outcome.entityType !== 'participant' || outcome.state !== 'unresolved') return [];
    const submitted = outcome.submittedReference;
    if (!submitted || typeof submitted !== 'object' || Array.isArray(submitted)) return [];
    const reference = submitted as {
      sourceId?: unknown;
      context?: { name?: unknown; team?: { context?: { name?: unknown } } };
    };
    const sourceId = typeof reference.sourceId === 'string' ? reference.sourceId : null;
    const name = typeof reference.context?.name === 'string' ? reference.context.name : null;
    const teamName =
      typeof reference.context?.team?.context?.name === 'string'
        ? reference.context.team.context.name
        : null;
    const submittedName = name ?? sourceId;
    if (!submittedName) return [];
    return [
      {
        fixtureId,
        participantKey: sourceId
          ? `source:${sourceId}`
          : `name:${submittedName}::${teamName ?? ''}`,
        submittedName,
        submittedSourceId: sourceId,
        submittedTeamName: teamName,
        reason: teamName
          ? sourceId
            ? 'identifier_not_found'
            : 'no_durable_identifier'
          : 'team_not_recognised',
      },
    ];
  });
}

export function referenceOverridesForChunk(
  mappings: readonly ReferenceMappingRow[],
  referencePathByOrdinal: ReadonlyMap<number, string>,
) {
  const overrides = new Map<string, ReferenceResolutionOverride>();
  const decisionReferencesByPath = new Map<string, string[]>();
  const conflictingPaths = new Set<string>();
  for (const mapping of mappings) {
    const currentEventPath = referencePathByOrdinal.get(mapping.itemOrdinal);
    if (!currentEventPath) continue;
    const eventMarker = mapping.referencePath.match(/\.events\.\d+/);
    let currentPath: string;
    if (mapping.referencePath === 'competition') {
      currentPath = 'competition';
    } else if (eventMarker?.index !== undefined) {
      currentPath = `${currentEventPath}${mapping.referencePath.slice(eventMarker.index + eventMarker[0].length)}`;
    } else {
      const currentFixture = currentEventPath.match(/^fixtures\.\d+/)?.[0];
      const currentInnings = currentEventPath.match(/^fixtures\.\d+\.innings\.\d+/)?.[0];
      const storedInnings = mapping.referencePath.match(/^fixtures\.\d+\.innings\.\d+/)?.[0];
      const storedFixture = mapping.referencePath.match(/^fixtures\.\d+/)?.[0];
      if (storedInnings && currentInnings) {
        currentPath = `${currentInnings}${mapping.referencePath.slice(storedInnings.length)}`;
      } else if (storedFixture && currentFixture) {
        currentPath = `${currentFixture}${mapping.referencePath.slice(storedFixture.length)}`;
      } else {
        continue;
      }
    }
    const existing = overrides.get(currentPath);
    if (existing && existing.canonicalId !== mapping.canonicalId) {
      overrides.delete(currentPath);
      decisionReferencesByPath.delete(currentPath);
      conflictingPaths.add(currentPath);
      continue;
    }
    if (conflictingPaths.has(currentPath)) continue;
    overrides.set(currentPath, {
      entityType: mapping.entityType,
      canonicalId: mapping.canonicalId,
    });
    decisionReferencesByPath.set(currentPath, [
      ...(decisionReferencesByPath.get(currentPath) ?? []),
      mapping.decisionReference,
    ]);
  }
  return { overrides, decisionReferencesByPath };
}

interface StoredSource {
  storageKey: string;
  mediaType: string;
}

interface BatchObjectReader {
  read(storageKey: string): Promise<Readable>;
}

interface BatchValidationMetrics {
  acceptedItems: number;
  batchesFailed: number;
  batchesRejected: number;
  batchesSucceeded: number;
  chunksCommitted: number;
  rejectedItems: number;
}

interface HandlerOptions {
  workerId: string;
  chunkSize: number;
  leaseMs: number;
}

interface ClaimResult {
  terminal: boolean;
  batchId: string;
  batchReference: string;
  jobId: string;
  lastOrdinal: number;
  attemptCount: number;
  maxAttempts: number;
  sourceUri: string;
  competitionId: string;
}

export interface PreparedItem {
  ordinal: number;
  inningsId: string | null;
  overNumber: number;
  positionInOver: number;
  // Store the authoritative, resolved delivery shape. The source identity and
  // original references remain in their dedicated provenance columns.
  payload: Record<string, unknown>;
  operation: 'upsert' | 'correction';
  correctsSourceIdentity: string | null;
  correctionTargetDeliveryId: string | null;
  sourceIdentity: string;
  sourceLocation: Record<string, string | number | null>;
  referenceResolutionState: 'resolved' | 'ambiguous' | 'unresolved' | 'invalid';
  resolvedReferences: Record<string, unknown>;
  state: 'accepted' | 'rejected';
  rejectionCode: string | null;
  rejectionMessage: string | null;
  rejectionDetail: Record<string, unknown> | null;
}

interface LoadedBatchCricketContext {
  inningsById: Record<string, { battingTeamId: string; bowlingTeamId: string }>;
  participantTeamByInningsId: Record<string, Record<string, string>>;
  dismissalKinds: string[];
}

class LeaseBusyError extends Error {
  constructor() {
    super('Another worker currently owns the batch validation lease.');
    this.name = 'LeaseBusyError';
  }
}

class PermanentBatchFailure extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'PermanentBatchFailure';
  }
}

function deterministicEventUuid(sourceIdentity: string): string {
  const applicationUuid =
    /^app:delivery:([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.exec(
      sourceIdentity,
    )?.[1];
  if (applicationUuid) return applicationUuid.toLowerCase();

  const bytes = createHash('sha256')
    .update('sport-analytics:batch-event:v1\0')
    .update(sourceIdentity)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function transaction<T>(
  pool: Pool,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Preserve the original processing error; pool health checks expose DB loss.
    }
    throw error;
  } finally {
    client.release();
  }
}

function sourceObjectId(sourceUri: string): string {
  const match = /^stored-object:([0-9a-f-]{36})$/i.exec(sourceUri);
  if (!match)
    throw new PermanentBatchFailure(
      'INVALID_SOURCE_REFERENCE',
      'Batch source reference is invalid.',
    );
  return match[1]!;
}

function canonicalParticipantId(
  references: Record<string, unknown>,
  referencePath: string,
): string | null {
  const participants = references.participants;
  if (!participants || typeof participants !== 'object') return null;

  const value = (participants as Record<string, unknown>)[referencePath];
  if (!value || typeof value !== 'object') return null;

  const canonicalId = (value as Record<string, unknown>).canonicalId;
  return typeof canonicalId === 'string' ? canonicalId : null;
}

function canonicalWickets(candidate: NormalisedCandidate, references: Record<string, unknown>) {
  return candidate.event.wickets.map((wicket, wicketIndex) => ({
    kind: wicket.kind,
    playerOutId: canonicalParticipantId(references, `wickets.${String(wicketIndex)}.playerOut`),
    fielders: wicket.fielders.map((fielder, fielderIndex) => ({
      ...(fielder.participant
        ? {
            participantId: canonicalParticipantId(
              references,
              `wickets.${String(wicketIndex)}.fielders.${String(fielderIndex)}.participant`,
            ),
          }
        : {}),
      substitute: fielder.substitute,
    })),
  }));
}

function deriveCoordinates(
  candidate: NormalisedCandidate,
): { overNumber: number; positionInOver: number } | null {
  const { overNumber, positionInOver } = candidate.event;
  return overNumber === undefined || positionInOver === undefined
    ? null
    : { overNumber, positionInOver };
}

function referenceResolutionFailureCode(resolvedReferences: Record<string, unknown>): string {
  const fixture = resolvedReferences.fixture;

  if (fixture && typeof fixture === 'object' && !Array.isArray(fixture)) {
    const reason = (fixture as Record<string, unknown>).reason;

    if (typeof reason === 'string' && reason.startsWith('FIXTURE_METADATA_CONFLICT:')) {
      return 'FIXTURE_METADATA_CONFLICT';
    }
  }

  return 'REFERENCE_RESOLUTION_FAILED';
}

export function prepareItem(
  candidate: NormalisedCandidate,
  resolution: {
    inningsId: string | null;
    state: 'resolved' | 'ambiguous' | 'unresolved' | 'invalid';
    resolvedReferences: Record<string, unknown>;
  },
  coordinates: { overNumber: number; positionInOver: number } | null,
): PreparedItem | null {
  if (!coordinates) return null;
  const common = {
    ordinal: candidate.ordinal,
    inningsId: resolution.inningsId,
    overNumber: coordinates.overNumber,
    positionInOver: coordinates.positionInOver,
    payload: candidate.event,
    operation: candidate.event.operation,
    correctsSourceIdentity: candidate.event.correctsEventId ?? null,
    correctionTargetDeliveryId: null,
    sourceIdentity: candidate.event.eventId,
    sourceLocation: {
      filePath: candidate.filePath,
      rowNumber: candidate.rowNumber,
      ordinal: candidate.ordinal,
    },
    referenceResolutionState: resolution.state,
    resolvedReferences: resolution.resolvedReferences,
  } as const;

  if (resolution.state !== 'resolved' || !resolution.inningsId) {
    return {
      ...common,
      state: 'rejected',
      rejectionCode: referenceResolutionFailureCode(resolution.resolvedReferences),
      rejectionMessage: `One or more event references are ${resolution.state}.`,
      rejectionDetail: { resolutionState: resolution.state },
    };
  }

  const strikerId = canonicalParticipantId(resolution.resolvedReferences, 'striker');
  const nonStrikerId = canonicalParticipantId(resolution.resolvedReferences, 'nonStriker');
  const bowlerId = canonicalParticipantId(resolution.resolvedReferences, 'bowler');
  const parsed = submissionEventSchema.safeParse({
    eventId: deterministicEventUuid(candidate.event.eventId),
    inningsId: resolution.inningsId,
    sequenceNumber: candidate.event.occurrenceSequence,
    overNumber: coordinates.overNumber,
    positionInOver: coordinates.positionInOver,
    ...(candidate.event.ballLabel === undefined ? {} : { ballNumber: candidate.event.ballLabel }),
    strikerId,
    nonStrikerId,
    bowlerId,
    runs: candidate.event.runs,
    extras: candidate.event.extras,
    wickets: canonicalWickets(candidate, resolution.resolvedReferences),
  });

  if (!parsed.success) {
    return {
      ...common,
      state: 'rejected',
      rejectionCode: 'EVENT_SCHEMA_INVALID',
      rejectionMessage: parsed.error.issues[0]?.message ?? 'Event failed authoritative validation.',
      rejectionDetail: {
        issues: parsed.error.issues.map((issue) => ({
          fieldPath: issue.path.join('.'),
          message: issue.message,
        })),
      },
    };
  }

  return {
    ...common,
    payload: parsed.data,
    state: 'accepted',
    rejectionCode: null,
    rejectionMessage: null,
    rejectionDetail: null,
  };
}

interface PublishedDeliveryMatchRow {
  ordinal: number;
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

const publishedDeliveryProjection = String.raw`
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
        'playerOutId', wicket.player_out_id::text,
        'fielders', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'participantId', fielder.person_id::text,
              'substitute', fielder.is_substitute
            )
            ORDER BY fielder.ordinal
          )
          FROM delivery_wicket_fielder fielder
          WHERE fielder.wicket_id = wicket.wicket_id
        ), '[]'::jsonb)
      )
      ORDER BY wicket.ordinal
    )
    FROM delivery_wicket wicket
    WHERE wicket.delivery_id = d.delivery_id
  ), '[]'::jsonb) AS wickets
`;

function mapPublishedDelivery(row: PublishedDeliveryMatchRow): PublishedCricketDelivery {
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

interface CorrectionTargetRow {
  ordinal: number;
  deliveryId: string;
  sequenceNumber: number;
  fixtureId: string;
  competitionId: string;
  declaredFixtureId: string;
  declaredCompetitionId: string;
}

function correctionValidationResult(
  item: PreparedItem,
  code:
    | 'CORRECTION_TARGET_NOT_FOUND'
    | 'CORRECTION_TARGET_AMBIGUOUS'
    | 'CORRECTION_TARGET_WRONG_FIXTURE'
    | 'CORRECTION_TARGET_WRONG_COMPETITION',
  message: string,
  detail: Record<string, unknown>,
): CricketValidationResult {
  item.state = 'rejected';
  item.rejectionCode = code;
  item.rejectionMessage = message;
  item.rejectionDetail = detail;
  return {
    code,
    ruleVersion: '1.0',
    severity: 'error',
    eventIndex: item.ordinal,
    fieldPath: 'correctsEventId',
    message,
  };
}

function resolvedCompetitionScopeValidationResult(
  item: PreparedItem,
  batchCompetitionId: string,
): CricketValidationResult {
  const code = 'RESOLVED_COMPETITION_OUT_OF_SCOPE';
  const message = 'Resolved fixture is outside the batch competition scope.';
  item.state = 'rejected';
  item.rejectionCode = code;
  item.rejectionMessage = message;
  // Do not expose the resolved competition: the submitter may not be authorised to see it.
  item.rejectionDetail = { batchCompetitionId };
  return {
    code,
    ruleVersion: '1.0',
    severity: 'error',
    eventIndex: item.ordinal,
    fieldPath: 'fixture',
    message,
  };
}

/**
 * Authorisation at receipt covers the batch's declared competition. Recheck every
 * resolved event against its canonical fixture so package contents cannot cross
 * that boundary after reference resolution or reviewer mapping.
 */
export async function enforceResolvedCompetitionScope(
  client: Pick<PoolClient, 'query'>,
  items: PreparedItem[],
  batchCompetitionId: string,
): Promise<Map<number, CricketValidationResult[]>> {
  const accepted = items.filter((item) => item.state === 'accepted' && item.inningsId !== null);
  const results = new Map<number, CricketValidationResult[]>();
  if (accepted.length === 0) return results;

  const values: unknown[] = [];
  const tuples = accepted.map((item) => {
    const first = values.length + 1;
    values.push(item.ordinal, item.inningsId);
    return `($${first}::integer,$${first + 1}::bigint)`;
  });
  const resolved = await client.query<{ ordinal: number; competitionId: string }>(
    `
      WITH staged (ordinal, innings_id) AS (VALUES ${tuples.join(',')})
      SELECT staged.ordinal, fixture.competition_id::text AS "competitionId"
      FROM staged
      JOIN innings ON innings.innings_id=staged.innings_id
      JOIN fixture ON fixture.fixture_id=innings.fixture_id
    `,
    values,
  );
  const competitionByOrdinal = new Map(
    resolved.rows.map((row) => [row.ordinal, row.competitionId]),
  );

  for (const item of accepted) {
    if (competitionByOrdinal.get(item.ordinal) === batchCompetitionId) continue;
    results.set(item.ordinal, [resolvedCompetitionScopeValidationResult(item, batchCompetitionId)]);
  }
  return results;
}

export async function resolveCorrectionTargets(
  client: Pick<PoolClient, 'query'>,
  items: PreparedItem[],
  batchCompetitionId: string,
): Promise<Map<number, CricketValidationResult[]>> {
  const corrections = items.filter(
    (item) =>
      item.state === 'accepted' &&
      item.operation === 'correction' &&
      item.correctsSourceIdentity !== null &&
      item.inningsId !== null,
  );
  const results = new Map<number, CricketValidationResult[]>();
  if (corrections.length === 0) return results;

  const values: unknown[] = [];
  const tuples = corrections.map((item) => {
    const first = values.length + 1;
    values.push(item.ordinal, item.correctsSourceIdentity, item.inningsId);
    return `($${first}::integer,$${first + 1}::text,$${first + 2}::bigint)`;
  });
  const targets = await client.query<CorrectionTargetRow>(
    `
      WITH requested (ordinal, corrects_source_identity, innings_id) AS (
        VALUES ${tuples.join(',')}
      )
      SELECT requested.ordinal,
             target.delivery_id::text AS "deliveryId",
             target.innings_sequence AS "sequenceNumber",
             target_fixture.fixture_id::text AS "fixtureId",
             target_fixture.competition_id::text AS "competitionId",
             declared_fixture.fixture_id::text AS "declaredFixtureId",
             declared_fixture.competition_id::text AS "declaredCompetitionId"
      FROM requested
      JOIN innings declared_innings ON declared_innings.innings_id=requested.innings_id
      JOIN fixture declared_fixture ON declared_fixture.fixture_id=declared_innings.fixture_id
      JOIN batch_item source_item
        ON source_item.source_identity=requested.corrects_source_identity
      JOIN delivery linked
        ON linked.delivery_id=source_item.published_event_id
      JOIN delivery_current target
        ON target.source_event_id=linked.source_event_id
      JOIN innings target_innings ON target_innings.innings_id=target.innings_id
      JOIN fixture target_fixture ON target_fixture.fixture_id=target_innings.fixture_id
      ORDER BY requested.ordinal, target.delivery_id
    `,
    values,
  );
  const rowsByOrdinal = new Map<number, CorrectionTargetRow[]>();
  for (const row of targets.rows) {
    rowsByOrdinal.set(row.ordinal, [...(rowsByOrdinal.get(row.ordinal) ?? []), row]);
  }

  for (const item of corrections) {
    const matches = rowsByOrdinal.get(item.ordinal) ?? [];
    if (matches.length === 0) {
      results.set(item.ordinal, [
        correctionValidationResult(
          item,
          'CORRECTION_TARGET_NOT_FOUND',
          `No current published delivery matches ${item.correctsSourceIdentity}.`,
          { correctsEventId: item.correctsSourceIdentity },
        ),
      ]);
      continue;
    }
    if (matches.length > 1) {
      results.set(item.ordinal, [
        correctionValidationResult(
          item,
          'CORRECTION_TARGET_AMBIGUOUS',
          `More than one current published delivery matches ${item.correctsSourceIdentity}.`,
          {
            correctsEventId: item.correctsSourceIdentity,
            candidateDeliveryIds: matches.map((match) => match.deliveryId),
          },
        ),
      ]);
      continue;
    }

    const target = matches[0]!;
    if (
      target.competitionId !== batchCompetitionId ||
      target.declaredCompetitionId !== batchCompetitionId
    ) {
      results.set(item.ordinal, [
        correctionValidationResult(
          item,
          'CORRECTION_TARGET_WRONG_COMPETITION',
          'The correction target does not belong to the batch competition.',
          {
            correctsEventId: item.correctsSourceIdentity,
            targetCompetitionId: target.competitionId,
            batchCompetitionId,
          },
        ),
      ]);
      continue;
    }
    if (target.fixtureId !== target.declaredFixtureId) {
      results.set(item.ordinal, [
        correctionValidationResult(
          item,
          'CORRECTION_TARGET_WRONG_FIXTURE',
          'The correction target does not belong to the fixture declared by this item.',
          {
            correctsEventId: item.correctsSourceIdentity,
            targetFixtureId: target.fixtureId,
            declaredFixtureId: target.declaredFixtureId,
          },
        ),
      ]);
      continue;
    }

    item.correctionTargetDeliveryId = target.deliveryId;
    item.payload = { ...item.payload, sequenceNumber: target.sequenceNumber };
  }

  return results;
}

async function loadPublishedDeliveryMatches(
  client: PoolClient,
  items: readonly PreparedItem[],
): Promise<Map<number, Map<string, PublishedCricketDelivery>>> {
  const candidates = items.filter((item) => item.state === 'accepted' && item.inningsId !== null);

  const matches = new Map<number, Map<string, PublishedCricketDelivery>>();

  function addRows(rows: readonly PublishedDeliveryMatchRow[]): void {
    for (const row of rows) {
      let byDelivery = matches.get(row.ordinal);

      if (!byDelivery) {
        byDelivery = new Map();
        matches.set(row.ordinal, byDelivery);
      }

      byDelivery.set(row.deliveryId, mapPublishedDelivery(row));
    }
  }

  if (candidates.length === 0) {
    return matches;
  }

  const naturalValues: unknown[] = [];

  const naturalTuples = candidates.map((item) => {
    const first = naturalValues.length + 1;

    naturalValues.push(item.ordinal, item.inningsId, item.overNumber, item.positionInOver);

    return `($${first}::integer,$${first + 1}::bigint,$${first + 2}::smallint,$${first + 3}::smallint)`;
  });

  const natural = await client.query<PublishedDeliveryMatchRow>(
    `
      WITH requested (
        ordinal,
        innings_id,
        over_number,
        position_in_over
      ) AS (
        VALUES ${naturalTuples.join(',')}
      )
      SELECT
        requested.ordinal,
        ${publishedDeliveryProjection}
      FROM requested
      JOIN delivery_current d
        ON d.innings_id = requested.innings_id
       AND d.over_number = requested.over_number
       AND d.position_in_over = requested.position_in_over
    `,
    naturalValues,
  );

  addRows(natural.rows);

  const sourceValues: unknown[] = [];

  const sourceTuples = candidates.map((item) => {
    const first = sourceValues.length + 1;

    sourceValues.push(item.ordinal, item.sourceIdentity);

    return `($${first}::integer,$${first + 1}::text)`;
  });

  const bySource = await client.query<PublishedDeliveryMatchRow>(
    `
      WITH requested (
        ordinal,
        source_identity
      ) AS (
        VALUES ${sourceTuples.join(',')}
      )
      SELECT
        requested.ordinal,
        ${publishedDeliveryProjection}
      FROM requested
      JOIN batch_item source_item
        ON source_item.source_identity =
           requested.source_identity
      JOIN delivery d
        ON d.source_batch_item_id =
           source_item.batch_item_id
       AND d.superseded_at IS NULL
    `,
    sourceValues,
  );

  addRows(bySource.rows);

  return matches;
}

async function publishedValidationResults(
  client: PoolClient,
  items: PreparedItem[],
): Promise<Map<number, CricketValidationResult[]>> {
  const matches = await loadPublishedDeliveryMatches(client, items);

  const results = new Map<number, CricketValidationResult[]>();

  for (const item of items) {
    if (item.state !== 'accepted') {
      continue;
    }

    const published = matches.get(item.ordinal);

    if (!published || published.size === 0) {
      continue;
    }

    const submitted = submissionEventSchema.parse(item.payload);

    const comparablePublished = [...published.entries()].filter(
      ([deliveryId]) => deliveryId !== item.correctionTargetDeliveryId,
    );

    if (item.operation === 'correction' && comparablePublished.length === 0) {
      continue;
    }

    const classified = comparablePublished.map(([deliveryId, delivery]) => ({
      deliveryId,
      delivery,
      classification: classifyPublishedCricketDelivery(submitted, delivery),
    }));

    const conflict = classified.find((entry) => entry.classification === 'conflict');

    if (conflict) {
      item.state = 'rejected';
      item.rejectionCode = 'PUBLISHED_DELIVERY_CONFLICT';
      item.rejectionMessage = 'Published delivery data conflicts with this staged event.';
      item.rejectionDetail = {
        existingDeliveryIds: [...published.keys()],
        existingDeliveryId: conflict.deliveryId,
        differences: diffPublishedCricketDelivery(submitted, conflict.delivery),
      };

      results.set(item.ordinal, [
        {
          code: 'PUBLISHED_DELIVERY_CONFLICT',
          ruleVersion: '1.0',
          severity: 'error',
          eventIndex: item.ordinal,
          fieldPath: 'delivery',
          message:
            'A published delivery or published source identity exists with different cricket content.',
        },
      ]);

      continue;
    }

    results.set(item.ordinal, [
      {
        code: 'EXACT_PUBLISHED_DUPLICATE',
        ruleVersion: '1.0',
        severity: 'warning',
        eventIndex: item.ordinal,
        fieldPath: 'delivery',
        message: 'The staged event exactly matches an already-published delivery.',
      },
    ]);
  }

  return results;
}

async function insertValidationResults(
  client: PoolClient,
  batchId: string,
  rows: Array<{
    batchItemId?: string | null;
    sourceOrdinal: number;
    ruleCode: string;
    ruleVersion?: string;
    severity?: 'error' | 'warning';
    filePath?: string | null;
    rowNumber?: number | null;
    fieldPath?: string | null;
    message: string;
  }>,
): Promise<void> {
  if (rows.length === 0) return;
  const values: unknown[] = [];
  const tuples = rows.map((row) => {
    const first = values.length + 1;
    values.push(
      batchId,
      row.batchItemId ?? null,
      row.sourceOrdinal,
      row.ruleCode,
      row.ruleVersion ?? '1.0',
      row.severity ?? 'error',
      row.filePath ?? null,
      row.rowNumber ?? null,
      row.fieldPath ?? null,
      row.message,
    );
    return `($${first}::bigint,$${first + 1}::bigint,$${first + 2}::integer,$${first + 3},$${first + 4},$${first + 5}::batch_validation_severity,$${first + 6},$${first + 7}::integer,$${first + 8},$${first + 9})`;
  });
  await client.query(
    `
      INSERT INTO batch_validation_result (
        batch_id, batch_item_id, source_ordinal, rule_code, rule_version,
        severity, file_path, row_number, field_path, message
      )
      VALUES ${tuples.join(',')}
      ON CONFLICT DO NOTHING
    `,
    values,
  );
}

export function createBatchValidationJobHandler(
  database: Pool,
  objectStorage: BatchObjectReader,
  logger: Logger,
  options: HandlerOptions,
) {
  const metrics: BatchValidationMetrics = {
    acceptedItems: 0,
    batchesFailed: 0,
    batchesRejected: 0,
    batchesSucceeded: 0,
    chunksCommitted: 0,
    rejectedItems: 0,
  };

  async function loadDismissalKinds(): Promise<string[]> {
    const result = await database.query<{ code: string }>(
      `SELECT code FROM dismissal_kind ORDER BY code`,
    );
    return result.rows.map((row) => row.code);
  }

  async function loadBatchCricketContext(
    events: readonly SubmissionEvent[],
    dismissalKinds: string[],
  ): Promise<LoadedBatchCricketContext> {
    const inningsIds = [...new Set(events.map((event) => event.inningsId))];
    const participantIds = [
      ...new Set(
        events.flatMap((event) => [
          event.strikerId,
          event.nonStrikerId,
          event.bowlerId,
          ...event.wickets.map((wicket) => wicket.playerOutId),
        ]),
      ),
    ];

    const [inningsResult, participantResult] = await Promise.all([
      database.query<{
        inningsId: string;
        battingTeamId: string;
        bowlingTeamId: string | null;
      }>(
        `
          SELECT
            i.innings_id::text AS "inningsId",
            i.batting_team_id::text AS "battingTeamId",
            (
              SELECT ft.team_id::text
              FROM fixture_team ft
              WHERE ft.fixture_id = i.fixture_id
                AND ft.team_id <> i.batting_team_id
              ORDER BY ft.ordinal ASC
              LIMIT 1
            ) AS "bowlingTeamId"
          FROM innings i
          WHERE i.innings_id = ANY($1::bigint[])
        `,
        [inningsIds],
      ),
      database.query<{
        inningsId: string;
        participantId: string;
        teamId: string;
      }>(
        `
          SELECT DISTINCT
            i.innings_id::text AS "inningsId",
            fs.person_id::text AS "participantId",
            fs.team_id::text AS "teamId"
          FROM innings i
          JOIN fixture_squad fs ON fs.fixture_id = i.fixture_id
          WHERE i.innings_id = ANY($1::bigint[])
            AND fs.person_id = ANY($2::bigint[])
        `,
        [inningsIds, participantIds],
      ),
    ]);

    const inningsById: LoadedBatchCricketContext['inningsById'] = {};
    for (const row of inningsResult.rows) {
      if (row.bowlingTeamId !== null) {
        inningsById[row.inningsId] = {
          battingTeamId: row.battingTeamId,
          bowlingTeamId: row.bowlingTeamId,
        };
      }
    }

    const participantTeamByInningsId: LoadedBatchCricketContext['participantTeamByInningsId'] = {};
    for (const row of participantResult.rows) {
      const membership = participantTeamByInningsId[row.inningsId] ?? {};
      membership[row.participantId] = row.teamId;
      participantTeamByInningsId[row.inningsId] = membership;
    }

    return { inningsById, participantTeamByInningsId, dismissalKinds };
  }

  function cricketContextForEvent(
    loaded: LoadedBatchCricketContext,
    event: SubmissionEvent,
  ): CricketValidationContext {
    const innings = loaded.inningsById[event.inningsId];
    return {
      inningsById: innings ? { [event.inningsId]: innings } : {},
      participantTeamById: loaded.participantTeamByInningsId[event.inningsId] ?? {},
      dismissalKinds: loaded.dismissalKinds,
    };
  }

  async function rehydrateCricketValidationState(
    batchId: string,
    lastOrdinal: number,
    state: CricketValidationState,
    dismissalKinds: string[],
  ): Promise<void> {
    if (lastOrdinal < 0) return;

    const pageSize = Math.max(1, Math.min(options.chunkSize, 1_000));
    let afterOrdinal = -1;

    while (afterOrdinal < lastOrdinal) {
      const result = await database.query<{ ordinal: number; payload: unknown }>(
        `
          SELECT ordinal, payload
          FROM batch_item
          WHERE batch_id = $1::bigint
            AND ordinal > $2::integer
            AND ordinal <= $3::integer
            AND (state = 'accepted' OR rejection_code = 'CRICKET_BUSINESS_RULE_FAILED')
          ORDER BY ordinal ASC
          LIMIT $4::integer
        `,
        [batchId, afterOrdinal, lastOrdinal, pageSize],
      );

      if (result.rows.length === 0) return;

      const events = result.rows.map((row) => {
        const parsed = submissionEventSchema.safeParse(row.payload);
        if (!parsed.success) {
          throw new PermanentBatchFailure(
            'STAGED_EVENT_INVALID',
            'A previously staged canonical event can no longer be parsed.',
          );
        }
        return { ordinal: row.ordinal, event: parsed.data };
      });

      const loaded = await loadBatchCricketContext(
        events.map((entry) => entry.event),
        dismissalKinds,
      );

      for (const entry of events) {
        validateCricketBusinessRules([entry.event], cricketContextForEvent(loaded, entry.event), {
          state,
          eventIndexOffset: entry.ordinal,
        });
      }

      afterOrdinal = result.rows[result.rows.length - 1]!.ordinal;
      if (result.rows.length < pageSize) return;
    }
  }

  async function claim(jobId: string, batchId: string): Promise<ClaimResult> {
    return transaction(database, async (client) => {
      const jobResult = await client.query<{
        jobId: string;
        jobState: string;
        attemptCount: number;
        maxAttempts: number;
        batchId: string;
        batchReference: string;
        batchState: string;
        sourceUri: string | null;
        competitionId: string;
      }>(
        `
          SELECT j.job_id::text AS "jobId", j.state::text AS "jobState",
                 j.attempt_count AS "attemptCount", j.max_attempts AS "maxAttempts",
                 b.batch_id::text AS "batchId", b.batch_reference::text AS "batchReference",
                 b.state::text AS "batchState", b.source_uri AS "sourceUri",
                 b.competition_id::text AS "competitionId"
          FROM background_job j
          JOIN batch b ON b.batch_id = j.batch_id
          WHERE j.job_id = $1::uuid AND j.batch_id = $2::bigint
            AND j.job_type = 'batch.validate' AND j.contract_version = 1
          FOR UPDATE OF j, b
        `,
        [jobId, batchId],
      );
      const row = jobResult.rows[0];
      if (!row)
        throw new PermanentBatchFailure('JOB_NOT_FOUND', 'Batch validation job does not exist.');
      if (!row.sourceUri)
        throw new PermanentBatchFailure('SOURCE_NOT_STORED', 'Batch has no stored source.');

      if (
        row.jobState === 'succeeded' ||
        row.batchState === 'awaiting_review' ||
        row.batchState === 'rejected'
      ) {
        if (row.jobState !== 'succeeded') {
          await client.query(
            `UPDATE background_job SET state='succeeded', completed_at=COALESCE(completed_at,now()) WHERE job_id=$1::uuid`,
            [jobId],
          );
        }
        return {
          terminal: true,
          batchId: row.batchId,
          batchReference: row.batchReference,
          jobId: row.jobId,
          lastOrdinal: -1,
          attemptCount: row.attemptCount,
          maxAttempts: row.maxAttempts,
          sourceUri: row.sourceUri,
          competitionId: row.competitionId,
        };
      }
      if (!['queued', 'running', 'failed'].includes(row.jobState)) {
        throw new PermanentBatchFailure(
          'JOB_NOT_RUNNABLE',
          'Batch validation job is not runnable.',
        );
      }
      if (!['stored', 'validating', 'failed'].includes(row.batchState)) {
        throw new PermanentBatchFailure(
          'BATCH_NOT_RUNNABLE',
          'Batch is not in a validation state.',
        );
      }
      if (row.attemptCount >= row.maxAttempts) {
        throw new PermanentBatchFailure(
          'ATTEMPT_BUDGET_EXHAUSTED',
          'Batch validation retry budget is exhausted.',
        );
      }

      const checkpointResult = await client.query<{
        lastOrdinal: number;
        leaseOwner: string | null;
        leaseExpiresAt: Date | null;
      }>(
        `
          SELECT last_ordinal AS "lastOrdinal", lease_owner AS "leaseOwner", lease_expires_at AS "leaseExpiresAt"
          FROM batch_checkpoint
          WHERE batch_id=$1::bigint AND phase='validating'
          FOR UPDATE
        `,
        [batchId],
      );
      const checkpoint = checkpointResult.rows[0];
      if (
        checkpoint?.leaseOwner &&
        checkpoint.leaseOwner !== options.workerId &&
        checkpoint.leaseExpiresAt &&
        checkpoint.leaseExpiresAt.getTime() > Date.now()
      ) {
        throw new LeaseBusyError();
      }
      const lastOrdinal = checkpoint?.lastOrdinal ?? -1;
      const attemptCount = row.attemptCount + 1;
      await client.query(
        `
          INSERT INTO batch_checkpoint (batch_id,phase,last_ordinal,lease_owner,lease_expires_at,attempt_count)
          VALUES ($1::bigint,'validating',$2::integer,$3,now()+($4::integer*interval '1 millisecond'),$5::integer)
          ON CONFLICT (batch_id,phase) DO UPDATE SET
            lease_owner=EXCLUDED.lease_owner,
            lease_expires_at=EXCLUDED.lease_expires_at,
            attempt_count=EXCLUDED.attempt_count
        `,
        [batchId, lastOrdinal, options.workerId, options.leaseMs, attemptCount],
      );
      if (row.batchState !== 'validating') {
        await client.query(`UPDATE batch SET state='validating' WHERE batch_id=$1::bigint`, [
          batchId,
        ]);
        await client.query(
          `INSERT INTO batch_state_transition (batch_id,from_state,to_state,actor_kind,actor_identifier,reason)
           VALUES ($1::bigint,$2::batch_state,'validating','worker',$3,$4)`,
          [batchId, row.batchState, options.workerId, 'Worker claimed asynchronous validation.'],
        );
      }
      await client.query(
        `
          UPDATE background_job
          SET state='running', attempt_count=$2::integer,
              started_at=COALESCE(started_at,now()), completed_at=NULL,
              last_error_code=NULL, last_error_message=NULL
          WHERE job_id=$1::uuid
        `,
        [jobId, attemptCount],
      );
      return {
        terminal: false,
        batchId: row.batchId,
        batchReference: row.batchReference,
        jobId: row.jobId,
        lastOrdinal,
        attemptCount,
        maxAttempts: row.maxAttempts,
        sourceUri: row.sourceUri,
        competitionId: row.competitionId,
      };
    });
  }

  async function storedSource(sourceUri: string): Promise<StoredSource> {
    const objectId = sourceObjectId(sourceUri);
    const result = await database.query<{
      storageKey: string;
      mediaType: string;
      retentionState: string;
    }>(
      `SELECT storage_key AS "storageKey", media_type AS "mediaType", retention_state::text AS "retentionState"
       FROM stored_object WHERE object_id=$1::uuid`,
      [objectId],
    );
    const row = result.rows[0];
    if (!row || row.retentionState !== 'retained') {
      throw new PermanentBatchFailure('SOURCE_UNAVAILABLE', 'Stored batch source is unavailable.');
    }
    return { storageKey: row.storageKey, mediaType: row.mediaType };
  }

  async function recordSourceFaults(
    claimResult: ClaimResult,
    faults: SourceFault[],
    eventCount: number,
  ): Promise<void> {
    // Keep validation-result writes bounded as well: PostgreSQL has a finite
    // bind-parameter budget and a malformed large package may contain tens of
    // thousands of recoverable row faults.
    const faultChunkSize = Math.max(1, Math.min(options.chunkSize, 1_000));
    for (let offset = 0; offset < faults.length; offset += faultChunkSize) {
      const faultChunk = faults.slice(offset, offset + faultChunkSize);
      await transaction(database, async (client) => {
        const lease = await client.query(
          `SELECT 1 FROM batch_checkpoint WHERE batch_id=$1::bigint AND phase='validating'
             AND lease_owner=$2 AND lease_expires_at>now() FOR UPDATE`,
          [claimResult.batchId, options.workerId],
        );
        if (lease.rowCount !== 1) throw new LeaseBusyError();
        await insertValidationResults(
          client,
          claimResult.batchId,
          faultChunk.map((fault) => ({ ...fault })),
        );
        await client.query(
          `UPDATE batch_checkpoint
           SET lease_expires_at=now()+($3::integer*interval '1 millisecond')
           WHERE batch_id=$1::bigint AND phase='validating' AND lease_owner=$2`,
          [claimResult.batchId, options.workerId, options.leaseMs],
        );
      });
    }

    await transaction(database, async (client) => {
      const lease = await client.query(
        `SELECT 1 FROM batch_checkpoint WHERE batch_id=$1::bigint AND phase='validating'
           AND lease_owner=$2 AND lease_expires_at>now() FOR UPDATE`,
        [claimResult.batchId, options.workerId],
      );
      if (lease.rowCount !== 1) throw new LeaseBusyError();
      await client.query(`UPDATE batch SET item_count=$2::integer WHERE batch_id=$1::bigint`, [
        claimResult.batchId,
        eventCount,
      ]);
      await client.query(
        `UPDATE background_job SET progress_total=$2::integer WHERE job_id=$1::uuid`,
        [claimResult.jobId, eventCount],
      );
    });
  }

  async function writeChunk(
    claimResult: ClaimResult,
    items: PreparedItem[],
    lastOrdinal: number,
    eventCount: number,
    businessResultsByOrdinal: ReadonlyMap<number, readonly CricketValidationResult[]> = new Map(),
  ): Promise<void> {
    await transaction(database, async (client) => {
      const lease = await client.query(
        `SELECT 1 FROM batch_checkpoint WHERE batch_id=$1::bigint AND phase='validating'
           AND lease_owner=$2 AND lease_expires_at>now() FOR UPDATE`,
        [claimResult.batchId, options.workerId],
      );
      if (lease.rowCount !== 1) throw new LeaseBusyError();

      const publishedResultsByOrdinal = await publishedValidationResults(client, items);

      const values: unknown[] = [];
      const tuples = items.map((item) => {
        const first = values.length + 1;
        values.push(
          claimResult.batchId,
          item.ordinal,
          item.inningsId,
          item.overNumber,
          item.positionInOver,
          JSON.stringify(item.payload),
          item.sourceIdentity,
          JSON.stringify(item.sourceLocation),
          item.referenceResolutionState,
          JSON.stringify(item.resolvedReferences),
          item.state,
          item.rejectionCode,
          item.rejectionDetail ? JSON.stringify(item.rejectionDetail) : null,
          item.operation,
          item.correctsSourceIdentity,
          item.correctionTargetDeliveryId,
        );
        return `($${first}::bigint,$${first + 1}::integer,$${first + 2}::bigint,$${first + 3}::smallint,$${first + 4}::smallint,$${first + 5}::jsonb,$${first + 6},$${first + 7}::jsonb,$${first + 8}::batch_reference_resolution_state,$${first + 9}::jsonb,$${first + 10}::batch_item_state,$${first + 11},$${first + 12}::jsonb,$${first + 13}::batch_item_operation,$${first + 14},$${first + 15}::bigint)`;
      });
      const inserted =
        items.length === 0
          ? { rows: [] as Array<{ batchItemId: string; ordinal: number }> }
          : await client.query<{ batchItemId: string; ordinal: number }>(
              `
              INSERT INTO batch_item (
                batch_id,ordinal,innings_id,over_number,position_in_over,payload,
                source_identity,source_location,reference_resolution_state,
                resolved_references,state,rejection_code,rejection_detail,
                operation,corrects_source_identity,correction_target_delivery_id
              ) VALUES ${tuples.join(',')}
              ON CONFLICT (batch_id, ordinal) DO UPDATE SET
                innings_id = EXCLUDED.innings_id,
                over_number = EXCLUDED.over_number,
                position_in_over = EXCLUDED.position_in_over,
                payload = EXCLUDED.payload,
                source_identity = EXCLUDED.source_identity,
                source_location = EXCLUDED.source_location,
                reference_resolution_state = EXCLUDED.reference_resolution_state,
                resolved_references = EXCLUDED.resolved_references,
                state = EXCLUDED.state,
                rejection_code = EXCLUDED.rejection_code,
                rejection_detail = EXCLUDED.rejection_detail,
                operation = EXCLUDED.operation,
                corrects_source_identity = EXCLUDED.corrects_source_identity,
                correction_target_delivery_id = EXCLUDED.correction_target_delivery_id
              WHERE batch_item.published_event_id IS NULL
              RETURNING batch_item_id::text AS "batchItemId", ordinal
            `,
              values,
            );
      const idByOrdinal = new Map(inserted.rows.map((row) => [row.ordinal, row.batchItemId]));
      // Issue #729. #708 recorded work that arose while creating a fixture, but
      // a v1.1 back-catalogue can instead resolve an existing fixture first and
      // discover unknown squad members during ordinary validation. Persist the
      // same reviewer-owned work before finalisation so it remains reviewable.
      const onboardingByKey = new Map<string, ReviewerActionableParticipantReference>();
      for (const item of items) {
        if (!idByOrdinal.has(item.ordinal)) continue;
        for (const task of reviewerActionableParticipantReferences(item.resolvedReferences)) {
          onboardingByKey.set(`${task.fixtureId}\0${task.participantKey}`, task);
        }
      }
      const onboarding = [...onboardingByKey.values()];
      if (onboarding.length > 0) {
        const names = [...new Set(onboarding.map((task) => task.submittedName))];
        const candidates = await client.query<{
          submittedName: string;
          personId: string;
          displayName: string;
        }>(
          `SELECT requested.submitted_name AS "submittedName", p.person_id::text AS "personId",
                  p.display_name AS "displayName"
             FROM unnest($1::text[]) AS requested(submitted_name)
             JOIN person p ON p.display_name = requested.submitted_name
                OR EXISTS (
                  SELECT 1 FROM person_alias alias
                   WHERE alias.person_id = p.person_id AND alias.name = requested.submitted_name
                )`,
          [names],
        );
        const candidatesByName = new Map<
          string,
          Array<{ personId: string; displayName: string }>
        >();
        for (const candidate of candidates.rows) {
          const matches = candidatesByName.get(candidate.submittedName) ?? [];
          if (!matches.some((match) => match.personId === candidate.personId)) {
            matches.push({ personId: candidate.personId, displayName: candidate.displayName });
          }
          candidatesByName.set(candidate.submittedName, matches);
        }
        await client.query(
          `INSERT INTO batch_participant_onboarding_task (
             batch_id, fixture_id, participant_key, submitted_name, submitted_source_id,
             submitted_team_name, reason, candidates
           )
           SELECT $1::bigint, task."fixtureId"::bigint, task."participantKey", task."submittedName",
                  task."submittedSourceId", task."submittedTeamName", task.reason,
                  task.candidates::jsonb
           FROM jsonb_to_recordset($2::jsonb) AS task(
             "fixtureId" text, "participantKey" text, "submittedName" text,
             "submittedSourceId" text, "submittedTeamName" text, reason text, candidates text
           )
           ON CONFLICT (batch_id, fixture_id, participant_key) DO UPDATE SET
             submitted_name=EXCLUDED.submitted_name,
             submitted_source_id=EXCLUDED.submitted_source_id,
             submitted_team_name=EXCLUDED.submitted_team_name,
             reason=EXCLUDED.reason,
             candidates=EXCLUDED.candidates,
             state='outstanding',
             person_id=NULL,
             onboarded_at=NULL,
             decided_by=NULL,
             decision_key=NULL,
             last_reported_at=now()`,
          [
            claimResult.batchId,
            JSON.stringify(
              onboarding.map((task) => ({
                ...task,
                candidates: JSON.stringify(candidatesByName.get(task.submittedName) ?? []),
              })),
            ),
          ],
        );
      }
      const validationRows: Array<{
        batchItemId?: string | null;
        sourceOrdinal: number;
        ruleCode: string;
        ruleVersion?: string;
        severity?: 'error' | 'warning';
        filePath?: string | null;
        rowNumber?: number | null;
        fieldPath?: string | null;
        message: string;
      }> = [];
      for (const item of items) {
        const batchItemId = idByOrdinal.get(item.ordinal);
        const businessResults = [
          ...(businessResultsByOrdinal.get(item.ordinal) ?? []),
          ...(publishedResultsByOrdinal.get(item.ordinal) ?? []),
        ];
        if (!batchItemId) {
          validationRows.push({
            sourceOrdinal: item.ordinal,
            ruleCode: 'DUPLICATE_BATCH_ITEM',
            filePath: String(item.sourceLocation.filePath),
            rowNumber:
              typeof item.sourceLocation.rowNumber === 'number'
                ? item.sourceLocation.rowNumber
                : null,
            message:
              'The event duplicates a source identity or delivery position already staged in this batch.',
          });
        } else if (businessResults.length > 0) {
          for (const result of businessResults) {
            validationRows.push({
              batchItemId,
              sourceOrdinal: item.ordinal,
              ruleCode: result.code,
              ruleVersion: result.ruleVersion,
              severity: result.severity,
              filePath: String(item.sourceLocation.filePath),
              rowNumber:
                typeof item.sourceLocation.rowNumber === 'number'
                  ? item.sourceLocation.rowNumber
                  : null,
              fieldPath: result.fieldPath,
              message: result.message,
            });
          }
        } else if (item.state === 'rejected') {
          validationRows.push({
            batchItemId,
            sourceOrdinal: item.ordinal,
            ruleCode: item.rejectionCode ?? 'EVENT_REJECTED',
            filePath: String(item.sourceLocation.filePath),
            rowNumber:
              typeof item.sourceLocation.rowNumber === 'number'
                ? item.sourceLocation.rowNumber
                : null,
            message: item.rejectionMessage ?? 'Event was rejected.',
          });
        }
      }
      await insertValidationResults(client, claimResult.batchId, validationRows);
      await client.query(
        `
          UPDATE batch_checkpoint
          SET last_ordinal=$3::integer,
              lease_expires_at=now()+($4::integer*interval '1 millisecond')
          WHERE batch_id=$1::bigint AND phase='validating' AND lease_owner=$2
        `,
        [claimResult.batchId, options.workerId, lastOrdinal, options.leaseMs],
      );
      await client.query(
        `UPDATE background_job SET progress_current=LEAST($2::integer,COALESCE(progress_total,$2::integer)) WHERE job_id=$1::uuid`,
        [claimResult.jobId, Math.min(eventCount, lastOrdinal + 1)],
      );
      metrics.chunksCommitted += 1;
      metrics.acceptedItems += items.filter(
        (item) => item.state === 'accepted' && idByOrdinal.has(item.ordinal),
      ).length;
      metrics.rejectedItems +=
        items.filter((item) => item.state === 'rejected' && idByOrdinal.has(item.ordinal)).length +
        items.filter((item) => !idByOrdinal.has(item.ordinal)).length;
    });
  }

  async function finalise(
    claimResult: ClaimResult,
    eventCount: number,
    appliedDecisionReferences: ReadonlySet<string>,
  ): Promise<'awaiting_review' | 'rejected'> {
    return transaction(database, async (client) => {
      const lease = await client.query(
        `SELECT 1 FROM batch_checkpoint WHERE batch_id=$1::bigint AND phase='validating'
           AND lease_owner=$2 AND lease_expires_at>now() FOR UPDATE`,
        [claimResult.batchId, options.workerId],
      );
      if (lease.rowCount !== 1) throw new LeaseBusyError();
      const countResult = await client.query<{ accepted: string }>(
        `SELECT count(*) FILTER (WHERE state='accepted')::text AS accepted FROM
         batch_item WHERE batch_id=$1::bigint`,
        [claimResult.batchId],
      );
      const accepted = Number(countResult.rows[0]?.accepted ?? 0);

      let hasReviewerActionableProposal = false;
      if (accepted === 0) {
        const proposalResult = await client.query<{ fixtureResolution: unknown }>(
          `SELECT DISTINCT resolved_references->'fixture' AS "fixtureResolution"
             FROM batch_item
            WHERE batch_id=$1::bigint
              AND state='rejected'
              AND rejection_code='REFERENCE_RESOLUTION_FAILED'
              AND reference_resolution_state='unresolved'
              AND resolved_references ? 'fixture'`,
          [claimResult.batchId],
        );
        hasReviewerActionableProposal = proposalResult.rows.some(({ fixtureResolution }) =>
          isReviewerActionableFixtureResolution(fixtureResolution),
        );
      }

      let hasOutstandingOnboardingTask = false;
      if (accepted === 0 && !hasReviewerActionableProposal) {
        // Issue #708. Participants a reviewer-created fixture could not onboard
        // are recorded against the batch. While any remains outstanding there is
        // a decision left to make, so the batch is not terminally rejected.
        // Answered by the partial index on this table.
        const taskResult = await client.query<{ outstanding: boolean }>(
          `SELECT EXISTS (
             SELECT 1 FROM batch_participant_onboarding_task
              WHERE batch_id=$1::bigint AND state='outstanding'
           ) AS outstanding`,
          [claimResult.batchId],
        );
        hasOutstandingOnboardingTask = taskResult.rows[0]?.outstanding ?? false;
      }

      const target = finalBatchValidationState(
        accepted,
        hasReviewerActionableProposal,
        hasOutstandingOnboardingTask,
      );
      await client.query(
        `UPDATE batch SET state=$2::batch_state,item_count=$3::integer WHERE batch_id=$1::bigint`,
        [claimResult.batchId, target, eventCount],
      );
      await client.query(
        `UPDATE batch_checkpoint SET last_ordinal=$3::integer,lease_owner=NULL,lease_expires_at=NULL
         WHERE batch_id=$1::bigint AND phase='validating' AND lease_owner=$2`,
        [claimResult.batchId, options.workerId, Math.max(-1, eventCount - 1)],
      );
      await client.query(
        `UPDATE background_job SET state='succeeded',progress_current=$2::integer,progress_total=$2::integer,
           completed_at=now(),last_error_code=NULL,last_error_message=NULL WHERE job_id=$1::uuid`,
        [claimResult.jobId, eventCount],
      );
      await client.query(
        `INSERT INTO batch_state_transition (batch_id,from_state,to_state,actor_kind,actor_identifier,reason)
         VALUES ($1::bigint,'validating',$2::batch_state,'worker',$3,$4)`,
        [claimResult.batchId, target, options.workerId, 'Asynchronous validation completed.'],
      );
      await client.query(
        `UPDATE batch_reference_mapping_decision
         SET state = CASE
          WHEN decision_reference = ANY($2::uuid[])
            THEN 'applied'::batch_reference_mapping_state
          ELSE 'failed'::batch_reference_mapping_state
         END,
             applied_at = CASE WHEN decision_reference = ANY($2::uuid[]) THEN now() ELSE NULL END,
             error_message = CASE WHEN decision_reference = ANY($2::uuid[])
               THEN NULL ELSE 'The selected candidate is no longer available in the batch context.' END
         WHERE batch_id=$1::bigint AND state='queued'`,
        [claimResult.batchId, [...appliedDecisionReferences]],
      );
      if (target === 'rejected') metrics.batchesRejected += 1;
      else metrics.batchesSucceeded += 1;
      return target;
    });
  }

  async function fail(
    claimResult: ClaimResult,
    error: unknown,
    permanent: boolean,
  ): Promise<boolean> {
    return transaction(database, async (client) => {
      const job = await client.query<{ attemptCount: number; maxAttempts: number; state: string }>(
        `SELECT attempt_count AS "attemptCount",max_attempts AS "maxAttempts",state::text AS state
         FROM background_job WHERE job_id=$1::uuid FOR UPDATE`,
        [claimResult.jobId],
      );
      const row = job.rows[0];
      if (!row || row.state === 'succeeded') return true;
      const exhausted = permanent || row.attemptCount >= row.maxAttempts;
      const batch = await client.query<{ state: string }>(
        `SELECT state::text AS state FROM batch WHERE batch_id=$1::bigint FOR UPDATE`,
        [claimResult.batchId],
      );
      const currentState = batch.rows[0]?.state;
      await client.query(
        `UPDATE background_job SET state=$2::background_job_state,last_error_code=$3,last_error_message=$4,
           completed_at=CASE WHEN $2='failed' THEN now() ELSE NULL END WHERE job_id=$1::uuid`,
        [
          claimResult.jobId,
          exhausted ? 'failed' : 'queued',
          error instanceof PermanentBatchFailure ? error.code : 'TRANSIENT_PROCESSING_FAILURE',
          exhausted ? 'Batch validation could not complete.' : 'Batch validation will be retried.',
        ],
      );
      if (currentState === 'validating') {
        await client.query(`UPDATE batch SET state='failed' WHERE batch_id=$1::bigint`, [
          claimResult.batchId,
        ]);
        await client.query(
          `INSERT INTO batch_state_transition (batch_id,from_state,to_state,actor_kind,actor_identifier,reason)
           VALUES ($1::bigint,'validating','failed','worker',$2,$3)`,
          [
            claimResult.batchId,
            options.workerId,
            exhausted
              ? 'Validation retry budget exhausted.'
              : 'Transient validation infrastructure failure.',
          ],
        );
      }
      await client.query(
        `UPDATE batch_checkpoint SET lease_owner=NULL,lease_expires_at=NULL
         WHERE batch_id=$1::bigint AND phase='validating' AND lease_owner=$2`,
        [claimResult.batchId, options.workerId],
      );
      if (exhausted) metrics.batchesFailed += 1;
      return exhausted;
    });
  }

  const handler = async (message: ReceivedJob, signal: AbortSignal): Promise<void> => {
    const parsed = batchValidationJobSchema.safeParse(message.body);
    if (!parsed.success) {
      throw new PermanentJobError(
        'UnsupportedBatchValidationContract',
        'Invalid batch.validate version 1 command envelope.',
      );
    }
    if (signal.aborted) throw new Error('Worker shutdown interrupted batch validation.');

    let claimResult: ClaimResult;
    try {
      claimResult = await claim(parsed.data.jobId, parsed.data.batchId);
    } catch (error) {
      if (error instanceof LeaseBusyError) throw error;
      if (error instanceof PermanentBatchFailure) {
        throw new PermanentJobError(error.code, error.message);
      }
      throw error;
    }
    if (claimResult.terminal) {
      logger.info('Duplicate batch validation delivery observed after completion.', {
        batchReference: claimResult.batchReference,
        jobId: claimResult.jobId,
      });
      return;
    }

    const startedAt = Date.now();
    try {
      const mappingRows = await database.query<ReferenceMappingRow>(
        `SELECT decision_reference::text AS "decisionReference", item_ordinal AS "itemOrdinal",
                reference_path AS "referencePath", entity_type AS "entityType",
                candidate_id::text AS "canonicalId"
         FROM batch_reference_mapping_decision
         WHERE batch_id=$1::bigint AND state IN ('queued','applied')`,
        [claimResult.batchId],
      );
      const appliedDecisionReferences = new Set<string>();
      const source = await storedSource(claimResult.sourceUri);
      const openSource: OpenBatchSource = () => objectStorage.read(source.storageKey);
      const scan = await scanBatchReferences(openSource, source.mediaType);
      await recordSourceFaults(claimResult, scan.sourceFaults, scan.eventCount);
      if (signal.aborted) throw new Error('Worker shutdown interrupted batch validation.');

      const cricketValidationState = createCricketValidationState();
      const dismissalKinds = await loadDismissalKinds();
      await rehydrateCricketValidationState(
        claimResult.batchId,
        claimResult.lastOrdinal,
        cricketValidationState,
        dismissalKinds,
      );
      let candidateChunk: NormalisedCandidate[] = [];
      let chunkLastOrdinal = claimResult.lastOrdinal;
      let persistedOrdinal = claimResult.lastOrdinal;
      const coordinateFaults: SourceFault[] = [];

      const processCandidateChunk = async (): Promise<void> => {
        if (candidateChunk.length === 0) return;
        // The checkpoint watermark must stay tied to the chunk's arrival-order
        // boundary (the source position we have read up to), independent of
        // how the chunk's contents are ordered for processing below. Computing
        // it before reordering keeps resumability unaffected by #588.
        const lastCandidateOrdinal = Math.max(
          ...candidateChunk.map((candidate) => candidate.ordinal),
        );
        // Business-rule sequencing checks are order-sensitive: they must see events in occurrence order
        // (occurrenceSequence), not the order they happened to arrive in the
        // source file or stream (#588). Reordering is scoped to one chunk, so
        // a shuffled innings whose events span more than one chunk boundary
        // is not yet fully covered here; see the coordinate-validation
        // alignment follow-up referenced on the issue.
        const orderedChunk = canonicaliseCandidates(candidateChunk);
        const referenceChunk = buildReferenceChunk(orderedChunk);
        const { overrides: referenceOverrides, decisionReferencesByPath } =
          referenceOverridesForChunk(mappingRows.rows, referenceChunk.referencePathByOrdinal);
        const resolution = referenceChunk.referencePackage
          ? await resolvePackageReferences(
              database,
              referenceChunk.referencePackage,
              referenceOverrides,
            )
          : { outcomes: [], items: [] };
        for (const outcome of resolution.outcomes) {
          if (outcome.matchedBy === 'manual') {
            for (const decisionReference of decisionReferencesByPath.get(outcome.referencePath) ??
              []) {
              appliedDecisionReferences.add(decisionReference);
            }
          }
        }
        const resolutionByPath = new Map(
          resolution.items.map((item) => [item.referencePath, item]),
        );
        const prepared: PreparedItem[] = [];

        for (const candidate of orderedChunk) {
          const coordinates = deriveCoordinates(candidate);
          const path = referenceChunk.referencePathByOrdinal.get(candidate.ordinal);
          const resolved = path ? resolutionByPath.get(path) : undefined;
          if (!coordinates) {
            coordinateFaults.push({
              sourceOrdinal: candidate.ordinal,
              ruleCode: 'EVENT_POSITION_UNAVAILABLE',
              filePath: candidate.filePath,
              rowNumber: candidate.rowNumber,
              fieldPath: 'overNumber',
              message:
                'Event requires explicit overNumber and positionInOver canonical coordinates.',
            });
            continue;
          }
          if (!resolved) {
            coordinateFaults.push({
              sourceOrdinal: candidate.ordinal,
              ruleCode: 'REFERENCE_RESOLUTION_MISSING',
              filePath: candidate.filePath,
              rowNumber: candidate.rowNumber,
              fieldPath: null,
              message: 'Reference resolution produced no item outcome.',
            });
            continue;
          }
          const item = prepareItem(candidate, resolved, coordinates);
          if (item) prepared.push(item);
        }

        const businessResultsByOrdinal = await transaction(database, async (client) => {
          const scopeResults = await enforceResolvedCompetitionScope(
            client,
            prepared,
            claimResult.competitionId,
          );
          const correctionResults = await resolveCorrectionTargets(
            client,
            prepared,
            claimResult.competitionId,
          );
          return new Map([...scopeResults, ...correctionResults]);
        });
        const canonicalItems = prepared
          .filter((item) => item.state === 'accepted')
          .map((item) => {
            const parsed = submissionEventSchema.safeParse(item.payload);
            if (!parsed.success) {
              throw new PermanentBatchFailure(
                'STAGED_EVENT_INVALID',
                'A canonical event failed to parse before business-rule validation.',
              );
            }
            return { item, event: parsed.data };
          });

        if (canonicalItems.length > 0) {
          const loaded = await loadBatchCricketContext(
            canonicalItems.map((entry) => entry.event),
            dismissalKinds,
          );

          for (const { item, event } of canonicalItems) {
            const results = validateCricketBusinessRules(
              [event],
              cricketContextForEvent(loaded, event),
              { state: cricketValidationState, eventIndexOffset: item.ordinal },
            );
            if (results.length > 0) {
              businessResultsByOrdinal.set(item.ordinal, results);
            }

            const errors = results.filter((result) => result.severity === 'error');
            if (errors.length > 0) {
              item.state = 'rejected';
              item.rejectionCode = 'CRICKET_BUSINESS_RULE_FAILED';
              item.rejectionMessage = 'Event failed one or more versioned cricket business rules.';
              item.rejectionDetail = {
                issues: errors.map((result) => ({
                  code: result.code,
                  ruleVersion: result.ruleVersion,
                  severity: result.severity,
                  fieldPath: result.fieldPath,
                  message: result.message,
                })),
              };
            }
          }
        }

        await writeChunk(
          claimResult,
          prepared,
          lastCandidateOrdinal,
          scan.eventCount,
          businessResultsByOrdinal,
        );
        persistedOrdinal = lastCandidateOrdinal;
        candidateChunk = [];
      };

      if (!scan.fatal) {
        for await (const candidate of normalisedBatchCandidates(openSource, source.mediaType)) {
          if (candidate.ordinal <= claimResult.lastOrdinal) {
            continue;
          }
          if (scan.rejectedOrdinals.has(candidate.ordinal)) {
            chunkLastOrdinal = candidate.ordinal;
            continue;
          }

          candidateChunk.push(candidate);
          chunkLastOrdinal = candidate.ordinal;
          if (candidateChunk.length >= options.chunkSize) {
            await processCandidateChunk();
            if (signal.aborted) throw new Error('Worker shutdown interrupted batch validation.');
          }
        }
      }
      if (candidateChunk.length > 0) await processCandidateChunk();
      if (coordinateFaults.length > 0) {
        await recordSourceFaults(claimResult, coordinateFaults, scan.eventCount);
      }
      // If the tail contained only source-invalid records, advance the durable
      // checkpoint over that deterministic ordinal range before finalisation.
      if (chunkLastOrdinal > persistedOrdinal) {
        await writeChunk(claimResult, [], chunkLastOrdinal, scan.eventCount);
      }
      const target = await finalise(claimResult, scan.eventCount, appliedDecisionReferences);
      logger.info('Batch validation completed.', {
        batchReference: claimResult.batchReference,
        jobId: claimResult.jobId,
        attempt: claimResult.attemptCount,
        itemCount: scan.eventCount,
        sourceFaultCount: scan.sourceFaults.length + coordinateFaults.length,
        finalState: target,
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      if (error instanceof LeaseBusyError) throw error;
      const permanent = error instanceof PermanentBatchFailure;
      const exhausted = await fail(claimResult, error, permanent);
      logger.warn('Batch validation processing failed.', {
        batchReference: claimResult.batchReference,
        jobId: claimResult.jobId,
        attempt: claimResult.attemptCount,
        exhausted,
        errorName: error instanceof Error ? error.name : 'UnknownError',
        durationMs: Date.now() - startedAt,
      });
      if (exhausted) {
        throw new PermanentJobError(
          permanent ? error.code : 'BatchValidationRetryBudgetExhausted',
          'Batch validation failed and requires operator attention.',
        );
      }
      throw error;
    }
  };

  return { handler, metrics };
}
