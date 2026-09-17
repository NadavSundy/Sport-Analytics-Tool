import {
  validateCricketBusinessRules,
  type ApiErrorDetail,
  type CricketValidationContext,
  type CricketValidationResult,
  type SubmissionEvent,
  type SubmissionRequest,
  type CorrectionRequest,
  type CorrectionHistoryResponse,
  type SubmissionSourceFile,
} from '@sport-analytics/contracts';
import {
  advanceFixtureStatisticsCacheVersions,
  aggregateParticipantIds,
  deriveCorrectionStatisticsDependencies,
  recordStatisticsRefreshDependencies,
  type StatisticsRefreshDependency,
} from '@sport-analytics/batch-processing';
import type { Pool, PoolClient } from 'pg';

import {
  DatabaseAccessError,
  executeQuery,
  getDatabasePool,
  type QueryExecutor,
  withTransaction,
} from '../../database';
import {
  SubmissionConflictError,
  SubmissionForbiddenError,
  SubmissionValidationError,
} from './submission.errors';

interface FixtureSubmissionScope {
  fixtureId: string;
  competitionId: string | null;
}

interface AcceptedSubmission {
  submissionId: string;
  fixtureId: string;
  submitterId: string;
  status: 'accepted';
  receivedAt: string;
  schemaVersion: '1.0';
  eventCount: number;
  checksum?: string;
}

interface CorrectionTarget {
  fixtureId: string;
  competitionId: string | null;
  season: string | null;
  sequenceNumber: number;
}

interface AcceptedCorrection {
  eventId: string;
  fixtureId: string;
  revision: number;
  refreshedScopes: Array<{
    scope: StatisticsRefreshDependency['scope'];
    participantId: string | null;
    competitionId: string | null;
    season: string | null;
  }>;
}

type CorrectionHistory = CorrectionHistoryResponse['data'];

export interface SubmissionRepository {
  findFixtureScope(fixtureId: string): Promise<FixtureSubmissionScope | null>;
  findCorrectionTarget(eventId: string): Promise<CorrectionTarget | null>;
  storeAcceptedSubmission(
    submission: SubmissionRequest,
    submitterId: string,
    sourceFile: SubmissionSourceFile | undefined,
    sourceChecksum: string,
  ): Promise<AcceptedSubmission>;
  storeAcceptedCorrection(
    eventId: string,
    correction: CorrectionRequest,
    submitterId: string,
  ): Promise<AcceptedCorrection>;
  listCorrectionHistory(eventId: string): Promise<CorrectionHistory>;
}

interface FixtureScopeRow {
  fixtureId: string;
  competitionId: string | null;
}

interface ReferenceRows {
  inningsIds: string[];
  participantIds: string[];
  duplicateEventIds: string[];
}

interface CricketValidationInningsRow {
  inningsId: string;
  battingTeamId: string;
  bowlingTeamId: string | null;
}

interface CricketValidationParticipantRow {
  participantId: string;
  teamId: string;
}

interface SubmissionRow {
  submissionId: string;
  receivedAt: Date;
}

interface DeliveryRow {
  deliveryId: string;
}

interface CorrectionTargetRow extends CorrectionTarget {
  deliveryId: string;
  submissionId: string;
  eventOrdinal: number;
  revision: number;
  sourceBatchItemId: string | null;
}

interface CorrectionHistoryRow {
  correctionId: string;
  previousDeliveryId: string;
  replacementDeliveryId: string;
  previousRevision: number;
  resultingRevision: number;
  requesterId: string;
  requesterDisplayName: string | null;
  correctedAt: Date;
  reason: string;
  submissionId: string;
  submissionEventOrdinal: number | null;
  batchItemId: string | null;
  previousState: SubmissionEvent;
  resultingState: SubmissionEvent;
  reviewerId: string | null;
  reviewerDisplayName: string | null;
  reviewDecision: 'approved' | 'rejected' | null;
  reviewedAt: Date | null;
  reviewReason: string | null;
}

async function assertSubmissionAuthorized(
  client: QueryExecutor,
  fixtureId: string,
  submitterId: string,
): Promise<void> {
  const result = await executeQuery<{ authorized: boolean }>(
    client,
    `
      SELECT EXISTS (
        SELECT 1
        FROM app_user account
        JOIN fixture
          ON fixture.fixture_id = $2
        WHERE account.app_user_id = $1
          AND account.application_role IN ('submitter', 'admin')
          AND account.disabled_at IS NULL
          AND (
            account.application_role = 'admin'
            OR EXISTS (
              SELECT 1
              FROM submitter_competition_scope scope
              WHERE scope.app_user_id = account.app_user_id
                AND scope.competition_id = fixture.competition_id
            )
          )
      ) AS authorized
    `,
    [submitterId, fixtureId],
  );

  if (!result.rows[0]?.authorized) {
    throw new SubmissionForbiddenError();
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function referencedParticipantIds(events: SubmissionEvent[]): string[] {
  return unique(
    events.flatMap((event) => [
      event.strikerId,
      event.nonStrikerId,
      event.bowlerId,
      ...event.wickets.flatMap((wicket) => [
        wicket.playerOutId,
        ...wicket.fielders.flatMap((fielder) =>
          fielder.participantId ? [fielder.participantId] : [],
        ),
      ]),
    ]),
  );
}

function cricketValidationDetails(
  results: readonly CricketValidationResult[],
  fieldPrefix = '',
): ApiErrorDetail[] {
  return results.map((result) => ({
    code: result.code,
    message: result.message,
    field: `${fieldPrefix}${result.fieldPath}`,
    eventIndex: result.eventIndex,
    ruleVersion: result.ruleVersion,
    severity: result.severity,
  }));
}

async function loadCricketValidationContext(
  client: QueryExecutor,
  fixtureId: string,
  events: SubmissionEvent[],
): Promise<CricketValidationContext> {
  const inningsIds = unique(events.map((event) => event.inningsId));

  const participantIds = referencedParticipantIds(events);

  const [inningsResult, participantResult, dismissalResult] = await Promise.all([
    executeQuery<CricketValidationInningsRow>(
      client,
      `
        SELECT
          i.innings_id::text AS "inningsId",
          i.batting_team_id::text AS "battingTeamId",
          (
            SELECT fixture_team.team_id::text
            FROM fixture_team
            WHERE fixture_team.fixture_id = i.fixture_id
              AND fixture_team.team_id <> i.batting_team_id
            ORDER BY fixture_team.ordinal ASC
            LIMIT 1
          ) AS "bowlingTeamId"
        FROM innings i
        WHERE i.fixture_id = $1
          AND i.innings_id = ANY($2::bigint[])
      `,
      [fixtureId, inningsIds],
    ),

    executeQuery<CricketValidationParticipantRow>(
      client,
      `
        SELECT
          person_id::text AS "participantId",
          team_id::text AS "teamId"
        FROM fixture_squad
        WHERE fixture_id = $1
          AND person_id = ANY($2::bigint[])
      `,
      [fixtureId, participantIds],
    ),

    executeQuery<{ code: string }>(
      client,
      `
        SELECT code
        FROM dismissal_kind
      `,
    ),
  ]);

  const inningsById: Record<
    string,
    {
      battingTeamId: string;
      bowlingTeamId: string;
    }
  > = {};

  for (const innings of inningsResult.rows) {
    if (innings.bowlingTeamId !== null) {
      inningsById[innings.inningsId] = {
        battingTeamId: innings.battingTeamId,
        bowlingTeamId: innings.bowlingTeamId,
      };
    }
  }

  const participantTeamById: Record<string, string> = {};

  for (const participant of participantResult.rows) {
    participantTeamById[participant.participantId] = participant.teamId;
  }

  return {
    inningsById,
    participantTeamById,
    dismissalKinds: dismissalResult.rows.map((row) => row.code),
  };
}

async function validateCricketRules(
  client: QueryExecutor,
  fixtureId: string,
  events: SubmissionEvent[],
  fieldPrefix = '',
): Promise<void> {
  const context = await loadCricketValidationContext(client, fixtureId, events);

  const results = validateCricketBusinessRules(events, context);

  if (results.length > 0) {
    throw new SubmissionValidationError(
      'The submission contains invalid cricket event data.',
      cricketValidationDetails(results, fieldPrefix),
    );
  }
}

async function validateReferences(
  client: PoolClient,
  fixtureId: string,
  events: SubmissionEvent[],
  checkDuplicateEventIds = true,
): Promise<void> {
  const inningsIds = unique(events.map((event) => event.inningsId));
  const participantIds = referencedParticipantIds(events);
  const eventIds = events.map((event) => event.eventId);

  const result = await executeQuery<ReferenceRows>(
    client,
    `
      SELECT
        COALESCE(
          ARRAY(
            SELECT innings_id::text
            FROM innings
            WHERE fixture_id = $1
              AND innings_id = ANY($2::bigint[])
          ),
          ARRAY[]::text[]
        ) AS "inningsIds",
        COALESCE(
          ARRAY(
            SELECT person_id::text
            FROM fixture_squad
            WHERE fixture_id = $1
              AND person_id = ANY($3::bigint[])
          ),
          ARRAY[]::text[]
        ) AS "participantIds",
        COALESCE(
          ARRAY(
            SELECT source_event_id::text
            FROM delivery
            WHERE source_event_id = ANY($4::uuid[])
          ),
          ARRAY[]::text[]
        ) AS "duplicateEventIds"
    `,
    [fixtureId, inningsIds, participantIds, eventIds],
  );

  const references = result.rows[0];
  if (!references) {
    throw new Error('Submission reference validation returned no result');
  }

  const validInnings = new Set(references.inningsIds);
  const validParticipants = new Set(references.participantIds);
  const duplicateEventIds = new Set(references.duplicateEventIds);
  const details = events.flatMap((event, eventIndex) => {
    const eventDetails: ApiErrorDetail[] = [];

    if (!validInnings.has(event.inningsId)) {
      eventDetails.push({
        code: 'INVALID_INNINGS',
        message: 'The innings does not belong to the submitted fixture.',
        field: 'inningsId',
        eventIndex,
      });
    }

    const participantFields: Array<[string, string]> = [
      ['strikerId', event.strikerId],
      ['nonStrikerId', event.nonStrikerId],
      ['bowlerId', event.bowlerId],
    ];

    for (const [wicketIndex, wicket] of event.wickets.entries()) {
      participantFields.push([`wickets.${wicketIndex}.playerOutId`, wicket.playerOutId]);

      for (const [fielderIndex, fielder] of wicket.fielders.entries()) {
        if (fielder.participantId) {
          participantFields.push([
            `wickets.${wicketIndex}.fielders.${fielderIndex}.participantId`,
            fielder.participantId,
          ]);
        }
      }
    }

    for (const [field, participantId] of participantFields) {
      if (!validParticipants.has(participantId)) {
        eventDetails.push({
          code: 'INVALID_PARTICIPANT',
          message: 'The participant does not belong to the submitted fixture.',
          field,
          eventIndex,
        });
      }
    }

    if (checkDuplicateEventIds && duplicateEventIds.has(event.eventId)) {
      eventDetails.push({
        code: 'DUPLICATE_EVENT_ID',
        message: 'The event identifier has already been accepted.',
        field: 'eventId',
        eventIndex,
      });
    }

    return eventDetails;
  });

  if (details.some((detail) => detail.code === 'DUPLICATE_EVENT_ID')) {
    throw new SubmissionConflictError(
      'DUPLICATE_EVENT_ID',
      'One or more event identifiers have already been accepted.',
    );
  }

  if (details.length > 0) {
    throw new SubmissionValidationError(
      'The submission contains invalid event references.',
      details,
    );
  }
}

async function findLiveCorrectionTarget(
  client: QueryExecutor,
  eventId: string,
  lock = false,
): Promise<CorrectionTargetRow | null> {
  const result = await executeQuery<CorrectionTargetRow>(
    client,
    `
      SELECT
        i.fixture_id::text AS "fixtureId",
        f.competition_id::text AS "competitionId",
        f.season,
        d.innings_sequence AS "sequenceNumber",
        d.delivery_id::text AS "deliveryId",
        d.submission_id::text AS "submissionId",
        d.submission_event_ordinal AS "eventOrdinal",
        d.revision,
        d.source_batch_item_id::text AS "sourceBatchItemId"
      FROM delivery d
      JOIN innings i ON i.innings_id = d.innings_id
      JOIN fixture f ON f.fixture_id = i.fixture_id
      JOIN submission s ON s.submission_id = d.submission_id AND s.status = 'accepted'
      WHERE d.source_event_id = $1::uuid
        AND d.superseded_at IS NULL
      ${lock ? 'FOR UPDATE OF d' : ''}
    `,
    [eventId],
  );

  return result.rows[0] ?? null;
}

async function insertDelivery(
  client: PoolClient,
  submissionId: string,
  event: SubmissionEvent,
  ordinal: number,
  revision = 1,
  supersedesDeliveryId: string | null = null,
  sourceBatchItemId: string | null = null,
): Promise<string> {
  const result = await executeQuery<DeliveryRow>(
    client,
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
        non_boundary,
        extra_wides,
        extra_noballs,
        extra_byes,
        extra_legbyes,
        extra_penalty,
        submission_id,
        source_event_id,
        submission_event_ordinal,
        revision,
        supersedes_delivery_id,
        source_batch_item_id
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
      )
      RETURNING delivery_id::text AS "deliveryId"
    `,
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
      submissionId,
      event.eventId,
      ordinal,
      revision,
      supersedesDeliveryId,
      sourceBatchItemId,
    ],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error('Delivery insertion returned no identifier');
  }

  return row.deliveryId;
}

async function loadEventSnapshot(
  client: QueryExecutor,
  deliveryId: string,
): Promise<SubmissionEvent> {
  const result = await executeQuery<{ state: SubmissionEvent }>(
    client,
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
          'offBat', d.runs_off_bat,
          'extras', d.runs_extras,
          'total', d.runs_total,
          'nonBoundary', d.non_boundary
        ),
        'extras', jsonb_strip_nulls(jsonb_build_object(
          'wides', d.extra_wides,
          'noBalls', d.extra_noballs,
          'byes', d.extra_byes,
          'legByes', d.extra_legbyes,
          'penalty', d.extra_penalty
        )),
        'wickets', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'kind', wicket.kind,
              'playerOutId', wicket.player_out_id::text,
              'fielders', COALESCE((
                SELECT jsonb_agg(
                  jsonb_strip_nulls(jsonb_build_object(
                    'participantId', fielder.person_id::text,
                    'substitute', fielder.is_substitute
                  )) ORDER BY fielder.ordinal
                )
                FROM delivery_wicket_fielder fielder
                WHERE fielder.wicket_id = wicket.wicket_id
              ), '[]'::jsonb)
            ) ORDER BY wicket.ordinal
          )
          FROM delivery_wicket wicket
          WHERE wicket.delivery_id = d.delivery_id
        ), '[]'::jsonb)
      ) AS state
      FROM delivery d
      WHERE d.delivery_id = $1
    `,
    [deliveryId],
  );

  const state = result.rows[0]?.state;
  if (!state) {
    throw new Error('Delivery snapshot query returned no event');
  }

  return state;
}

async function insertWickets(
  client: PoolClient,
  deliveryId: string,
  event: SubmissionEvent,
): Promise<void> {
  for (const [wicketOrdinal, wicket] of event.wickets.entries()) {
    const wicketResult = await executeQuery<{ wicketId: string }>(
      client,
      `
        INSERT INTO delivery_wicket (
          delivery_id,
          ordinal,
          kind,
          source_kind,
          player_out_id
        )
        VALUES ($1, $2, $3, $3, $4)
        RETURNING wicket_id::text AS "wicketId"
      `,
      [deliveryId, wicketOrdinal, wicket.kind, wicket.playerOutId],
    );

    const wicketId = wicketResult.rows[0]?.wicketId;
    if (!wicketId) {
      throw new Error('Wicket insertion returned no identifier');
    }

    for (const [fielderOrdinal, fielder] of wicket.fielders.entries()) {
      await executeQuery(
        client,
        `
          INSERT INTO delivery_wicket_fielder (
            wicket_id,
            ordinal,
            person_id,
            is_substitute
          )
          VALUES ($1, $2, $3, $4)
        `,
        [wicketId, fielderOrdinal, fielder.participantId ?? null, fielder.substitute],
      );
    }
  }
}

export function createSubmissionRepository(pool?: Pool): SubmissionRepository {
  return {
    async findFixtureScope(fixtureId) {
      const databasePool = pool ?? getDatabasePool();
      const result = await executeQuery<FixtureScopeRow>(
        databasePool,
        `
          SELECT
            fixture_id::text AS "fixtureId",
            competition_id::text AS "competitionId"
          FROM fixture
          WHERE fixture_id = $1
        `,
        [fixtureId],
      );

      return result.rows[0] ?? null;
    },

    async findCorrectionTarget(eventId) {
      const databasePool = pool ?? getDatabasePool();
      const target = await findLiveCorrectionTarget(databasePool, eventId);
      return (
        target && {
          fixtureId: target.fixtureId,
          competitionId: target.competitionId,
          season: target.season,
          sequenceNumber: target.sequenceNumber,
        }
      );
    },

    async storeAcceptedSubmission(submission, submitterId, sourceFile, sourceChecksum) {
      const databasePool = pool ?? getDatabasePool();
      try {
        return await withTransaction(databasePool, async (client) => {
          // Re-check server-owned authorization inside the write transaction so
          // a concurrent approval or scope revocation cannot race the request.
          await assertSubmissionAuthorized(client, submission.fixtureId, submitterId);
          await validateReferences(client, submission.fixtureId, submission.events);
          await validateCricketRules(client, submission.fixtureId, submission.events);

          const submissionResult = await executeQuery<SubmissionRow>(
            client,
            `
              INSERT INTO submission (
                submitted_by,
                fixture_id,
                schema_version,
                event_count,
                source_file_name,
                source_file_media_type,
                source_file_size_bytes,
                source_sha256,
                status
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'accepted')
              RETURNING
                submission_id::text AS "submissionId",
                received_at AS "receivedAt"
            `,
            [
              submitterId,
              submission.fixtureId,
              submission.schemaVersion,
              submission.events.length,
              sourceFile?.fileName ?? null,
              sourceFile?.mediaType ?? null,
              sourceFile?.sizeBytes ?? null,
              sourceChecksum,
            ],
          );

          const storedSubmission = submissionResult.rows[0];
          if (!storedSubmission) {
            throw new Error('Submission insertion returned no identifier');
          }

          for (const [ordinal, event] of submission.events.entries()) {
            const deliveryId = await insertDelivery(
              client,
              storedSubmission.submissionId,
              event,
              ordinal,
            );
            await insertWickets(client, deliveryId, event);
          }
          await advanceFixtureStatisticsCacheVersions(client, [submission.fixtureId]);

          return {
            submissionId: storedSubmission.submissionId,
            fixtureId: submission.fixtureId,
            submitterId,
            status: 'accepted',
            receivedAt: storedSubmission.receivedAt.toISOString(),
            schemaVersion: submission.schemaVersion,
            eventCount: submission.events.length,
            checksum: sourceChecksum,
            ...(sourceFile ? { sourceFile } : {}),
          };
        });
      } catch (error) {
        if (error instanceof DatabaseAccessError && error.code === 'DATABASE_CONFLICT') {
          throw new SubmissionConflictError(
            'EVENT_CONFLICT',
            'An event identifier, sequence, or delivery position conflicts with accepted data.',
          );
        }

        throw error;
      }
    },

    async storeAcceptedCorrection(eventId, correction, submitterId) {
      const databasePool = pool ?? getDatabasePool();
      return withTransaction(databasePool, async (client) => {
        // Serialize corrections by stable source identity. A request waiting on
        // another correction sees the newly current revision and increments it.
        await executeQuery(client, 'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
          eventId,
        ]);
        const target = await findLiveCorrectionTarget(client, eventId, true);
        if (!target || target.fixtureId !== correction.fixtureId) {
          throw new SubmissionValidationError('The correction references an unavailable event.', [
            {
              code: 'EVENT_NOT_FOUND',
              message: 'The source event is not an accepted, correctable event for this fixture.',
              field: 'eventId',
            },
          ]);
        }

        await assertSubmissionAuthorized(client, target.fixtureId, submitterId);
        const event: SubmissionEvent = {
          ...correction.event,
          eventId,
          sequenceNumber: target.sequenceNumber,
        };
        await validateReferences(client, target.fixtureId, [event], false);
        await validateCricketRules(client, target.fixtureId, [event], 'event.');
        const previousState = await loadEventSnapshot(client, target.deliveryId);

        // The base schema requires a superseded row to name a successor. Mark it
        // temporarily self-superseded inside this transaction, freeing the live
        // keys before its immutable replacement is inserted.
        await executeQuery(
          client,
          `
            UPDATE delivery
            SET superseded_at = now(),
                superseded_by = delivery_id
            WHERE delivery_id = $1
          `,
          [target.deliveryId],
        );

        const replacement = await insertDelivery(
          client,
          target.submissionId,
          event,
          target.eventOrdinal,
          target.revision + 1,
          target.deliveryId,
          target.sourceBatchItemId,
        );
        await insertWickets(client, replacement, event);
        await executeQuery(
          client,
          `
            UPDATE delivery
            SET superseded_by = $2
            WHERE delivery_id = $1
          `,
          [target.deliveryId, replacement],
        );
        const resultingState = await loadEventSnapshot(client, replacement);
        await executeQuery(
          client,
          `
            INSERT INTO delivery_correction_history (
              source_event_id,
              previous_delivery_id,
              replacement_delivery_id,
              requester_id,
              reason,
              previous_state,
              resulting_state,
              original_submission_id,
              original_submission_ordinal,
              original_batch_item_id
            )
            VALUES ($1::uuid, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10)
          `,
          [
            eventId,
            target.deliveryId,
            replacement,
            submitterId,
            correction.reason,
            JSON.stringify(previousState),
            JSON.stringify(resultingState),
            target.submissionId,
            target.eventOrdinal,
            target.sourceBatchItemId,
          ],
        );

        const dependencies = deriveCorrectionStatisticsDependencies({
          fixtureId: target.fixtureId,
          competitionId: target.competitionId,
          season: target.season,
          previousParticipantIds: aggregateParticipantIds(previousState),
          resultingParticipantIds: aggregateParticipantIds(event),
        });
        await recordStatisticsRefreshDependencies(
          client,
          eventId,
          target.revision + 1,
          dependencies,
        );
        await advanceFixtureStatisticsCacheVersions(client, [target.fixtureId]);

        return {
          eventId,
          fixtureId: target.fixtureId,
          revision: target.revision + 1,
          refreshedScopes: dependencies.map(({ scope, participantId, competitionId, season }) => ({
            scope,
            participantId,
            competitionId,
            season,
          })),
        };
      });
    },

    async listCorrectionHistory(eventId) {
      const databasePool = pool ?? getDatabasePool();
      const target = await findLiveCorrectionTarget(databasePool, eventId);
      if (!target) {
        throw new SubmissionValidationError('The correction history is unavailable.', [
          {
            code: 'EVENT_NOT_FOUND',
            message: 'The source event is not an accepted event.',
            field: 'eventId',
          },
        ]);
      }

      const result = await executeQuery<CorrectionHistoryRow>(
        databasePool,
        `
          SELECT
            history.delivery_correction_history_id::text AS "correctionId",
            history.previous_delivery_id::text AS "previousDeliveryId",
            history.replacement_delivery_id::text AS "replacementDeliveryId",
            previous.revision AS "previousRevision",
            replacement.revision AS "resultingRevision",
            requester.app_user_id::text AS "requesterId",
            requester.display_name AS "requesterDisplayName",
            history.requested_at AS "correctedAt",
            history.reason,
            history.original_submission_id::text AS "submissionId",
            history.original_submission_ordinal AS "submissionEventOrdinal",
            history.original_batch_item_id::text AS "batchItemId",
            history.previous_state AS "previousState",
            history.resulting_state AS "resultingState",
            reviewer.app_user_id::text AS "reviewerId",
            reviewer.display_name AS "reviewerDisplayName",
            history.review_decision AS "reviewDecision",
            history.reviewed_at AS "reviewedAt",
            history.review_reason AS "reviewReason"
          FROM delivery_correction_history history
          JOIN delivery previous ON previous.delivery_id = history.previous_delivery_id
          JOIN delivery replacement ON replacement.delivery_id = history.replacement_delivery_id
          JOIN app_user requester ON requester.app_user_id = history.requester_id
          LEFT JOIN app_user reviewer ON reviewer.app_user_id = history.reviewer_id
          WHERE history.source_event_id = $1::uuid
          ORDER BY replacement.revision, history.delivery_correction_history_id
        `,
        [eventId],
      );

      return {
        eventId,
        fixtureId: target.fixtureId,
        corrections: result.rows.map((row) => ({
          correctionId: row.correctionId,
          previousDeliveryId: row.previousDeliveryId,
          replacementDeliveryId: row.replacementDeliveryId,
          previousRevision: row.previousRevision,
          resultingRevision: row.resultingRevision,
          requester: {
            accountId: row.requesterId,
            displayName: row.requesterDisplayName,
          },
          correctedAt: row.correctedAt.toISOString(),
          reason: row.reason,
          source: {
            submissionId: row.submissionId,
            submissionEventOrdinal: row.submissionEventOrdinal,
            batchItemId: row.batchItemId,
          },
          previousState: row.previousState,
          resultingState: row.resultingState,
          review:
            row.reviewerId && row.reviewDecision && row.reviewedAt && row.reviewReason
              ? {
                  reviewer: {
                    accountId: row.reviewerId,
                    displayName: row.reviewerDisplayName,
                  },
                  decision: row.reviewDecision,
                  reviewedAt: row.reviewedAt.toISOString(),
                  reason: row.reviewReason,
                }
              : null,
        })),
      };
    },
  };
}
