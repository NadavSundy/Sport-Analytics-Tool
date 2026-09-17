import {
  bowlerChargedExtrasSql,
  countsAsBallFacedSql,
  isLegalDeliverySql,
  type LeaderboardMetric,
} from '@sport-analytics/contracts';

import { executeQuery, getDatabasePool, type QueryExecutor } from '../../database';
import type { LeaderboardScopeSource, LeaderboardSource } from './leaderboards.model';
import { standardInningsPredicate } from './super-over-scope';

interface LeaderboardDatabaseRow {
  competitionName: string;
  rank: number | null;
  participantId: string | null;
  participantName: string | null;
  value: number | null;
}

/**
 * Loads one bounded leaderboard with one set-based statement.
 *
 * All participants are aggregated together and ranked by PostgreSQL. The
 * endpoint never discovers participants and then calls the participant-centric
 * aggregate query once per player.
 */
export async function loadLeaderboardSource(
  scope: LeaderboardScopeSource,
  metric: LeaderboardMetric,
  limit: number,
  executor: QueryExecutor = getDatabasePool(),
): Promise<LeaderboardSource | null> {
  const result = await executeQuery<LeaderboardDatabaseRow>(
    executor,
    `
      WITH scope_context AS (
        SELECT
          c.competition_id,
          c.name AS competition_name,
          EXISTS (
            SELECT 1
            FROM fixture candidate
            JOIN submission candidate_publication
              ON candidate_publication.submission_id = candidate.first_seen_in
             AND candidate_publication.status = 'accepted'
            WHERE candidate.competition_id = c.competition_id
              AND ($2::text IS NULL OR candidate.season = $2::text)
          ) AS has_published_fixture
        FROM competition c
        WHERE c.competition_id = $1::bigint
      ),
      scoped_fixture AS (
        SELECT
          f.fixture_id,
          f.balls_per_over
        FROM fixture f
        JOIN submission publication
          ON publication.submission_id = f.first_seen_in
         AND publication.status = 'accepted'
        WHERE f.competition_id = $1::bigint
          AND ($2::text IS NULL OR f.season = $2::text)
      ),
      scoped_delivery AS (
        SELECT
          d.delivery_id,
          d.innings_id,
          d.striker_id,
          d.bowler_id,
          d.runs_off_bat,
          d.non_boundary,
          d.extra_wides,
          d.extra_noballs,
          d.extra_byes,
          d.extra_legbyes,
          sf.balls_per_over
        FROM delivery_current d
        JOIN submission source_submission
          ON source_submission.submission_id = d.submission_id
         AND source_submission.status = 'accepted'
        JOIN innings i
          ON i.innings_id = d.innings_id
         AND ${standardInningsPredicate('i')}
        JOIN scoped_fixture sf
          ON sf.fixture_id = i.fixture_id
      ),
      batting AS (
        SELECT
          sd.striker_id AS participant_id,
          COALESCE(SUM(sd.runs_off_bat), 0)::bigint AS runs_scored,
          COUNT(*) FILTER (WHERE ${countsAsBallFacedSql('sd')})::bigint AS balls_faced,
          COUNT(*) FILTER (
            WHERE sd.runs_off_bat = 4 AND NOT sd.non_boundary
          )::bigint AS fours,
          COUNT(*) FILTER (
            WHERE sd.runs_off_bat = 6 AND NOT sd.non_boundary
          )::bigint AS sixes
        FROM scoped_delivery sd
        WHERE sd.striker_id IS NOT NULL
        GROUP BY sd.striker_id
      ),
      dismissals AS (
        SELECT
          wicket.player_out_id AS participant_id,
          COUNT(DISTINCT sd.innings_id) FILTER (
            WHERE wicket.kind NOT IN ('retired hurt', 'retired not out')
          )::bigint AS dismissals
        FROM scoped_delivery sd
        JOIN delivery_wicket wicket
          ON wicket.delivery_id = sd.delivery_id
        WHERE wicket.player_out_id IS NOT NULL
        GROUP BY wicket.player_out_id
      ),
      bowling AS (
        SELECT
          sd.bowler_id AS participant_id,
          COALESCE(SUM(sd.runs_off_bat + ${bowlerChargedExtrasSql('sd')}), 0)::bigint AS runs_conceded,
          COUNT(*) FILTER (WHERE ${isLegalDeliverySql('sd')})::bigint AS legal_balls,
          COALESCE(SUM((
            SELECT COUNT(*)
            FROM delivery_wicket wicket
            JOIN dismissal_kind kind
              ON kind.code = wicket.kind
             AND kind.credits_bowler = true
            WHERE wicket.delivery_id = sd.delivery_id
          )), 0)::bigint AS wickets,
          CASE
            WHEN COUNT(DISTINCT sd.balls_per_over) = 1 THEN MIN(sd.balls_per_over)::bigint
            ELSE NULL
          END AS balls_per_over
        FROM scoped_delivery sd
        WHERE sd.bowler_id IS NOT NULL
        GROUP BY sd.bowler_id
      ),
      participant_ids AS (
        SELECT participant_id FROM batting
        UNION
        SELECT participant_id FROM dismissals
        UNION
        SELECT participant_id FROM bowling
      ),
      aggregate AS (
        SELECT
          ids.participant_id,
          person.display_name AS participant_name,
          batting.participant_id IS NOT NULL AS has_batting,
          bowling.participant_id IS NOT NULL AS has_bowling,
          COALESCE(batting.runs_scored, 0) AS runs_scored,
          COALESCE(batting.balls_faced, 0) AS balls_faced,
          COALESCE(batting.fours, 0) AS fours,
          COALESCE(batting.sixes, 0) AS sixes,
          COALESCE(dismissals.dismissals, 0) AS dismissals,
          COALESCE(bowling.runs_conceded, 0) AS runs_conceded,
          COALESCE(bowling.legal_balls, 0) AS legal_balls,
          COALESCE(bowling.wickets, 0) AS wickets,
          bowling.balls_per_over
        FROM participant_ids ids
        JOIN person
          ON person.person_id = ids.participant_id
        LEFT JOIN batting ON batting.participant_id = ids.participant_id
        LEFT JOIN dismissals ON dismissals.participant_id = ids.participant_id
        LEFT JOIN bowling ON bowling.participant_id = ids.participant_id
      ),
      valued AS (
        SELECT
          aggregate.*,
          CASE $3::text
            WHEN 'most_runs' THEN runs_scored::numeric
            WHEN 'most_wickets' THEN wickets::numeric
            WHEN 'most_fours' THEN fours::numeric
            WHEN 'most_sixes' THEN sixes::numeric
            WHEN 'highest_batting_average' THEN runs_scored::numeric / NULLIF(dismissals, 0)
            WHEN 'highest_strike_rate' THEN runs_scored::numeric * 100 / NULLIF(balls_faced, 0)
            WHEN 'best_bowling_average' THEN runs_conceded::numeric / NULLIF(wickets, 0)
            WHEN 'best_economy_rate' THEN runs_conceded::numeric * balls_per_over / NULLIF(legal_balls, 0)
            WHEN 'best_bowling_strike_rate' THEN legal_balls::numeric / NULLIF(wickets, 0)
          END AS metric_value
        FROM aggregate
        WHERE
          ($3::text IN ('most_runs', 'most_fours', 'most_sixes') AND has_batting)
          OR ($3::text = 'most_wickets' AND has_bowling)
          OR ($3::text = 'highest_batting_average' AND dismissals >= 5)
          OR ($3::text = 'highest_strike_rate' AND balls_faced >= 100)
          OR ($3::text IN ('best_bowling_average', 'best_bowling_strike_rate') AND wickets >= 5)
          OR ($3::text = 'best_economy_rate' AND legal_balls >= 60 AND balls_per_over IS NOT NULL)
      ),
      ranked AS (
        SELECT
          ROW_NUMBER() OVER (
            ORDER BY
              CASE WHEN $3::text IN (
                'most_runs', 'most_wickets', 'most_fours', 'most_sixes',
                'highest_batting_average', 'highest_strike_rate'
              ) THEN metric_value END DESC,
              CASE WHEN $3::text IN (
                'best_bowling_average', 'best_economy_rate', 'best_bowling_strike_rate'
              ) THEN metric_value END ASC,
              participant_name COLLATE "C" ASC,
              participant_id ASC
          )::int AS rank,
          participant_id,
          participant_name,
          ROUND(metric_value, 2) AS metric_value
        FROM valued
        WHERE metric_value IS NOT NULL
      )
      SELECT
        scope_context.competition_name AS "competitionName",
        ranked.rank,
        ranked.participant_id::text AS "participantId",
        ranked.participant_name AS "participantName",
        ranked.metric_value::double precision AS value
      FROM scope_context
      LEFT JOIN ranked
        ON ranked.rank <= $4::int
      WHERE $2::text IS NULL OR scope_context.has_published_fixture
      ORDER BY ranked.rank ASC NULLS LAST
    `,
    [scope.competitionId, scope.season, metric, limit],
  );

  const first = result.rows[0];
  if (!first) {
    return null;
  }

  return {
    competitionName: first.competitionName,
    metric,
    rows: result.rows.flatMap((row) =>
      row.rank !== null &&
      row.participantId !== null &&
      row.participantName !== null &&
      row.value !== null
        ? [
            {
              rank: row.rank,
              participantId: row.participantId,
              participantName: row.participantName,
              value: row.value,
            },
          ]
        : [],
    ),
  };
}
