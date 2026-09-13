import { executeQuery, getDatabasePool, type QueryExecutor } from '../../database';
import { standardInningsPredicate } from '../statistics/super-over-scope';

export interface ParticipantRecord {
  participantId: string;
  displayName: string;
}

export interface ParticipantListOptions {
  limit: number;
  fixtureId?: string;
  competitorId?: string;
  name?: string;
  after?: {
    displayName: string;
    participantId: string;
  };
}

export interface ParticipantPage {
  records: ParticipantRecord[];
  hasMore: boolean;
}

export async function listParticipants(
  options: ParticipantListOptions,
  executor: QueryExecutor = getDatabasePool(),
): Promise<ParticipantPage> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (options.name) {
    values.push(`%${options.name}%`);
    conditions.push(`p.display_name ILIKE $${values.length}`);
  }

  if (options.fixtureId || options.competitorId) {
    const squadConditions = ['fs.person_id = p.person_id'];

    if (options.fixtureId) {
      values.push(options.fixtureId);
      squadConditions.push(`fs.fixture_id = $${values.length}::bigint`);
    }

    if (options.competitorId) {
      values.push(options.competitorId);
      squadConditions.push(`fs.team_id = $${values.length}::bigint`);
    }

    conditions.push(`
      EXISTS (
        SELECT 1
        FROM fixture_squad fs
        WHERE ${squadConditions.join(' AND ')}
      )
    `);
  }

  if (options.after) {
    values.push(options.after.displayName);
    const nameParameter = values.length;

    values.push(options.after.participantId);
    const idParameter = values.length;

    conditions.push(
      `(p.display_name, p.person_id) > ($${nameParameter}::text, $${idParameter}::bigint)`,
    );
  }

  values.push(options.limit + 1);
  const limitParameter = values.length;

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await executeQuery<ParticipantRecord>(
    executor,
    `
      SELECT
        p.person_id::text AS "participantId",
        p.display_name AS "displayName"
      FROM person p
      ${where}
      ORDER BY p.display_name ASC, p.person_id ASC
      LIMIT $${limitParameter}
    `,
    values,
  );

  return {
    records: result.rows.slice(0, options.limit),
    hasMore: result.rows.length > options.limit,
  };
}

export async function findParticipantById(
  participantId: string,
  executor: QueryExecutor = getDatabasePool(),
): Promise<ParticipantRecord | null> {
  const result = await executeQuery<ParticipantRecord>(
    executor,
    `
      SELECT
        person_id::text AS "participantId",
        display_name AS "displayName"
      FROM person
      WHERE person_id = $1::bigint
    `,
    [participantId],
  );

  return result.rows[0] ?? null;
}

export interface ParticipantFixtureRecord {
  fixtureId: string;
  competitionId: string | null;
  competitionName: string | null;
  ballsPerOver: number;
  scheduledOvers: number | null;
  season: string;
  matchType: string;
  teamType: string;
  gender: string;
  startDate: string;
  endDate: string;
  teamId: string;
  teamName: string;
  role: string | null;
  missingFields: string[];
  standardInningsCount: number;
  acceptedEventCount: number;
  emptyStandardInningsIds: string[];
  runsScored: number | null;
  ballsFaced: number | null;
  fours: number | null;
  sixes: number | null;
  runsConceded: number | null;
  wides: number | null;
  noBalls: number | null;
  legalBallsBowled: number | null;
  wicketsTaken: number | null;
}

export interface ParticipantFixtureListOptions {
  participantId: string;
  limit: number;
  after?: {
    startDate: string;
    fixtureId: string;
  };
}

export interface ParticipantFixturePage {
  records: ParticipantFixtureRecord[];
  hasMore: boolean;
}

/**
 * The fixtures a participant was selected for, newest first, with their batting
 * and bowling figures for each.
 *
 * Participation is squad selection rather than appearance in a delivery, which
 * is the meaning already used elsewhere in this repository and the one a cricket
 * record reflects: a player selected but not called upon still played in the
 * fixture.
 *
 * The figures are aggregated here rather than derived per fixture through the
 * statistics module, because deriving fifty fixtures for one page would cost
 * fifty round trips. The aggregation rules are those the statistics module
 * applies, and a test asserts the two agree:
 *
 *   - only deliveries from accepted submissions are counted;
 *   - a revised delivery is resolved to its latest revision;
 *   - super-over innings are excluded;
 *   - a wide is not a ball faced, but a no-ball is;
 *   - a wide and a no-ball are not legal balls bowled;
 *   - byes and leg byes are not conceded by the bowler;
 *   - only dismissal kinds crediting the bowler count as wickets.
 *
 * A fixture the participant was selected for but did not bat or bowl in returns
 * null figures rather than being omitted.
 *
 * Nothing may re-read `accepted_delivery`. It is referenced more than once, so
 * PostgreSQL materialises it into a tuplestore, and a tuplestore carries no
 * index: a correlated subquery against it scans the whole set once per row.
 * Issue #410 measured the fixture-level completeness fields costing 845.5 ms of
 * an 889.5 ms plan that way — 51 scans for the event count and 102 for the
 * empty-innings test, about 1.24 million tuple scans to produce 51 integers and
 * 51 arrays. Both are now one grouped pass over the same set, which is why
 * `innings_event_count` exists rather than the two subqueries it replaces. The
 * plan captures are in `evidence/validation/issue-410-*`.
 *
 * `innings_event_count` reads `accepted_delivery`, which `standardInningsPredicate`
 * has already restricted to standard innings, so it inherits the super-over
 * boundary rather than restating it. It carries no `innings` alias of its own and
 * must not acquire one: a second spelling of the exclusion is what
 * `super-over-scope.ts` exists to prevent.
 */
export async function listParticipantFixtures(
  options: ParticipantFixtureListOptions,
  executor: QueryExecutor = getDatabasePool(),
): Promise<ParticipantFixturePage> {
  const values: unknown[] = [options.participantId];
  const conditions: string[] = ['fs.person_id = $1::bigint'];

  if (options.after) {
    values.push(options.after.startDate);
    const dateParameter = values.length;
    values.push(options.after.fixtureId);
    const idParameter = values.length;
    conditions.push(
      `(f.start_date, f.fixture_id) < ($${dateParameter}::date, $${idParameter}::bigint)`,
    );
  }

  values.push(options.limit + 1);
  const limitParameter = values.length;

  const result = await executeQuery<ParticipantFixtureRecord>(
    executor,
    `
      WITH selected_fixture AS (
        SELECT
          f.fixture_id,
          f.competition_id,
          f.balls_per_over,
          f.scheduled_overs,
          f.missing_fields,
          f.season,
          f.match_type,
          f.team_type,
          f.gender,
          f.start_date,
          f.end_date,
          fs.team_id,
          fs.role
        FROM fixture_squad fs
        INNER JOIN fixture f
          ON f.fixture_id = fs.fixture_id
        INNER JOIN submission publication
          ON publication.submission_id = f.first_seen_in
         AND publication.status = 'accepted'
        WHERE ${conditions.join(' AND ')}
        ORDER BY f.start_date DESC, f.fixture_id DESC
        LIMIT $${limitParameter}
      ),
      accepted_delivery AS (
        SELECT d.*,
          i.fixture_id
        FROM delivery_current d
        JOIN innings i
          ON i.innings_id = d.innings_id
         AND ${standardInningsPredicate('i')}
        JOIN submission source_submission
          ON source_submission.submission_id = d.submission_id
         AND source_submission.status = 'accepted'
        WHERE i.fixture_id IN (SELECT fixture_id FROM selected_fixture)
      ),
      batting AS (
        SELECT
          d.fixture_id,
          SUM(d.runs_off_bat)::int AS runs_scored,
          COUNT(*) FILTER (WHERE d.extra_wides IS NULL)::int AS balls_faced,
          COUNT(*) FILTER (WHERE d.runs_off_bat = 4 AND NOT d.non_boundary)::int AS fours,
          COUNT(*) FILTER (WHERE d.runs_off_bat = 6 AND NOT d.non_boundary)::int AS sixes
        FROM accepted_delivery d
        WHERE d.striker_id = $1::bigint
        GROUP BY d.fixture_id
      ),
      bowling AS (
        SELECT
          d.fixture_id,
          SUM(
            d.runs_off_bat
            + COALESCE(d.extra_wides, 0)
            + COALESCE(d.extra_noballs, 0)
          )::int AS runs_conceded,
          COALESCE(SUM(d.extra_wides), 0)::int AS wides,
          COALESCE(SUM(d.extra_noballs), 0)::int AS no_balls,
          COUNT(*) FILTER (
            WHERE d.extra_wides IS NULL AND d.extra_noballs IS NULL
          )::int AS legal_balls_bowled,
          COALESCE(SUM((
            SELECT COUNT(*)
            FROM delivery_wicket dw
            JOIN dismissal_kind dk ON dk.code = dw.kind
            WHERE dw.delivery_id = d.delivery_id
              AND dk.credits_bowler = true
          )), 0)::int AS wickets_taken
        FROM accepted_delivery d
        WHERE d.bowler_id = $1::bigint
        GROUP BY d.fixture_id
      ),
      innings_event_count AS (
        SELECT
          d.innings_id,
          COUNT(*)::int AS accepted_event_count
        FROM accepted_delivery d
        GROUP BY d.innings_id
      ),
      fixture_state AS (
        SELECT
          sf.fixture_id,
          COUNT(i.innings_id)::int AS standard_innings_count,
          COALESCE(SUM(iec.accepted_event_count), 0)::int AS accepted_event_count,
          COALESCE(
            ARRAY_AGG(i.innings_id::text ORDER BY i.ordinal) FILTER (
              WHERE i.innings_id IS NOT NULL
                AND iec.innings_id IS NULL
            ),
            ARRAY[]::text[]
          ) AS empty_standard_innings_ids
        FROM selected_fixture sf
        LEFT JOIN innings i
          ON i.fixture_id = sf.fixture_id
         AND ${standardInningsPredicate('i')}
        LEFT JOIN innings_event_count iec
          ON iec.innings_id = i.innings_id
        GROUP BY sf.fixture_id
      )
      SELECT
        sf.fixture_id::text AS "fixtureId",
        sf.competition_id::text AS "competitionId",
        c.name AS "competitionName",
        sf.balls_per_over AS "ballsPerOver",
        sf.scheduled_overs AS "scheduledOvers",
        sf.season AS "season",
        sf.match_type AS "matchType",
        sf.team_type AS "teamType",
        sf.gender AS "gender",
        to_char(sf.start_date, 'YYYY-MM-DD') AS "startDate",
        to_char(sf.end_date, 'YYYY-MM-DD') AS "endDate",
        sf.team_id::text AS "teamId",
        t.name AS "teamName",
        sf.role AS "role",
        sf.missing_fields AS "missingFields",
        state.standard_innings_count AS "standardInningsCount",
        state.accepted_event_count AS "acceptedEventCount",
        state.empty_standard_innings_ids AS "emptyStandardInningsIds",
        b.runs_scored AS "runsScored",
        b.balls_faced AS "ballsFaced",
        b.fours AS "fours",
        b.sixes AS "sixes",
        w.runs_conceded AS "runsConceded",
        w.wides AS wides,
        w.no_balls AS "noBalls",
        w.legal_balls_bowled AS "legalBallsBowled",
        w.wickets_taken AS "wicketsTaken"
      FROM selected_fixture sf
      INNER JOIN team t
        ON t.team_id = sf.team_id
      LEFT JOIN competition c
        ON c.competition_id = sf.competition_id
      LEFT JOIN batting b
        ON b.fixture_id = sf.fixture_id
      LEFT JOIN bowling w
        ON w.fixture_id = sf.fixture_id
      INNER JOIN fixture_state state
        ON state.fixture_id = sf.fixture_id
      ORDER BY sf.start_date DESC, sf.fixture_id DESC
    `,
    values,
  );

  return {
    records: result.rows.slice(0, options.limit),
    hasMore: result.rows.length > options.limit,
  };
}

export interface FixtureCompetitorRecord {
  fixtureId: string;
  competitorId: string;
  name: string;
  ordinal: number;
}

/**
 * The competitors contesting each of the given fixtures.
 *
 * Fetched for a whole page in one statement rather than per fixture, because at
 * roughly 173 ms per round trip a query per fixture would dominate the response.
 */
export async function listCompetitorsForFixtures(
  fixtureIds: string[],
  executor: QueryExecutor = getDatabasePool(),
): Promise<FixtureCompetitorRecord[]> {
  if (fixtureIds.length === 0) {
    return [];
  }

  const result = await executeQuery<FixtureCompetitorRecord>(
    executor,
    `
      SELECT
        ft.fixture_id::text AS "fixtureId",
        t.team_id::text AS "competitorId",
        t.name AS "name",
        ft.ordinal AS "ordinal"
      FROM fixture_team ft
      INNER JOIN team t
        ON t.team_id = ft.team_id
      WHERE ft.fixture_id = ANY($1::bigint[])
      ORDER BY ft.fixture_id ASC, ft.ordinal ASC
    `,
    [fixtureIds],
  );

  return result.rows;
}
