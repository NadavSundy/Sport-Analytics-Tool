import type {
  ApiErrorDetail,
  SubmissionEvent,
  SubmissionRequest,
} from '@sport-analytics/contracts';
import type { Pool, PoolClient } from 'pg';

import {
  DatabaseAccessError,
  executeQuery,
  getDatabasePool,
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
}

export interface SubmissionRepository {
  findFixtureScope(fixtureId: string): Promise<FixtureSubmissionScope | null>;
  findDismissalKinds(): Promise<Set<string>>;
  storeAcceptedSubmission(
    submission: SubmissionRequest,
    submitterId: string,
  ): Promise<AcceptedSubmission>;
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

interface SubmissionRow {
  submissionId: string;
  receivedAt: Date;
}

interface DeliveryRow {
  deliveryId: string;
}

async function assertSubmissionAuthorized(
  client: PoolClient,
  fixtureId: string,
  submitterId: string,
): Promise<void> {
  const result = await executeQuery<{ authorized: boolean }>(
    client,
    `
      SELECT EXISTS (
        SELECT 1
        FROM app_user account
        JOIN submitter_competition_scope scope
          ON scope.app_user_id = account.app_user_id
        JOIN fixture
          ON fixture.competition_id = scope.competition_id
        WHERE account.app_user_id = $1
          AND account.submitter_approval_state = 'approved'
          AND account.disabled_at IS NULL
          AND fixture.fixture_id = $2
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

async function validateReferences(
  client: PoolClient,
  fixtureId: string,
  events: SubmissionEvent[],
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

    if (duplicateEventIds.has(event.eventId)) {
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

async function insertDelivery(
  client: PoolClient,
  submissionId: string,
  event: SubmissionEvent,
  ordinal: number,
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
        submission_event_ordinal
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
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
    ],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error('Delivery insertion returned no identifier');
  }

  return row.deliveryId;
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

    async findDismissalKinds() {
      const databasePool = pool ?? getDatabasePool();
      const result = await executeQuery<{ code: string }>(
        databasePool,
        `
          SELECT code
          FROM dismissal_kind
        `,
      );

      return new Set(result.rows.map((row) => row.code));
    },

    async storeAcceptedSubmission(submission, submitterId) {
      const databasePool = pool ?? getDatabasePool();
      try {
        return await withTransaction(databasePool, async (client) => {
          // Re-check server-owned authorization inside the write transaction so
          // a concurrent approval or scope revocation cannot race the request.
          await assertSubmissionAuthorized(client, submission.fixtureId, submitterId);
          await validateReferences(client, submission.fixtureId, submission.events);

          const submissionResult = await executeQuery<SubmissionRow>(
            client,
            `
              INSERT INTO submission (
                submitted_by,
                fixture_id,
                schema_version,
                event_count,
                status
              )
              VALUES ($1, $2, $3, $4, 'accepted')
              RETURNING
                submission_id::text AS "submissionId",
                received_at AS "receivedAt"
            `,
            [submitterId, submission.fixtureId, submission.schemaVersion, submission.events.length],
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

          return {
            submissionId: storedSubmission.submissionId,
            fixtureId: submission.fixtureId,
            submitterId,
            status: 'accepted',
            receivedAt: storedSubmission.receivedAt.toISOString(),
            schemaVersion: submission.schemaVersion,
            eventCount: submission.events.length,
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
  };
}
