import { executeQuery, getDatabasePool, type QueryExecutor } from '../../database';
import type {
  FixtureStatisticsEventSource,
  FixtureStatisticsInningsSource,
  FixtureStatisticsSource,
} from './fixture-statistics.model';

interface FixtureInningsRow {
  fixtureId: string;
  ballsPerOver: number;
  missingFields: string[];
  outcome: FixtureStatisticsSource['outcome'];
  winnerCompetitorId: string | null;
  eliminatorCompetitorId: string | null;
  outcomeByRuns: number | null;
  outcomeByWickets: number | null;
  outcomeMethod: string | null;
  decidedByBowlOut: boolean;
  inningsId: string | null;
  inningsOrdinal: number | null;
  battingCompetitorId: string | null;
  penaltyPre: number | null;
  penaltyPost: number | null;
}

type DeliveryRow = FixtureStatisticsEventSource;

export async function loadFixtureStatisticsSource(
  fixtureId: string,
  executor: QueryExecutor = getDatabasePool(),
): Promise<FixtureStatisticsSource | null> {
  const fixtureResult = await executeQuery<FixtureInningsRow>(
    executor,
    `
      SELECT
        f.fixture_id::text AS "fixtureId",
        f.balls_per_over AS "ballsPerOver",
        f.missing_fields AS "missingFields",
        f.outcome::text AS outcome,
        f.winner_id::text AS "winnerCompetitorId",
        f.eliminator_id::text AS "eliminatorCompetitorId",
        f.outcome_by_runs AS "outcomeByRuns",
        f.outcome_by_wickets AS "outcomeByWickets",
        f.outcome_method AS "outcomeMethod",
        f.decided_by_bowl_out AS "decidedByBowlOut",
        i.innings_id::text AS "inningsId",
        i.ordinal AS "inningsOrdinal",
        i.batting_team_id::text AS "battingCompetitorId",
        i.penalty_pre AS "penaltyPre",
        i.penalty_post AS "penaltyPost"
      FROM fixture f
      JOIN submission publication
        ON publication.submission_id = f.first_seen_in
       AND publication.status = 'accepted'
      LEFT JOIN innings i
        ON i.fixture_id = f.fixture_id
       AND i.is_super_over = false
      WHERE f.fixture_id = $1::bigint
      ORDER BY i.ordinal ASC
    `,
    [fixtureId],
  );

  const fixtureRow = fixtureResult.rows[0];
  if (!fixtureRow) {
    return null;
  }

  const innings: FixtureStatisticsInningsSource[] = fixtureResult.rows.flatMap((row) => {
    if (row.inningsId === null || row.inningsOrdinal === null || row.battingCompetitorId === null) {
      return [];
    }

    return [
      {
        inningsId: row.inningsId,
        ordinal: row.inningsOrdinal,
        battingCompetitorId: row.battingCompetitorId,
        penaltyPre: row.penaltyPre,
        penaltyPost: row.penaltyPost,
      },
    ];
  });

  const standardInningsIds = innings.map((inningsRecord) => inningsRecord.inningsId);

  const deliveryResult = await executeQuery<DeliveryRow>(
    executor,
    `
      WITH accepted_delivery AS (
        SELECT DISTINCT ON (d.innings_id, d.over_number, d.position_in_over)
          d.*
        FROM delivery d
        JOIN submission source_submission
          ON source_submission.submission_id = d.submission_id
         AND source_submission.status = 'accepted'
        WHERE d.innings_id = ANY($1::bigint[])
        ORDER BY
          d.innings_id ASC,
          d.over_number ASC,
          d.position_in_over ASC,
          d.revision DESC,
          d.delivery_id DESC
      )
      SELECT
        d.delivery_id::text AS "deliveryId",
        i.innings_id::text AS "inningsId",
        i.ordinal AS "inningsOrdinal",
        d.innings_sequence AS "inningsSequence",
        i.batting_team_id::text AS "battingCompetitorId",
        (
          SELECT ft.team_id::text
          FROM fixture_team ft
          WHERE ft.fixture_id = i.fixture_id
            AND ft.team_id <> i.batting_team_id
          ORDER BY ft.ordinal ASC
          LIMIT 1
        ) AS "bowlingCompetitorId",
        d.striker_id::text AS "strikerId",
        d.bowler_id::text AS "bowlerId",
        d.runs_off_bat AS "runsOffBat",
        d.runs_extras AS "runsExtras",
        d.runs_total AS "runsTotal",
        d.non_boundary AS "nonBoundary",
        d.extra_wides AS "extraWides",
        d.extra_noballs AS "extraNoBalls",
        d.extra_byes AS "extraByes",
        d.extra_legbyes AS "extraLegByes",
        d.extra_penalty AS "extraPenalty",
        (
          SELECT COUNT(*)::int
          FROM delivery_wicket dw
          JOIN dismissal_kind dk ON dk.code = dw.kind
          WHERE dw.delivery_id = d.delivery_id
            AND dk.credits_bowler = true
        ) AS "creditedWickets"
      FROM accepted_delivery d
      JOIN innings i ON i.innings_id = d.innings_id
      ORDER BY i.ordinal ASC, d.innings_sequence ASC, d.delivery_id ASC
    `,
    [standardInningsIds],
  );

  return {
    fixtureId: fixtureRow.fixtureId,
    ballsPerOver: fixtureRow.ballsPerOver,
    missingFields: fixtureRow.missingFields,
    outcome: fixtureRow.outcome,
    winnerCompetitorId: fixtureRow.winnerCompetitorId,
    eliminatorCompetitorId: fixtureRow.eliminatorCompetitorId,
    outcomeByRuns: fixtureRow.outcomeByRuns,
    outcomeByWickets: fixtureRow.outcomeByWickets,
    outcomeMethod: fixtureRow.outcomeMethod,
    decidedByBowlOut: fixtureRow.decidedByBowlOut,
    innings,
    events: deliveryResult.rows,
  };
}
