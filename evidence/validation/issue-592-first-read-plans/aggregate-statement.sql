
      WITH published_fixture AS (
        SELECT
          f.fixture_id,
          f.competition_id,
          f.season,
          f.balls_per_over
        FROM fixture_squad fs
        JOIN fixture f
          ON f.fixture_id = fs.fixture_id
        JOIN submission publication
          ON publication.submission_id = f.first_seen_in
         AND publication.status = 'accepted'
        WHERE fs.person_id = $1::bigint
      ),
      matched_delivery AS (
        -- Each participant relationship has its own indexed branch. Keeping the
        -- branches separate prevents a corpus-wide OR scan as careers grow.
        SELECT delivery_id FROM delivery_current WHERE striker_id = $1::bigint
        UNION
        SELECT delivery_id FROM delivery_current WHERE non_striker_id = $1::bigint
        UNION
        SELECT delivery_id FROM delivery_current WHERE bowler_id = $1::bigint
        UNION
        SELECT wicket.delivery_id
        FROM delivery_wicket wicket
        JOIN delivery_current delivery
          ON delivery.delivery_id = wicket.delivery_id
        WHERE wicket.player_out_id = $1::bigint
        UNION
        SELECT wicket.delivery_id
        FROM delivery_wicket_fielder fielder
        JOIN delivery_wicket wicket
          ON wicket.wicket_id = fielder.wicket_id
        JOIN delivery_current delivery
          ON delivery.delivery_id = wicket.delivery_id
        WHERE fielder.person_id = $1::bigint
      ),
      participant_delivery AS (
        SELECT DISTINCT ON (d.innings_id, d.over_number, d.position_in_over)
          d.delivery_id,
          d.innings_id,
          i.fixture_id,
          pf.competition_id,
          pf.season,
          pf.balls_per_over,
          d.striker_id = $1::bigint AS is_striker,
          d.non_striker_id = $1::bigint AS is_non_striker,
          d.bowler_id = $1::bigint AS is_bowler,
          d.runs_off_bat,
          d.non_boundary,
          d.extra_wides,
          d.extra_noballs,
          d.extra_byes,
          d.extra_legbyes,
          EXISTS (
            SELECT 1
            FROM delivery_wicket wicket
            WHERE wicket.delivery_id = d.delivery_id
              AND wicket.player_out_id = $1::bigint
          ) AS is_batter,
          EXISTS (
            SELECT 1
            FROM delivery_wicket wicket
            WHERE wicket.delivery_id = d.delivery_id
              AND wicket.player_out_id = $1::bigint
              AND wicket.kind NOT IN ('retired hurt', 'retired not out')
          ) AS is_dismissed,
          CASE
            WHEN d.bowler_id = $1::bigint THEN (
              SELECT COUNT(*)
              FROM delivery_wicket dw
              JOIN dismissal_kind dk
                ON dk.code = dw.kind
              WHERE dw.delivery_id = d.delivery_id
                AND dk.credits_bowler = true
            )
            ELSE 0
          END AS credited_wickets
        FROM matched_delivery m
        JOIN delivery_current d
          ON d.delivery_id = m.delivery_id
        JOIN submission source_submission
          ON source_submission.submission_id = d.submission_id
         AND source_submission.status = 'accepted'
        JOIN innings i
          ON i.innings_id = d.innings_id
         AND i.is_super_over = false
        JOIN published_fixture pf
          ON pf.fixture_id = i.fixture_id
        ORDER BY
          d.innings_id ASC,
          d.over_number ASC,
          d.position_in_over ASC,
          d.revision DESC,
          d.delivery_id DESC
      ),
      appearance_rollup AS (
        SELECT
          GROUPING(pf.competition_id) = 0 AS competition_grouped,
          GROUPING(pf.season) = 0 AS season_grouped,
          pf.competition_id,
          pf.season,
          COUNT(DISTINCT pf.fixture_id)::int AS appearances
        FROM published_fixture pf
        GROUP BY GROUPING SETS (
          (pf.competition_id, pf.season),
          (pf.competition_id),
          ()
        )
      ),
      activity_rollup AS (
        SELECT
          GROUPING(pd.competition_id) = 0 AS competition_grouped,
          GROUPING(pd.season) = 0 AS season_grouped,
          pd.competition_id,
          pd.season,
          COUNT(DISTINCT pd.fixture_id) FILTER (
            WHERE pd.is_striker OR pd.is_bowler
          )::int AS fixture_count,
          COUNT(*) FILTER (WHERE pd.is_striker OR pd.is_bowler)::int AS source_event_count,
          COUNT(*) FILTER (WHERE pd.is_striker)::int AS batting_delivery_count,
          COUNT(*) FILTER (WHERE pd.is_bowler)::int AS bowling_delivery_count
        FROM participant_delivery pd
        GROUP BY GROUPING SETS (
          (pd.competition_id, pd.season),
          (pd.competition_id),
          ()
        )
      ),
      batting_innings AS (
        SELECT
          pd.innings_id,
          pd.fixture_id,
          pd.competition_id,
          pd.season,
          COALESCE(SUM(pd.runs_off_bat) FILTER (WHERE pd.is_striker), 0)::int AS runs_scored,
          COUNT(*) FILTER (
            WHERE pd.is_striker AND (COALESCE(pd.extra_wides, 0) <= 0)
          )::int AS balls_faced,
          COUNT(*) FILTER (
            WHERE pd.is_striker AND pd.runs_off_bat = 4 AND NOT pd.non_boundary
          )::int AS fours,
          COUNT(*) FILTER (
            WHERE pd.is_striker AND pd.runs_off_bat = 6 AND NOT pd.non_boundary
          )::int AS sixes,
          BOOL_OR(pd.is_dismissed) AS dismissed
        FROM participant_delivery pd
        GROUP BY
          pd.innings_id,
          pd.fixture_id,
          pd.competition_id,
          pd.season
        HAVING BOOL_OR(pd.is_striker OR pd.is_non_striker OR pd.is_batter)
      ),
      batting_rollup AS (
        SELECT
          GROUPING(bi.competition_id) = 0 AS competition_grouped,
          GROUPING(bi.season) = 0 AS season_grouped,
          bi.competition_id,
          bi.season,
          COUNT(*)::int AS batting_innings,
          COALESCE(SUM(bi.runs_scored), 0)::int AS runs_scored,
          COALESCE(SUM(bi.balls_faced), 0)::int AS balls_faced,
          COUNT(*) FILTER (WHERE bi.dismissed)::int AS batting_dismissals,
          COALESCE(SUM(bi.fours), 0)::int AS fours,
          COALESCE(SUM(bi.sixes), 0)::int AS sixes,
          COUNT(*) FILTER (WHERE bi.runs_scored BETWEEN 50 AND 99)::int AS fifties,
          COUNT(*) FILTER (WHERE bi.runs_scored >= 100)::int AS hundreds,
          (ARRAY_AGG(
            bi.runs_scored
            ORDER BY bi.runs_scored DESC, bi.dismissed ASC, bi.innings_id ASC
          ))[1]::int AS highest_score,
          NOT (ARRAY_AGG(
            bi.dismissed
            ORDER BY bi.runs_scored DESC, bi.dismissed ASC, bi.innings_id ASC
          ))[1] AS highest_score_not_out
        FROM batting_innings bi
        GROUP BY GROUPING SETS (
          (bi.competition_id, bi.season),
          (bi.competition_id),
          ()
        )
      ),
      bowling_innings AS (
        SELECT
          pd.innings_id,
          pd.fixture_id,
          pd.competition_id,
          pd.season,
          pd.balls_per_over,
          COUNT(*)::int AS delivery_count,
          COALESCE(SUM(pd.runs_off_bat + ((CASE WHEN COALESCE(pd.extra_wides, 0) > 0 THEN COALESCE(pd.extra_wides, 0) + GREATEST(COALESCE(pd.extra_byes, 0), 0) + GREATEST(COALESCE(pd.extra_legbyes, 0), 0) ELSE 0 END) + GREATEST(COALESCE(pd.extra_noballs, 0), 0))), 0)::int AS runs_conceded,
          COALESCE(SUM((CASE WHEN COALESCE(pd.extra_wides, 0) > 0 THEN COALESCE(pd.extra_wides, 0) + GREATEST(COALESCE(pd.extra_byes, 0), 0) + GREATEST(COALESCE(pd.extra_legbyes, 0), 0) ELSE 0 END)), 0)::int AS wides,
          COALESCE(SUM(pd.extra_noballs), 0)::int AS no_balls,
          COUNT(*) FILTER (WHERE (COALESCE(pd.extra_wides, 0) <= 0 AND COALESCE(pd.extra_noballs, 0) <= 0))::int AS legal_balls,
          COALESCE(SUM(pd.credited_wickets), 0)::int AS wickets
        FROM participant_delivery pd
        WHERE pd.is_bowler
        GROUP BY
          pd.innings_id,
          pd.fixture_id,
          pd.competition_id,
          pd.season,
          pd.balls_per_over
      ),
      bowling_rollup AS (
        SELECT
          GROUPING(bo.competition_id) = 0 AS competition_grouped,
          GROUPING(bo.season) = 0 AS season_grouped,
          bo.competition_id,
          bo.season,
          COUNT(*)::int AS bowling_innings,
          COALESCE(SUM(bo.runs_conceded), 0)::int AS runs_conceded,
          COALESCE(SUM(bo.wides), 0)::int AS wides,
          COALESCE(SUM(bo.no_balls), 0)::int AS no_balls,
          COALESCE(SUM(bo.legal_balls), 0)::int AS legal_balls,
          COALESCE(SUM(bo.wickets), 0)::int AS wickets,
          COUNT(*) FILTER (WHERE bo.wickets = 4)::int AS four_wicket_hauls,
          COUNT(*) FILTER (WHERE bo.wickets >= 5)::int AS five_wicket_hauls,
          (ARRAY_AGG(
            bo.wickets
            ORDER BY bo.wickets DESC, bo.runs_conceded ASC, bo.innings_id ASC
          ))[1]::int AS best_bowling_wickets,
          (ARRAY_AGG(
            bo.runs_conceded
            ORDER BY bo.wickets DESC, bo.runs_conceded ASC, bo.innings_id ASC
          ))[1]::int AS best_bowling_runs,
          CASE
            WHEN COUNT(DISTINCT bo.balls_per_over) = 1 THEN MIN(bo.balls_per_over)::int
            ELSE NULL
          END AS balls_per_over
        FROM bowling_innings bo
        GROUP BY GROUPING SETS (
          (bo.competition_id, bo.season),
          (bo.competition_id),
          ()
        )
      ),
      fielding_contribution_raw AS (
        SELECT
          pd.fixture_id,
          pd.competition_id,
          pd.season,
          wicket.wicket_id,
          wicket.kind
        FROM participant_delivery pd
        JOIN delivery_wicket wicket
          ON wicket.delivery_id = pd.delivery_id
        JOIN delivery_wicket_fielder fielder
          ON fielder.wicket_id = wicket.wicket_id
         AND fielder.person_id = $1::bigint
        UNION ALL
        SELECT
          pd.fixture_id,
          pd.competition_id,
          pd.season,
          wicket.wicket_id,
          wicket.kind
        FROM participant_delivery pd
        JOIN delivery_wicket wicket
          ON wicket.delivery_id = pd.delivery_id
         AND wicket.kind = 'caught and bowled'
        WHERE pd.is_bowler
      ),
      fielding_contribution AS (
        SELECT DISTINCT
          fixture_id,
          competition_id,
          season,
          wicket_id,
          kind
        FROM fielding_contribution_raw
      ),
      fielding_rollup AS (
        SELECT
          GROUPING(fc.competition_id) = 0 AS competition_grouped,
          GROUPING(fc.season) = 0 AS season_grouped,
          fc.competition_id,
          fc.season,
          COUNT(*) FILTER (WHERE fc.kind IN ('caught', 'caught and bowled'))::int AS catches,
          COUNT(*) FILTER (WHERE fc.kind = 'stumped')::int AS stumpings,
          COUNT(*) FILTER (WHERE fc.kind = 'run out')::int AS run_out_involvements
        FROM fielding_contribution fc
        GROUP BY GROUPING SETS (
          (fc.competition_id, fc.season),
          (fc.competition_id),
          ()
        )
      )
      SELECT
        ar.competition_grouped AS "competitionGrouped",
        ar.season_grouped AS "seasonGrouped",
        ar.competition_id::text AS "competitionId",
        MIN(c.name) AS "competitionName",
        ar.season AS season,
        ar.appearances,
        COALESCE(ac.fixture_count, 0)::int AS "fixtureCount",
        COALESCE(ac.source_event_count, 0)::int AS "sourceEventCount",
        COALESCE(ac.batting_delivery_count, 0)::int AS "battingDeliveryCount",
        COALESCE(br.runs_scored, 0)::int AS "runsScored",
        COALESCE(br.balls_faced, 0)::int AS "ballsFaced",
        COALESCE(br.fours, 0)::int AS fours,
        COALESCE(br.sixes, 0)::int AS sixes,
        COALESCE(br.batting_innings, 0)::int AS "battingInnings",
        COALESCE(br.batting_dismissals, 0)::int AS "battingDismissals",
        COALESCE(br.fifties, 0)::int AS fifties,
        COALESCE(br.hundreds, 0)::int AS hundreds,
        br.highest_score::int AS "highestScore",
        br.highest_score_not_out AS "highestScoreNotOut",
        COALESCE(ac.bowling_delivery_count, 0)::int AS "bowlingDeliveryCount",
        COALESCE(bo.runs_conceded, 0)::int AS "runsConceded",
        COALESCE(bo.wides, 0)::int AS wides,
        COALESCE(bo.no_balls, 0)::int AS "noBalls",
        COALESCE(bo.legal_balls, 0)::int AS "legalBallsBowled",
        COALESCE(bo.wickets, 0)::int AS "wicketsTaken",
        COALESCE(bo.bowling_innings, 0)::int AS "bowlingInnings",
        COALESCE(bo.four_wicket_hauls, 0)::int AS "fourWicketHauls",
        COALESCE(bo.five_wicket_hauls, 0)::int AS "fiveWicketHauls",
        bo.best_bowling_wickets::int AS "bestBowlingWickets",
        bo.best_bowling_runs::int AS "bestBowlingRuns",
        bo.balls_per_over::int AS "ballsPerOver",
        COALESCE(fi.catches, 0)::int AS catches,
        COALESCE(fi.stumpings, 0)::int AS stumpings,
        COALESCE(fi.run_out_involvements, 0)::int AS "runOutInvolvements"
      FROM appearance_rollup ar
      LEFT JOIN competition c
        ON c.competition_id = ar.competition_id
      LEFT JOIN activity_rollup ac
        ON ac.competition_grouped = ar.competition_grouped
       AND ac.season_grouped = ar.season_grouped
       AND ac.competition_id IS NOT DISTINCT FROM ar.competition_id
       AND ac.season IS NOT DISTINCT FROM ar.season
      LEFT JOIN batting_rollup br
        ON br.competition_grouped = ar.competition_grouped
       AND br.season_grouped = ar.season_grouped
       AND br.competition_id IS NOT DISTINCT FROM ar.competition_id
       AND br.season IS NOT DISTINCT FROM ar.season
      LEFT JOIN bowling_rollup bo
        ON bo.competition_grouped = ar.competition_grouped
       AND bo.season_grouped = ar.season_grouped
       AND bo.competition_id IS NOT DISTINCT FROM ar.competition_id
       AND bo.season IS NOT DISTINCT FROM ar.season
      LEFT JOIN fielding_rollup fi
        ON fi.competition_grouped = ar.competition_grouped
       AND fi.season_grouped = ar.season_grouped
       AND fi.competition_id IS NOT DISTINCT FROM ar.competition_id
       AND fi.season IS NOT DISTINCT FROM ar.season
      GROUP BY
        ar.competition_grouped,
        ar.season_grouped,
        ar.competition_id,
        ar.season,
        ar.appearances,
        ac.fixture_count,
        ac.source_event_count,
        ac.batting_delivery_count,
        ac.bowling_delivery_count,
        br.runs_scored,
        br.balls_faced,
        br.fours,
        br.sixes,
        br.batting_innings,
        br.batting_dismissals,
        br.fifties,
        br.hundreds,
        br.highest_score,
        br.highest_score_not_out,
        bo.runs_conceded,
        bo.wides,
        bo.no_balls,
        bo.legal_balls,
        bo.wickets,
        bo.bowling_innings,
        bo.four_wicket_hauls,
        bo.five_wicket_hauls,
        bo.best_bowling_wickets,
        bo.best_bowling_runs,
        bo.balls_per_over,
        fi.catches,
        fi.stumpings,
        fi.run_out_involvements
      ORDER BY
        ar.competition_grouped DESC,
        ar.season_grouped DESC,
        ar.competition_id ASC NULLS LAST,
        ar.season ASC
