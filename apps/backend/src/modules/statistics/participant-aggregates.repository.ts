import {
  bowlerChargedExtrasSql,
  countsAsBallFacedSql,
  isLegalDeliverySql,
} from '@sport-analytics/contracts';

import { executeQuery, getDatabasePool, type QueryExecutor } from '../../database';
import type {
  ParticipantAggregateRow,
  ParticipantAggregatesSource,
} from './participant-aggregates.model';
import { standardInningsPredicate } from './super-over-scope';

interface ParticipantRow {
  participantId: string;
  participantName: string;
}

/**
 * Every level of a participant's figures, in one grouped statement.
 *
 * Issue #105 measured the fixture statistics endpoints at roughly 2,400 ms from
 * about thirteen sequential queries over a 173 ms link, for a single fixture. A
 * career spans every fixture a player has appeared in, so anything per-fixture
 * would be far worse. This statement is therefore set-based and its cost does
 * not grow with the number of round trips:
 *
 *   - the participant's deliveries are found by two index scans on the partial
 *     indexes `delivery_striker_idx` and `delivery_bowler_idx`, which already
 *     carry the live-revision predicate, rather than by scanning the corpus;
 *   - the season, competition-wide and career levels come from one pass over
 *     that set using GROUPING SETS, not one query per level; and
 *   - the caller issues exactly two statements — this one and the participant
 *     lookup — however many fixtures the participant has played.
 *
 * The derivation rules are the ones the fixture statistics module applies, so
 * that a career figure equals the sum of the published fixture figures:
 *
 *   - the fixture's own submission and each delivery's submission must be
 *     accepted;
 *   - a revised delivery resolves to its live revision;
 *   - super-over innings are excluded, through `standardInningsPredicate`;
 *   - a wide is not a ball faced, but a no-ball is;
 *   - neither a wide nor a no-ball is a legal ball bowled;
 *   - byes and leg byes are not conceded by the bowler;
 *   - a boundary excludes deliveries flagged `non_boundary`; and
 *   - only dismissal kinds crediting the bowler count as wickets, so a run out
 *     is not the bowler's.
 *
 * Grouping is by `person_id`. Display names are not identity: §10 of the domain
 * definition records that 166 names in the corpus belong to more than one
 * person.
 */
export async function loadParticipantAggregatesSource(
  participantId: string,
  executor: QueryExecutor = getDatabasePool(),
): Promise<ParticipantAggregatesSource | null> {
  const [participantResult, aggregateResult] = await Promise.all([
    executeQuery<ParticipantRow>(
      executor,
      `
      SELECT
        person_id::text AS "participantId",
        display_name AS "participantName"
      FROM person
      WHERE person_id = $1::bigint
    `,
      [participantId],
    ),
    executeQuery<ParticipantAggregateRow>(
      executor,
      `
      WITH matched_delivery AS (
        -- Two index scans rather than one OR, so the plan cannot fall back to a
        -- sequential scan of the corpus as it grows.
        SELECT delivery_id FROM delivery_current WHERE striker_id = $1::bigint
        UNION
        SELECT delivery_id FROM delivery_current WHERE bowler_id = $1::bigint
      ),
      participant_delivery AS (
        SELECT DISTINCT ON (d.innings_id, d.over_number, d.position_in_over)
          i.fixture_id,
          f.competition_id,
          f.season,
          f.balls_per_over,
          d.striker_id = $1::bigint AS is_striker,
          d.bowler_id = $1::bigint AS is_bowler,
          d.runs_off_bat,
          d.non_boundary,
          d.extra_wides,
          d.extra_noballs,
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
         AND ${standardInningsPredicate('i')}
        JOIN fixture f
          ON f.fixture_id = i.fixture_id
        JOIN submission publication
          ON publication.submission_id = f.first_seen_in
         AND publication.status = 'accepted'
        ORDER BY
          d.innings_id ASC,
          d.over_number ASC,
          d.position_in_over ASC,
          d.revision DESC,
          d.delivery_id DESC
      )
      SELECT
        GROUPING(pd.competition_id) = 0 AS "competitionGrouped",
        GROUPING(pd.season) = 0 AS "seasonGrouped",
        pd.competition_id::text AS "competitionId",
        -- Constant within any group that groups by competition, and discarded
        -- by the caller for the groups that do not.
        MIN(c.name) AS "competitionName",
        pd.season AS "season",
        COUNT(DISTINCT pd.fixture_id)::int AS "fixtureCount",
        COUNT(*)::int AS "sourceEventCount",
        COUNT(*) FILTER (WHERE pd.is_striker)::int AS "battingDeliveryCount",
        COALESCE(SUM(pd.runs_off_bat) FILTER (WHERE pd.is_striker), 0)::int AS "runsScored",
        COUNT(*) FILTER (
          WHERE pd.is_striker AND ${countsAsBallFacedSql('pd')}
        )::int AS "ballsFaced",
        COUNT(*) FILTER (
          WHERE pd.is_striker AND pd.runs_off_bat = 4 AND NOT pd.non_boundary
        )::int AS "fours",
        COUNT(*) FILTER (
          WHERE pd.is_striker AND pd.runs_off_bat = 6 AND NOT pd.non_boundary
        )::int AS "sixes",
        COUNT(*) FILTER (WHERE pd.is_bowler)::int AS "bowlingDeliveryCount",
        COALESCE(
          SUM(
            pd.runs_off_bat + ${bowlerChargedExtrasSql('pd')}
          ) FILTER (WHERE pd.is_bowler),
          0
        )::int AS "runsConceded",
        COALESCE(SUM(pd.extra_wides) FILTER (WHERE pd.is_bowler), 0)::int AS wides,
        COALESCE(SUM(pd.extra_noballs) FILTER (WHERE pd.is_bowler), 0)::int AS "noBalls",
        COUNT(*) FILTER (
          WHERE pd.is_bowler AND ${isLegalDeliverySql('pd')}
        )::int AS "legalBallsBowled",
        COALESCE(SUM(pd.credited_wickets) FILTER (WHERE pd.is_bowler), 0)::int AS "wicketsTaken",
        CASE
          WHEN COUNT(DISTINCT pd.balls_per_over) = 1 THEN MIN(pd.balls_per_over)::int
          ELSE NULL
        END AS "ballsPerOver"
      FROM participant_delivery pd
      LEFT JOIN competition c
        ON c.competition_id = pd.competition_id
      GROUP BY GROUPING SETS (
        (pd.competition_id, pd.season),
        (pd.competition_id),
        ()
      )
      ORDER BY
        GROUPING(pd.competition_id) ASC,
        GROUPING(pd.season) ASC,
        pd.competition_id ASC NULLS LAST,
        pd.season ASC
    `,
      [participantId],
    ),
  ]);

  const participant = participantResult.rows[0];
  if (!participant) {
    return null;
  }

  return {
    participantId: participant.participantId,
    participantName: participant.participantName,
    rows: aggregateResult.rows,
  };
}
