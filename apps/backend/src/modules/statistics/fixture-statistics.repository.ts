import { executeQuery, getDatabasePool, type QueryExecutor } from '../../database';
import type {
  FixtureStatisticsEventSource,
  FixtureStatisticsInningsSource,
  FixtureStatisticsMiscountedOverSource,
  FixtureStatisticsPowerplaySource,
  FixtureStatisticsSquadMemberSource,
  FixtureStatisticsSource,
} from './fixture-statistics.model';
import { standardInningsPredicate } from './super-over-scope';

interface FixtureInningsRow {
  fixtureId: string;
  ballsPerOver: number;
  missingFields: string[];
  outcome: FixtureStatisticsSource['outcome'];
  winnerCompetitorId: string | null;
  winnerCompetitorName: string | null;
  eliminatorCompetitorId: string | null;
  eliminatorCompetitorName: string | null;
  outcomeByRuns: number | null;
  outcomeByWickets: number | null;
  outcomeMethod: string | null;
  decidedByBowlOut: boolean;
  inningsId: string | null;
  inningsOrdinal: number | null;
  battingCompetitorId: string | null;
  battingCompetitorName: string | null;
  penaltyPre: number | null;
  penaltyPost: number | null;
  miscountedOvers: FixtureStatisticsMiscountedOverSource[];
  powerplays: FixtureStatisticsPowerplaySource[];
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
      winner_team.name AS "winnerCompetitorName",
      f.eliminator_id::text AS "eliminatorCompetitorId",
      eliminator_team.name AS "eliminatorCompetitorName",
      f.outcome_by_runs AS "outcomeByRuns",
      f.outcome_by_wickets AS "outcomeByWickets",
      f.outcome_method AS "outcomeMethod",
      f.decided_by_bowl_out AS "decidedByBowlOut",
      i.innings_id::text AS "inningsId",
      i.ordinal AS "inningsOrdinal",
      i.batting_team_id::text AS "battingCompetitorId",
      batting_team.name AS "battingCompetitorName",
      i.penalty_pre AS "penaltyPre",
      i.penalty_post AS "penaltyPost",
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'overNumber', miscount.over_number,
          'balls', miscount.balls
        ) ORDER BY miscount.over_number ASC)
        FROM innings_miscounted_over miscount
        WHERE miscount.innings_id = i.innings_id
      ), '[]'::jsonb) AS "miscountedOvers"
      , COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'fromBall', powerplay.from_ball::double precision,
          'toBall', powerplay.to_ball::double precision,
          'type', powerplay.type
        ) ORDER BY powerplay.from_ball ASC, powerplay.to_ball ASC, powerplay.type ASC)
        FROM innings_powerplay powerplay
        WHERE powerplay.innings_id = i.innings_id
      ), '[]'::jsonb) AS powerplays
    FROM fixture f
    JOIN submission publication
      ON publication.submission_id = f.first_seen_in
     AND publication.status = 'accepted'
    LEFT JOIN team winner_team
      ON winner_team.team_id = f.winner_id
    LEFT JOIN team eliminator_team
      ON eliminator_team.team_id = f.eliminator_id
    LEFT JOIN innings i
      ON i.fixture_id = f.fixture_id
     AND ${standardInningsPredicate('i')}
    LEFT JOIN team batting_team
      ON batting_team.team_id = i.batting_team_id
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
    if (
      row.inningsId === null ||
      row.inningsOrdinal === null ||
      row.battingCompetitorId === null ||
      row.battingCompetitorName === null
    ) {
      return [];
    }

    return [
      {
        inningsId: row.inningsId,
        ordinal: row.inningsOrdinal,
        battingCompetitorId: row.battingCompetitorId,
        battingCompetitorName: row.battingCompetitorName,
        penaltyPre: row.penaltyPre,
        penaltyPost: row.penaltyPost,
        miscountedOvers: row.miscountedOvers,
        powerplays: row.powerplays,
      },
    ];
  });

  const standardInningsIds = innings.map((inningsRecord) => inningsRecord.inningsId);

  const deliveryResult = await executeQuery<DeliveryRow>(
    executor,
    `
    WITH accepted_delivery AS (
      SELECT d.*
      FROM delivery_current d
      JOIN submission source_submission
        ON source_submission.submission_id = d.submission_id
       AND source_submission.status = 'accepted'
      WHERE d.innings_id = ANY($1::bigint[])
    )
    SELECT
      d.delivery_id::text AS "deliveryId",
      i.innings_id::text AS "inningsId",
      i.ordinal AS "inningsOrdinal",
      d.innings_sequence AS "inningsSequence",
      d.over_number AS "overNumber",
      d.ball_number AS "ballNumber",
      i.batting_team_id::text AS "battingCompetitorId",
      batting_team.name AS "battingCompetitorName",
      bowling_team.competitor_id AS "bowlingCompetitorId",
      bowling_team.competitor_name AS "bowlingCompetitorName",
      d.striker_id::text AS "strikerId",
      striker_person.display_name AS "strikerName",
      d.non_striker_id::text AS "nonStrikerId",
      non_striker_person.display_name AS "nonStrikerName",
      d.bowler_id::text AS "bowlerId",
      bowler_person.display_name AS "bowlerName",
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
      , COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'wicketId', dw.wicket_id::text,
          'eventId', d.delivery_id::text,
          'playerOutId', dw.player_out_id::text,
          'kind', dw.kind,
          'isTerminal', dw.kind NOT IN ('retired hurt', 'retired not out')
        ) ORDER BY dw.ordinal ASC)
        FROM delivery_wicket dw
        WHERE dw.delivery_id = d.delivery_id
      ), '[]'::jsonb) AS wickets
    FROM accepted_delivery d
    JOIN innings i
      ON i.innings_id = d.innings_id
    JOIN team batting_team
      ON batting_team.team_id = i.batting_team_id
    JOIN person striker_person
      ON striker_person.person_id = d.striker_id
    JOIN person non_striker_person
      ON non_striker_person.person_id = d.non_striker_id
    JOIN person bowler_person
      ON bowler_person.person_id = d.bowler_id
    LEFT JOIN LATERAL (
      SELECT
        ft.team_id::text AS competitor_id,
        t.name AS competitor_name
      FROM fixture_team ft
      JOIN team t
        ON t.team_id = ft.team_id
      WHERE ft.fixture_id = i.fixture_id
        AND ft.team_id <> i.batting_team_id
      ORDER BY ft.ordinal ASC
      LIMIT 1
    ) bowling_team ON true
    ORDER BY i.ordinal ASC, d.innings_sequence ASC, d.delivery_id ASC
  `,
    [standardInningsIds],
  );

  const squadResult = await executeQuery<FixtureStatisticsSquadMemberSource>(
    executor,
    `
      SELECT
        fs.person_id::text AS "participantId",
        p.display_name AS "participantName",
        fs.team_id::text AS "competitorId",
        t.name AS "competitorName"
      FROM fixture_squad fs
      JOIN person p ON p.person_id = fs.person_id
      JOIN team t ON t.team_id = fs.team_id
      WHERE fs.fixture_id = $1::bigint
      ORDER BY fs.team_id ASC, fs.person_id ASC
    `,
    [fixtureId],
  );

  return {
    fixtureId: fixtureRow.fixtureId,
    ballsPerOver: fixtureRow.ballsPerOver,
    missingFields: fixtureRow.missingFields,
    outcome: fixtureRow.outcome,
    winnerCompetitorId: fixtureRow.winnerCompetitorId,
    winnerCompetitorName: fixtureRow.winnerCompetitorName,
    eliminatorCompetitorId: fixtureRow.eliminatorCompetitorId,
    eliminatorCompetitorName: fixtureRow.eliminatorCompetitorName,
    outcomeByRuns: fixtureRow.outcomeByRuns,
    outcomeByWickets: fixtureRow.outcomeByWickets,
    outcomeMethod: fixtureRow.outcomeMethod,
    decidedByBowlOut: fixtureRow.decidedByBowlOut,
    innings,
    events: deliveryResult.rows,
    squad: squadResult.rows,
  };
}
