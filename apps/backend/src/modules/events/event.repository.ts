import type { PublicEvent } from '@sport-analytics/contracts';

import { executeQuery, getDatabasePool, type QueryExecutor } from '../../database';

interface PublicEventListOptions {
  fixtureId: string;
  limit: number;
  inningsId?: string;
  competitorId?: string;
  participantId?: string;
  overNumber?: number;
  wicketKind?: string;
  after?: {
    inningsOrdinal: number;
    sequenceNumber: number;
    eventId: string;
  };
}

interface PublicEventPage {
  records: PublicEvent[];
  hasMore: boolean;
}

export interface PublicEventRepository {
  fixtureExists(fixtureId: string): Promise<boolean>;
  listAcceptedFixtureEvents(options: PublicEventListOptions): Promise<PublicEventPage>;
  findAcceptedFixtureEvent(fixtureId: string, eventId: string): Promise<PublicEvent | null>;
}

interface FixtureExistsRow {
  exists: boolean;
}

interface AcceptedEventQueryOptions extends PublicEventListOptions {
  eventId?: string;
}

async function queryAcceptedFixtureEvents(
  executor: QueryExecutor,
  options: AcceptedEventQueryOptions,
): Promise<PublicEventPage> {
  const values: unknown[] = [options.fixtureId];
  const conditions: string[] = [];

  if (options.eventId) {
    values.push(options.eventId);
    conditions.push(`d.delivery_id = $${values.length}::bigint`);
  }

  if (options.inningsId) {
    values.push(options.inningsId);
    conditions.push(`d.innings_id = $${values.length}::bigint`);
  }

  if (options.competitorId) {
    values.push(options.competitorId);
    conditions.push(`i.batting_team_id = $${values.length}::bigint`);
  }

  if (options.participantId) {
    values.push(options.participantId);
    const participantParameter = values.length;
    conditions.push(`
      (
        d.striker_id = $${participantParameter}::bigint
        OR d.non_striker_id = $${participantParameter}::bigint
        OR d.bowler_id = $${participantParameter}::bigint
        OR EXISTS (
          SELECT 1
          FROM delivery_wicket participant_wicket
          WHERE participant_wicket.delivery_id = d.delivery_id
            AND (
              participant_wicket.player_out_id = $${participantParameter}::bigint
              OR EXISTS (
                SELECT 1
                FROM delivery_wicket_fielder participant_fielder
                WHERE participant_fielder.wicket_id = participant_wicket.wicket_id
                  AND participant_fielder.person_id = $${participantParameter}::bigint
              )
            )
        )
      )
    `);
  }

  if (options.overNumber !== undefined) {
    values.push(options.overNumber);
    conditions.push(`d.over_number = $${values.length}::smallint`);
  }

  if (options.wicketKind) {
    values.push(options.wicketKind);
    conditions.push(`
      EXISTS (
        SELECT 1
        FROM delivery_wicket filtered_wicket
        WHERE filtered_wicket.delivery_id = d.delivery_id
          AND filtered_wicket.kind = $${values.length}::text
      )
    `);
  }

  if (options.after) {
    values.push(options.after.inningsOrdinal);
    const inningsOrdinalParameter = values.length;
    values.push(options.after.sequenceNumber);
    const sequenceParameter = values.length;
    values.push(options.after.eventId);
    const eventIdParameter = values.length;

    conditions.push(`
      (i.ordinal, d.innings_sequence, d.delivery_id)
        > ($${inningsOrdinalParameter}::smallint, $${sequenceParameter}::integer, $${eventIdParameter}::bigint)
    `);
  }

  values.push(options.limit + 1);
  const limitParameter = values.length;
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await executeQuery<PublicEvent>(
    executor,
    `
      WITH accepted_delivery AS (
        SELECT DISTINCT ON (delivery.innings_id, delivery.over_number, delivery.position_in_over)
          delivery.*
        FROM delivery_current delivery
        INNER JOIN innings source_innings
          ON source_innings.innings_id = delivery.innings_id
        INNER JOIN submission source_submission
          ON source_submission.submission_id = delivery.submission_id
         AND source_submission.status = 'accepted'
        WHERE source_innings.fixture_id = $1::bigint
        ORDER BY
          delivery.innings_id ASC,
          delivery.over_number ASC,
          delivery.position_in_over ASC,
          delivery.revision DESC,
          delivery.delivery_id DESC
      )
      SELECT
        d.delivery_id::text AS "eventId",
        i.fixture_id::text AS "fixtureId",
        i.innings_id::text AS "inningsId",
        i.ordinal AS "inningsOrdinal",
        d.innings_sequence AS "sequenceNumber",
        d.over_number AS "overNumber",
        d.position_in_over AS "positionInOver",
        d.ball_number AS "ballNumber",
        i.batting_team_id::text AS "battingCompetitorId",
        (
          SELECT fixture_team.team_id::text
          FROM fixture_team
          WHERE fixture_team.fixture_id = i.fixture_id
            AND fixture_team.team_id <> i.batting_team_id
          ORDER BY fixture_team.ordinal ASC
          LIMIT 1
        ) AS "bowlingCompetitorId",
        d.striker_id::text AS "strikerParticipantId",
        d.non_striker_id::text AS "nonStrikerParticipantId",
        d.bowler_id::text AS "bowlerParticipantId",
        jsonb_build_object(
          'offBat', d.runs_off_bat,
          'extras', d.runs_extras,
          'total', d.runs_total,
          'nonBoundary', d.non_boundary
        ) AS runs,
        jsonb_build_object(
          'wides', d.extra_wides,
          'noBalls', d.extra_noballs,
          'byes', d.extra_byes,
          'legByes', d.extra_legbyes,
          'penalty', d.extra_penalty
        ) AS extras,
        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'wicketId', event_wicket.wicket_id::text,
                'kind', event_wicket.kind,
                'playerOutParticipantId', event_wicket.player_out_id::text,
                'fielders', COALESCE(
                  (
                    SELECT jsonb_agg(
                      jsonb_build_object(
                        'participantId', event_fielder.person_id::text,
                        'isSubstitute', event_fielder.is_substitute
                      )
                      ORDER BY event_fielder.ordinal ASC
                    )
                    FROM delivery_wicket_fielder event_fielder
                    WHERE event_fielder.wicket_id = event_wicket.wicket_id
                  ),
                  '[]'::jsonb
                )
              )
              ORDER BY event_wicket.ordinal ASC, event_wicket.wicket_id ASC
            )
            FROM delivery_wicket event_wicket
            WHERE event_wicket.delivery_id = d.delivery_id
          ),
          '[]'::jsonb
        ) AS wickets
      FROM accepted_delivery d
      INNER JOIN innings i
        ON i.innings_id = d.innings_id
      ${where}
      ORDER BY i.ordinal ASC, d.innings_sequence ASC, d.delivery_id ASC
      LIMIT $${limitParameter}
    `,
    values,
  );

  return {
    records: result.rows.slice(0, options.limit),
    hasMore: result.rows.length > options.limit,
  };
}

export function createPublicEventRepository(executor?: QueryExecutor): PublicEventRepository {
  function database(): QueryExecutor {
    return executor ?? getDatabasePool();
  }

  return {
    async fixtureExists(fixtureId) {
      const result = await executeQuery<FixtureExistsRow>(
        database(),
        'SELECT EXISTS (SELECT 1 FROM fixture WHERE fixture_id = $1::bigint) AS exists',
        [fixtureId],
      );

      return result.rows[0]?.exists ?? false;
    },

    async listAcceptedFixtureEvents(options) {
      return queryAcceptedFixtureEvents(database(), options);
    },

    async findAcceptedFixtureEvent(fixtureId, eventId) {
      const page = await queryAcceptedFixtureEvents(database(), {
        fixtureId,
        eventId,
        limit: 1,
      });

      return page.records[0] ?? null;
    },
  };
}
