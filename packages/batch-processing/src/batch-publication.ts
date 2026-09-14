import {
  classifyPublishedCricketDelivery,
  diffPublishedCricketDelivery,
  type ComparableCricketDelivery,
  type PublishedCricketDelivery,
  type SubmissionEvent,
} from '@sport-analytics/contracts';

import { executeQuery, type QueryExecutor } from './database';

type BatchState =
  | 'publishing'
  | 'published'
  | 'partially_published'
  | 'failed'
  | 'awaiting_review'
  | 'received'
  | 'stored'
  | 'validating'
  | 'rejected'
  | 'correction_requested'
  | 'superseded';

type BatchItemState = 'pending' | 'accepted' | 'rejected' | 'published' | 'duplicate_skipped';
type BatchReferenceResolutionState = 'unresolved' | 'resolved' | 'ambiguous' | 'invalid';
type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

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

interface BatchPublicationResult {
  published: number;
  duplicateSkipped: number;
  conflicts: number;
}

function requireRow<T>(row: T | undefined, operation: string): T {
  if (row === undefined) {
    throw new Error(`${operation} returned no row.`);
  }

  return row;
}

export interface BatchPublicationChunkResult {
  published: number;
  duplicateSkipped: number;
  conflicts: number;
  processed: number;
  complete: boolean;
}

export class BatchPublicationLeaseBusyError extends Error {
  constructor() {
    super('Another worker currently owns the publication lease.');
    this.name = 'BatchPublicationLeaseBusyError';
  }
}

interface StatisticsRefreshDependency {
  scope: 'fixture' | 'season' | 'competition' | 'career';
  fixtureId: string;
  participantId: string | null;
  competitionId: string | null;
  season: string | null;
}

function deriveCorrectionStatisticsDependencies(input: {
  fixtureId: string;
  competitionId: string | null;
  season: string | null;
  previousParticipantIds: readonly string[];
  resultingParticipantIds: readonly string[];
}): StatisticsRefreshDependency[] {
  const dependencies: StatisticsRefreshDependency[] = [
    {
      scope: 'fixture',
      fixtureId: input.fixtureId,
      participantId: null,
      competitionId: input.competitionId,
      season: input.season,
    },
  ];
  const participantIds = [
    ...new Set([...input.previousParticipantIds, ...input.resultingParticipantIds]),
  ]
    .filter((participantId) => participantId.length > 0)
    .sort();
  for (const participantId of participantIds) {
    if (input.competitionId && input.season)
      dependencies.push({
        scope: 'season',
        fixtureId: input.fixtureId,
        participantId,
        competitionId: input.competitionId,
        season: input.season,
      });
    if (input.competitionId)
      dependencies.push({
        scope: 'competition',
        fixtureId: input.fixtureId,
        participantId,
        competitionId: input.competitionId,
        season: null,
      });
    dependencies.push({
      scope: 'career',
      fixtureId: input.fixtureId,
      participantId,
      competitionId: null,
      season: null,
    });
  }
  return dependencies;
}

async function advanceFixtureStatisticsCacheVersions(
  executor: QueryExecutor,
  fixtureIds: readonly string[],
): Promise<void> {
  const uniqueFixtureIds = [...new Set(fixtureIds)];
  if (uniqueFixtureIds.length === 0) return;
  await executeQuery(
    executor,
    `WITH advanced AS (
       INSERT INTO fixture_statistics_cache_version (fixture_id, data_version, updated_at)
       SELECT fixture_id, 1, now()
       FROM unnest($1::bigint[]) AS source(fixture_id)
       ON CONFLICT (fixture_id) DO UPDATE
       SET data_version = fixture_statistics_cache_version.data_version + 1,
           updated_at = now()
       RETURNING fixture_id
     )
     DELETE FROM fixture_statistics_cache cache
     USING advanced
     WHERE cache.fixture_id = advanced.fixture_id`,
    [uniqueFixtureIds],
  );
}

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
  batchItemId: string;
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

async function publishedDeliveryMatchesForItems(
  target: QueryExecutor,
  items: Array<BatchItemRecord & { fixtureId: string }>,
): Promise<
  Map<
    string,
    Array<{
      deliveryId: string;
      delivery: PublishedCricketDelivery;
    }>
  >
> {
  const matches = new Map<
    string,
    Array<{
      deliveryId: string;
      delivery: PublishedCricketDelivery;
    }>
  >();

  /*
   * Corrections use their own correction-target lookup path.
   * Only ordinary accepted items participate in duplicate/conflict matching.
   */
  const candidates = items
    .filter((item) => item.operation !== 'correction' && item.inningsId !== null)
    .map((item) => ({
      batchItemId: item.batchItemId,
      inningsId: item.inningsId,
      overNumber: item.overNumber,
      positionInOver: item.positionInOver,
      sourceIdentity: item.sourceIdentity,
    }));

  if (candidates.length === 0) {
    return matches;
  }

  /*
   * Resolve every possible already-published match for the entire chunk in
   * one database round trip.
   *
   * A staged item can match either:
   *   1. the canonical delivery natural key, or
   *   2. a previously published source identity.
   *
   * UNION de-duplicates a delivery that matches by both routes.
   */
  const result = await executeQuery<PublishedBatchDeliveryRow>(
    target,
    `
      WITH source AS (
        SELECT *
        FROM jsonb_to_recordset($1::jsonb) AS item(
          "batchItemId" bigint,
          "inningsId" bigint,
          "overNumber" smallint,
          "positionInOver" smallint,
          "sourceIdentity" text
        )
      ),
      matched_ids AS (
        SELECT
          source."batchItemId",
          delivery.delivery_id
        FROM source
        JOIN delivery_current delivery
          ON delivery.innings_id = source."inningsId"
         AND delivery.over_number = source."overNumber"
         AND delivery.position_in_over = source."positionInOver"

        UNION

        SELECT
          source."batchItemId",
          delivery.delivery_id
        FROM source
        JOIN batch_item lineage_item
          ON source."sourceIdentity" IS NOT NULL
         AND lineage_item.source_identity = source."sourceIdentity"
        JOIN delivery lineage
          ON lineage.source_batch_item_id =
             lineage_item.batch_item_id
        JOIN delivery_current delivery
          ON delivery.delivery_id = lineage.delivery_id
      )
      SELECT
        matched."batchItemId"::text AS "batchItemId",
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
        d.runs_total AS total,
        d.non_boundary AS "nonBoundary",
        d.extra_wides AS wides,
        d.extra_noballs AS "noBalls",
        d.extra_byes AS byes,
        d.extra_legbyes AS "legByes",
        d.extra_penalty AS penalty,
        COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'kind',
                wicket.kind,
              'playerOutId',
                wicket.player_out_id::text,
              'fielders',
                COALESCE((
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
      FROM matched_ids matched
      JOIN delivery_current d
        ON d.delivery_id = matched.delivery_id
      ORDER BY
        matched."batchItemId",
        d.delivery_id
    `,
    [JSON.stringify(candidates)],
  );

  for (const row of result.rows) {
    const current = matches.get(row.batchItemId) ?? [];

    current.push({
      deliveryId: row.deliveryId,
      delivery: mapPublishedBatchDelivery(row),
    });

    matches.set(row.batchItemId, current);
  }

  return matches;
}

interface BatchCorrectionTarget {
  deliveryId: string;
  fixtureId: string;
  competitionId: string;
  season: string;
  sourceEventId: string;
  submissionId: string;
  eventOrdinal: number;
  revision: number;
  sequenceNumber: number;
  sourceBatchItemId: string | null;
}

async function loadBatchCorrectionTarget(
  target: QueryExecutor,
  item: BatchItemRecord,
): Promise<BatchCorrectionTarget | null> {
  if (!item.correctionTargetDeliveryId || !item.correctsSourceIdentity) return null;
  const result = await executeQuery<BatchCorrectionTarget>(
    target,
    `
      SELECT current.delivery_id::text AS "deliveryId",
             innings.fixture_id::text AS "fixtureId",
             fixture.competition_id::text AS "competitionId",
             fixture.season,
             current.source_event_id::text AS "sourceEventId",
             current.submission_id::text AS "submissionId",
             current.submission_event_ordinal AS "eventOrdinal",
             current.revision,
             current.innings_sequence AS "sequenceNumber",
             current.source_batch_item_id::text AS "sourceBatchItemId"
      FROM delivery validated
      JOIN delivery current
        ON current.source_event_id=validated.source_event_id
       AND current.superseded_at IS NULL
      JOIN innings ON innings.innings_id=current.innings_id
      JOIN fixture ON fixture.fixture_id=innings.fixture_id
      JOIN submission ON submission.submission_id=current.submission_id
                     AND submission.status='accepted'
      WHERE validated.delivery_id=$1::bigint
      FOR UPDATE OF current
    `,
    [item.correctionTargetDeliveryId],
  );
  return result.rows[0] ?? null;
}

async function loadBatchEventSnapshot(
  target: QueryExecutor,
  deliveryId: string,
): Promise<SubmissionEvent> {
  const result = await executeQuery<{ state: SubmissionEvent }>(
    target,
    `
      SELECT jsonb_build_object(
        'eventId', d.source_event_id::text,
        'inningsId', d.innings_id::text,
        'sequenceNumber', d.innings_sequence,
        'overNumber', d.over_number,
        'positionInOver', d.position_in_over,
        'ballNumber', d.ball_number,
        'strikerId', d.striker_id::text,
        'nonStrikerId', d.non_striker_id::text,
        'bowlerId', d.bowler_id::text,
        'runs', jsonb_build_object(
          'offBat', d.runs_off_bat, 'extras', d.runs_extras,
          'total', d.runs_total, 'nonBoundary', d.non_boundary
        ),
        'extras', jsonb_strip_nulls(jsonb_build_object(
          'wides', d.extra_wides, 'noBalls', d.extra_noballs,
          'byes', d.extra_byes, 'legByes', d.extra_legbyes,
          'penalty', d.extra_penalty
        )),
        'wickets', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'kind', wicket.kind,
            'playerOutId', wicket.player_out_id::text,
            'fielders', COALESCE((
              SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                'participantId', fielder.person_id::text,
                'substitute', fielder.is_substitute
              )) ORDER BY fielder.ordinal)
              FROM delivery_wicket_fielder fielder
              WHERE fielder.wicket_id=wicket.wicket_id
            ), '[]'::jsonb)
          ) ORDER BY wicket.ordinal)
          FROM delivery_wicket wicket WHERE wicket.delivery_id=d.delivery_id
        ), '[]'::jsonb)
      ) AS state
      FROM delivery d WHERE d.delivery_id=$1::bigint
    `,
    [deliveryId],
  );
  const state = result.rows[0]?.state;
  if (!state) throw new Error('Batch correction snapshot query returned no event.');
  return state;
}

async function insertBatchCorrectionWickets(
  target: QueryExecutor,
  deliveryId: string,
  event: SubmissionEvent,
): Promise<void> {
  for (const [wicketOrdinal, wicket] of event.wickets.entries()) {
    const inserted = await executeQuery<{ wicketId: string }>(
      target,
      `INSERT INTO delivery_wicket (delivery_id,ordinal,kind,source_kind,player_out_id)
       VALUES ($1::bigint,$2::smallint,$3,$3,$4::bigint)
       RETURNING wicket_id::text AS "wicketId"`,
      [deliveryId, wicketOrdinal, wicket.kind, wicket.playerOutId],
    );
    const wicketId = inserted.rows[0]?.wicketId;
    if (!wicketId) throw new Error('Batch correction wicket insertion returned no identifier.');
    for (const [fielderOrdinal, fielder] of wicket.fielders.entries()) {
      await executeQuery(
        target,
        `INSERT INTO delivery_wicket_fielder (wicket_id,ordinal,person_id,is_substitute)
         VALUES ($1::bigint,$2::smallint,$3::bigint,$4)`,
        [wicketId, fielderOrdinal, fielder.participantId ?? null, fielder.substitute],
      );
    }
  }
}

async function publishBatchCorrection(
  target: QueryExecutor,
  item: BatchItemRecord & { fixtureId: string },
  submitted: ComparableCricketDelivery,
  batch: {
    competitionId: string;
    submitterId: string;
    reviewerId: string;
    reviewReason: string;
    reviewedAt: Date;
  },
): Promise<string> {
  await executeQuery(target, 'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
    item.correctsSourceIdentity,
  ]);
  const correctionTarget = await loadBatchCorrectionTarget(target, item);
  if (
    !correctionTarget ||
    correctionTarget.fixtureId !== item.fixtureId ||
    correctionTarget.competitionId !== batch.competitionId
  ) {
    throw new Error('The validated batch correction target is no longer available in scope.');
  }
  const event: SubmissionEvent = {
    ...submitted,
    eventId: correctionTarget.sourceEventId,
    sequenceNumber: correctionTarget.sequenceNumber,
  };
  const previousState = await loadBatchEventSnapshot(target, correctionTarget.deliveryId);

  await executeQuery(
    target,
    `UPDATE delivery SET superseded_at=now(), superseded_by=delivery_id
     WHERE delivery_id=$1::bigint`,
    [correctionTarget.deliveryId],
  );
  const inserted = await executeQuery<{ deliveryId: string }>(
    target,
    `INSERT INTO delivery (
       innings_id,over_number,position_in_over,innings_sequence,ball_number,
       striker_id,non_striker_id,bowler_id,runs_off_bat,runs_extras,runs_total,
       non_boundary,extra_wides,extra_noballs,extra_byes,extra_legbyes,extra_penalty,
       submission_id,source_event_id,submission_event_ordinal,revision,
       supersedes_delivery_id,source_batch_item_id
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
       $18,$19,$20,$21,$22,$23
     ) RETURNING delivery_id::text AS "deliveryId"`,
    [
      event.inningsId,
      event.overNumber,
      event.positionInOver,
      event.sequenceNumber,
      event.ballNumber,
      event.strikerId,
      event.nonStrikerId,
      event.bowlerId,
      event.runs.offBat,
      event.runs.extras,
      event.runs.total,
      event.runs.nonBoundary,
      event.extras.wides ?? null,
      event.extras.noBalls ?? null,
      event.extras.byes ?? null,
      event.extras.legByes ?? null,
      event.extras.penalty ?? null,
      correctionTarget.submissionId,
      correctionTarget.sourceEventId,
      correctionTarget.eventOrdinal,
      correctionTarget.revision + 1,
      correctionTarget.deliveryId,
      correctionTarget.sourceBatchItemId,
    ],
  );
  const replacementId = requireRow(inserted.rows[0], 'Batch correction insertion').deliveryId;
  await insertBatchCorrectionWickets(target, replacementId, event);
  await executeQuery(
    target,
    'UPDATE delivery SET superseded_by=$2::bigint WHERE delivery_id=$1::bigint',
    [correctionTarget.deliveryId, replacementId],
  );
  const resultingState = await loadBatchEventSnapshot(target, replacementId);
  await executeQuery(
    target,
    `INSERT INTO delivery_correction_history (
       source_event_id,previous_delivery_id,replacement_delivery_id,requester_id,reason,
       previous_state,resulting_state,original_submission_id,original_submission_ordinal,
       original_batch_item_id,reviewer_id,review_decision,reviewed_at,review_reason
     ) VALUES ($1::uuid,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10,$11,'approved',$12,$13)`,
    [
      correctionTarget.sourceEventId,
      correctionTarget.deliveryId,
      replacementId,
      batch.submitterId,
      `Batch correction of ${item.correctsSourceIdentity}.`,
      JSON.stringify(previousState),
      JSON.stringify(resultingState),
      correctionTarget.submissionId,
      correctionTarget.eventOrdinal,
      correctionTarget.sourceBatchItemId,
      batch.reviewerId,
      batch.reviewedAt,
      batch.reviewReason,
    ],
  );
  const dependencies = deriveCorrectionStatisticsDependencies({
    fixtureId: correctionTarget.fixtureId,
    competitionId: correctionTarget.competitionId,
    season: correctionTarget.season,
    previousParticipantIds: [previousState.strikerId, previousState.bowlerId],
    resultingParticipantIds: [event.strikerId, event.bowlerId],
  });
  for (const dependency of dependencies) {
    await executeQuery(
      target,
      `INSERT INTO statistics_refresh_dependency (
         source_event_id,delivery_revision,fixture_id,scope,participant_id,competition_id,season
       ) VALUES ($1::uuid,$2,$3,$4,$5,$6,$7)`,
      [
        correctionTarget.sourceEventId,
        correctionTarget.revision + 1,
        dependency.fixtureId,
        dependency.scope,
        dependency.participantId,
        dependency.competitionId,
        dependency.season,
      ],
    );
  }
  await advanceFixtureStatisticsCacheVersions(target, [correctionTarget.fixtureId]);
  await executeQuery(
    target,
    `UPDATE batch_item SET state='published', published_event_id=$2::bigint
     WHERE batch_item_id=$1::bigint`,
    [item.batchItemId, replacementId],
  );
  return replacementId;
}

export async function publishAcceptedBatchChunk(
  target: QueryExecutor,
  batchId: string,
  workerId: string,
  options: { chunkSize?: number; leaseMs?: number } = {},
): Promise<BatchPublicationChunkResult> {
  const chunkSize = options.chunkSize ?? 100;
  const leaseMs = options.leaseMs ?? 300_000;
  if (!Number.isInteger(chunkSize) || chunkSize <= 0)
    throw new Error('Publication chunk size must be positive.');
  if (!Number.isInteger(leaseMs) || leaseMs <= 0)
    throw new Error('Publication lease duration must be positive.');
  const batch = await executeQuery<{
    state: BatchState;
    submitterId: string;
    checksum: string;
    competitionId: string;
    reviewerId: string | null;
    reviewReason: string | null;
    reviewedAt: Date | null;
  }>(
    target,
    `SELECT batch.state::text AS state,
            batch.submitter_id::text AS "submitterId",
            batch.source_checksum AS checksum,
            batch.competition_id::text AS "competitionId",
            review.actor_id::text AS "reviewerId",
            review.reason AS "reviewReason",
            review.decided_at AS "reviewedAt"
     FROM batch
     LEFT JOIN LATERAL (
       SELECT actor_id, reason, decided_at
       FROM batch_review_decision
       WHERE batch_id=batch.batch_id AND decision='approved'
       ORDER BY batch_review_decision_id DESC LIMIT 1
     ) review ON true
     WHERE batch.batch_id = $1::bigint FOR UPDATE OF batch`,
    [batchId],
  );
  const current = requireRow(batch.rows[0], 'Batch publication lookup');
  if (current.state === 'published' || current.state === 'partially_published')
    return { published: 0, duplicateSkipped: 0, conflicts: 0, processed: 0, complete: true };
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
    throw new BatchPublicationLeaseBusyError();
  }
  const lastOrdinal = checkpoint?.lastOrdinal ?? -1;

  await executeQuery(
    target,
    `INSERT INTO batch_checkpoint (batch_id,phase,last_ordinal,lease_owner,lease_expires_at,attempt_count)
     VALUES ($1::bigint,'publishing',-1,$2,now()+($3::integer*interval '1 millisecond'),1)
     ON CONFLICT (batch_id,phase) DO UPDATE SET
       lease_owner=EXCLUDED.lease_owner,
       lease_expires_at=EXCLUDED.lease_expires_at,
       attempt_count=CASE
         WHEN batch_checkpoint.lease_owner=EXCLUDED.lease_owner
              AND batch_checkpoint.lease_expires_at>now()
           THEN batch_checkpoint.attempt_count
         ELSE batch_checkpoint.attempt_count+1
       END`,
    [batchId, workerId, leaseMs],
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
    [batchId, lastOrdinal, chunkSize],
  );
  const result: BatchPublicationResult = { published: 0, duplicateSkipped: 0, conflicts: 0 };
  const publishedMatchesByItem = await publishedDeliveryMatchesForItems(target, items.rows);
  const newPublications: Array<{
    item: BatchItemRecord & { fixtureId: string };
    delivery: ComparableCricketDelivery;
  }> = [];

  for (const item of items.rows) {
    const payload = payloadRecord(item.payload);
    const submitted = comparableDeliveryForItem(item, payload);

    if (item.operation === 'correction') {
      if (!current.reviewerId || !current.reviewReason || !current.reviewedAt) {
        throw new Error('Approved batch correction has no reviewer provenance.');
      }
      await publishBatchCorrection(target, item, submitted, {
        ...current,
        reviewerId: current.reviewerId,
        reviewReason: current.reviewReason,
        reviewedAt: current.reviewedAt,
      });
      result.published += 1;
      continue;
    }

    const classified = (publishedMatchesByItem.get(item.batchItemId) ?? []).map((match) => ({
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
              rejection_code='PUBLISHED_DELIVERY_CONFLICT',
              rejection_detail=$2::jsonb
          WHERE batch_item_id=$1::bigint
        `,
        [
          item.batchItemId,
          JSON.stringify({
            existingDeliveryId: conflict.deliveryId,
            differences: diffPublishedCricketDelivery(submitted, conflict.delivery),
          }),
        ],
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
      sourceEventId:
        typeof payloadRecord(item.payload).eventId === 'string'
          ? payloadRecord(item.payload).eventId
          : null,
      eventOrdinal: item.ordinal,
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
           byes smallint, "legByes" smallint, penalty smallint, "sourceEventId" uuid,
           "eventOrdinal" integer
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
           extra_penalty, submission_id, source_batch_item_id, source_event_id,
           submission_event_ordinal
         )
         SELECT s."inningsId", s."overNumber", s."positionInOver", s."sequenceNumber",
           s."ballNumber", s."strikerId", s."nonStrikerId", s."bowlerId", s."offBat",
           s."runsExtras", s.total, s."nonBoundary", s.wides, s."noBalls", s.byes,
           s."legByes", s.penalty, submission.submission_id, s."batchItemId",
           COALESCE(s."sourceEventId", gen_random_uuid()), s."eventOrdinal"
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
    await advanceFixtureStatisticsCacheVersions(
      target,
      newPublications.map(({ item }) => item.fixtureId),
    );

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
           lease_expires_at=now()+($4::integer*interval '1 millisecond')
       WHERE batch_id=$1::bigint AND phase='publishing'
         AND lease_owner=$2 AND lease_expires_at>now()`,
      [batchId, workerId, newLastOrdinal, leaseMs],
    );
    if (advanced.rowCount !== 1) throw new BatchPublicationLeaseBusyError();
    return { ...result, processed: items.rows.length, complete: false };
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
  if (released.rowCount !== 1) throw new BatchPublicationLeaseBusyError();
  await executeQuery(target, `UPDATE batch SET state=$2::batch_state WHERE batch_id=$1::bigint`, [
    batchId,
    finalState,
  ]);
  await executeQuery(
    target,
    `INSERT INTO batch_state_transition (batch_id,from_state,to_state,actor_kind,actor_identifier,reason)
     VALUES ($1::bigint,'publishing',$2::batch_state,'worker',$3,'Publication completed idempotently.')`,
    [batchId, finalState, workerId],
  );
  return { ...result, processed: items.rows.length, complete: true };
}
