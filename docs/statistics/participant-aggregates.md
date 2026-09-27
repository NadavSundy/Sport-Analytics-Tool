# Participant aggregate calculations

Season, competition-wide and career aggregates are deterministic projections of accepted cricket
events. As with fixture statistics there is no manually editable total; the difference is only the
set of fixtures a projection spans. Since issue #592 the derived rows are stored per participant and
served while current, and derived live otherwise (see
[Stored aggregates and consistency](#stored-aggregates-and-consistency) and ADR-015). Stored rows are
disposable: delivery rows remain the source of truth.

When a correction changes a delivery, refresh dependencies include every previous and resulting
participant relationship consumed here: striker, non-striker, bowler, dismissed player, and every
identified fielder. Direct and batch corrections derive this set with the same shared functions.
Each participant receives at most one refresh target at each applicable season, competition, and
career level. The correction response and the durable `statistics_refresh_dependency` journal make
these affected scopes observable; unrelated participants and competition/season groups have no
dependency record. The journal is correction evidence and is not read by the stored aggregates,
which use the data versions below.

## Participant statistics data versions

`participant_statistics_version` holds one `data_version` per participant: the input version of
that participant's season, competition and career aggregates (issue #592). A write that can change a participant's aggregates advances their version in the same transaction as
the write, with an upsert that increments the existing value. Fixture versions are advanced first
and participant versions second, each in identifier order, so concurrent writers acquire those row
locks in one consistent order.

The affected participants come from one shared function, `affectedParticipantIds` in
`@sport-analytics/batch-processing`:

| Write path              | Affected participants                                                                                                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Direct submission       | Everyone each submitted event names as striker, non-striker, bowler, dismissed player or identified fielder.                                                                                         |
| Direct correction       | The same roles in the previous and the replacement state of the corrected event.                                                                                                                     |
| Batch publication chunk | The same roles in every newly published event and in the previous and replacement state of every batch correction; one bump per chunk.                                                               |
| Cricsheet match ingest  | Everyone the ingest actually adds to the fixture squad, whose appearances change, and the same roles in every delivery it actually inserts. A re-ingest that inserts nothing affects no participant. |

The set is conservative. A named participant is included even when they are not in that fixture's
squad and so contribute no figures, because a missing participant would leave a stale aggregate
while an extra one only costs a recomputation. For submissions, corrections and batch publication,
squad members of the same fixture whom no event names are not affected: an added or corrected
delivery does not change their appearances or figures. Ingest is the only write path that adds squad
members.

## Stored aggregates and consistency

The grouped rows the derivation query returns are stored in two tables:

- `participant_aggregate_snapshot_state`, one row per participant, records the data version and
  definition version the participant's stored rows were built from, a refresh count, and failed
  refresh attempts. This row vouches for the participant's complete set of scope rows.
- `participant_aggregate_snapshot`, one row per participant, level, competition and season, holds
  one grouped row as jsonb with the versions and refresh count of its last content write.

A single table of scope rows was rejected: serving would require every row to carry the current
version, which forces an affected participant's unchanged rows to be rewritten, and it cannot record
a participant whose rows were built but empty.

### Reads

A read serves stored rows only when the participant has a `participant_statistics_version` row and
the state row was built from that version under the running definition version. A participant with
no version row is never served from, or written to, stored rows. The definition version is the
SHA-256 of a fixed prefix and the aggregate SQL text, including the shared classification fragments
and the super-over predicate, so any change to the calculation invalidates every stored row without
a manual bump.

On a read miss the response is derived live, exactly as without stored rows, and the stored rows are
refreshed synchronously in the same request from the rows just derived. The data version is read
before the derivation, so rows that include a later write are stored against the earlier version and
are never served. The refresh never waits for a lock: it takes a transaction-scoped advisory lease
with `pg_try_advisory_xact_lock`, reads the version row `FOR SHARE NOWAIT` and the state row
`FOR UPDATE NOWAIT`, and sets `lock_timeout` to 1 ms for every other lock. If the lease or a lock is
held, or the write fails, the live response is returned unchanged and the next read tries again.
There is no worker or poller: refresh happens only on a read miss.

The consistency guarantee is therefore the same as live derivation. A response reflects every write
committed before its snapshot read, whether it is served from stored rows or derived live.

### Refresh

**Selective** means: a change recomputes each affected participant's query once and rewrites only
the affected scope rows; unaffected participants are not recomputed and their rows stay
byte-identical. Within one participant the whole query runs once; recomputation is never
per scope.

A refresh re-runs the unchanged derivation query for a participant whose rows are not current and
never for one whose rows are. It then writes, in one transaction: the state row, with its refresh
count advanced; new scope rows; scope rows whose figures changed, each with its own refresh count
advanced; and the removal of scope rows that no longer exist. A scope row whose figures did not
change keeps its bytes, versions and refresh count. A refresh that fails rolls back entirely, records
an attempt count and last error on the state row, and is retried by the next read.

### Untracked writes

Stored rows stay correct only while every write to an aggregate input advances the affected
participants' versions. Submissions, corrections, batch publication and ingest do. Any other write
to an input (a data-rewriting migration, a seed that bypasses ingest, or a manual repair of
deliveries, wickets, fielders, squads, innings, fixtures, submissions, dismissal kinds or competition
names) must invalidate stored rows in the same transaction:

```sql
SELECT invalidate_participant_aggregate_snapshots();
```

or, from TypeScript, `invalidateParticipantAggregateSnapshots(executor)`. The function deletes every
stored snapshot, and reads derive live and rebuild them. Existing data-rewriting migrations ran before
the snapshot tables existed and need no action; the committed seeds use ingest.

### Known limitations

These need a team decision and are outside issue #592:

- Participant reads can take minutes after importing or restoring into an empty or much smaller
  database, until the tables are analysed: without planner statistics the aggregate statement chooses
  nested loops. `evidence/validation/issue-592-first-read-plans/` records the plans; `ANALYZE`
  removed the slow plan.
- No `statement_timeout` is configured, so a slow request holds a backend pool connection until it
  finishes.

The statistic catalogue in `docs/requirements/sport-domain-definition.md` §7 names the base figures
and the two aggregate levels these endpoints publish. Competition-wide is required by issue #285 but
is **not** named as a level in §7; it is implemented here as the same rollup grouped by competition
alone, and §7 needs extending to record it.

## Levels

| Level       | Grouped by                       | `scope`       | `statisticCode`           |
| ----------- | -------------------------------- | ------------- | ------------------------- |
| Season      | Participant, competition, season | `season`      | `participant_season`      |
| Competition | Participant, competition         | `competition` | `participant_competition` |
| Career      | Participant                      | `career`      | `participant_career`      |

All three are returned together by default. `?scope=` restricts the response to one level.

Grouping is by participant identifier, never by display name. §10 of the domain definition records
that names are not identity: 166 names in the corpus belong to more than one person, so a rollup
keyed on the name would merge separate careers. A season is a `(competition, label)` pair rather
than a table of its own, so `seasonId` carries the same opaque encoding the season endpoints use and
is null where the fixture has no competition.

## Publication input

The derivation applies the same delivery-classification rules as the fixture statistics module,
then adds authoritative squad, innings, dismissal and fielding context:

1. The fixture's originating submission and each delivery's submission must have `status = accepted`.
2. Only the accepted, live delivery revision is counted for each natural key
   `(innings, over_number, position_in_over)`.
3. Standard aggregates exclude innings marked `is_super_over`, at every level.

## Super-over exclusion

Every standard statistic in the platform consumes one boundary, defined in
`apps/backend/src/modules/statistics/super-over-scope.ts` and reported to clients as
`scope.superOversIncluded: false`. The fixture, innings, participant-fixture and aggregate
derivations all take the predicate from that module rather than spelling it out, because §12 of the
domain definition records that client confirmation of the convention is still pending under issue
#104 and the decision may be revisited.

Fixture `423788` is the reference case. Brendon McCullum's published score of 116 from 56 balls is
his career figure in the seeded reference set; the one-over eliminator would otherwise add 2 runs
from 1 ball, and `apps/backend/tests/database/participant-aggregates.database.test.ts` asserts that
it does not.

## Calculations

| Result                    | Calculation                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| Appearances               | Distinct accepted fixtures whose authoritative squad selects the participant                     |
| Activity fixture count    | Distinct fixtures where the participant is striker or bowler                                     |
| Batting innings           | Standard innings naming the participant as striker, non-striker, or dismissed player             |
| Runs / balls / boundaries | Existing delivery rules: wides are not faced; no-balls are; `non_boundary` excludes a boundary   |
| Dismissals / not-outs     | All kinds except `retired hurt` and `retired not out`; not-outs = innings - dismissals           |
| Batting average           | Runs / dismissals over the complete group; null with no dismissal                                |
| Strike rate               | Runs / balls faced × 100 over the complete group; null with no ball faced                        |
| Highest score             | Maximum innings score; tied not-out beats out, then earliest innings identifier                  |
| Fifties / hundreds        | Per-innings scores from 50–99 / at least 100                                                     |
| Bowling innings           | Standard innings containing a delivery bowled by the participant                                 |
| Bowling average / SR      | Runs / credited wickets and legal balls / credited wickets; null with no credited wicket         |
| Overs / economy           | Counted legal balls with the one valid scope divisor; rates are recomputed from aggregate totals |
| Best bowling              | Most wickets, then fewest runs, then earliest innings identifier                                 |
| Four/five-wicket hauls    | Innings with exactly four wickets / at least five wickets                                        |
| Catches / stumpings       | Matching identified fielder rows; caught-and-bowled is attributed to the bowler                  |
| Run-out involvements      | One per identified participant per wicket; every contributor to a multi-fielder run-out counts   |

All rates are recomputed from aggregate numerators and denominators, never averaged from fixture
rates. A zero denominator produces `null`, not a misleading zero.

`appearances` is the true selected-match count from `fixture_squad`. `fixtureCount` remains the
narrower striker/bowler activity count. A selected reserve can therefore have `appearances: 1`,
`fixtureCount: 0`, and null batting and bowling records.

### Balls per over is never assumed

Legal balls are counted from delivery rows. §10 records 175 innings carrying `miscounted_overs`,
with overs of five and seven legal balls, so no count is derived from an over number.

Overs bowled and economy rate additionally need a balls-per-over divisor, which is a fixture-level
fact. Where a group spans fixtures that do not agree on it there is no single correct divisor:
`ballsPerOver`, `oversBowled` and `economyRate` are all `null` and a `MIXED_BALLS_PER_OVER` warning
names the group. Runs conceded, legal balls bowled and wickets taken remain published, because they
do not depend on the divisor.

## Leaderboards

`GET /api/v1/statistics/leaderboards` ranks the same accepted-current, standard-innings event data
for one explicit season or competition. It supports `most_runs`, `most_wickets`, `most_fours`,
`most_sixes`, `highest_batting_average`, `highest_strike_rate`, `best_bowling_average`,
`best_economy_rate` and `best_bowling_strike_rate`. Season scope uses the opaque `seasonId`, which
encodes its competition and label; competition scope uses `competitionId`.

Totals are ordered from highest to lowest. Batting average and strike rate are also highest first;
bowling average, economy and bowling strike rate are lowest first. Equal exact aggregate values are
ordered by participant display name using PostgreSQL's deterministic `C` collation, then numeric
participant identifier. `rank` is therefore the stable top-N position after all tie-breakers, not a
shared competition rank.

### Rate qualification

Rate tables deliberately exclude samples too small to support a meaningful comparison. The server
applies these fixed initial qualifications before ranking and returns the selected rule and rationale
as `qualification` metadata. Total leaderboards return `qualification: null`.

| Metric                   | Minimum qualification | Rationale                               |
| ------------------------ | --------------------- | --------------------------------------- |
| Highest batting average  | 5 dismissals          | Excludes one short not-out sample       |
| Highest strike rate      | 100 balls faced       | Excludes short cameo innings            |
| Best bowling average     | 5 credited wickets    | Excludes one-off wicket samples         |
| Best economy rate        | 60 legal balls        | Avoids assuming one balls-per-over rule |
| Best bowling strike rate | 5 credited wickets    | Excludes one-off wicket samples         |

Economy additionally requires one authoritative balls-per-over value across the requested scope;
participants spanning mixed divisors are not ranked because the platform does not assume six.
Credited wickets, legal balls, boundaries and rate arithmetic reuse the participant aggregate rules
above. Accepted corrections are visible immediately because ranking reads `delivery_current`.

The query aggregates and ranks every eligible participant in one PostgreSQL statement and applies
the requested limit there. The maximum limit is 50. It does not call the participant aggregate
endpoint or issue one query per player. Database coverage exercises six published reference
fixtures (roughly 1,500 standard deliveries), asserts one statement regardless of participant count,
and verifies scope isolation, qualifications, tie-breaking and a corrected current revision.

### Example total leaderboard

```json
{
  "data": {
    "scope": "competition",
    "competitionId": "10",
    "competitionName": "Example League",
    "metric": "most_runs",
    "limit": 2,
    "qualification": null,
    "tieBreakers": ["metricValue", "participantName", "participantId"],
    "entries": [
      { "rank": 1, "participantId": "7", "participantName": "A Batter", "value": 612 },
      { "rank": 2, "participantId": "8", "participantName": "B Batter", "value": 588 }
    ]
  }
}
```

### Example qualified-rate leaderboard

```json
{
  "data": {
    "scope": "season",
    "seasonId": "season_opaque",
    "season": "2026/27",
    "competitionId": "10",
    "competitionName": "Example League",
    "metric": "highest_strike_rate",
    "limit": 1,
    "qualification": {
      "field": "ballsFaced",
      "minimum": 100,
      "rationale": "A minimum of 100 balls faced excludes short cameo innings."
    },
    "tieBreakers": ["metricValue", "participantName", "participantId"],
    "entries": [{ "rank": 1, "participantId": "7", "participantName": "A Batter", "value": 148.72 }]
  }
}
```

### Public frontend

Competition and season detail pages show the server-ranked top five run scorers and wicket takers
for their exact scope. Each table is requested independently from the bounded leaderboard endpoint,
so an unavailable or empty batting ranking does not hide a valid bowling ranking, and vice versa.
The interface links each entry to the participant record and states that rankings use accepted
standard-innings events, exclude super overs and are not reconstructed in the browser.

## Performance

Issue #105 measured the fixture statistics endpoints at roughly 2,400 ms, from about thirteen
sequential queries over a 173 ms link, for a single fixture. A career spans every fixture a player
appeared in, so a per-fixture approach was not an option.

The derivation issues **two statements** for any participant — one participant lookup and one
grouped derivation — regardless of how many fixtures they have played. All three levels use
set-based `GROUP BY GROUPING SETS` rollups. Partial indexes cover striker, non-striker and bowler
relationships; dismissed-player and identified-fielder lookups have person indexes. There is no
fixture loop or per-statistic query.

Measured against the imported corpus (3,207,110 deliveries, 14,011 fixtures, 173 ms median link
round trip):

| Participant     | Squad fixtures | Response |
| --------------- | -------------- | -------- |
| Imran ullah Gul | 1              | 372 ms   |
| A Shukla        | 59             | 402 ms   |
| V Kohli         | 389            | 537 ms   |
| KA Pollard      | 629            | 786 ms   |

Roughly 346 ms of each figure is the two round trips over the link. What grows is the volume of
deliveries scanned, not the number of round trips, so the shape is flat in the number of fixtures.

`apps/backend/tests/database/participant-aggregates.database.test.ts` asserts the statement count
rather than an elapsed time, because the count is stable across machines and is what a per-fixture
implementation would break.

Stored aggregates (issue #592) change the cost of a read, not the derivation. A read served from
current stored rows is one statement; a read miss is the snapshot read, the two derivation statements
and the synchronous refresh transaction. `npm run measure:aggregate-snapshots --workspace=@sport-analytics/backend`
measures both, and batch publication throughput, on the generated 300-fixture corpus; the results are
in `evidence/validation/issue-592-aggregate-snapshot-performance.md`. The first participant read is not timed. It builds the stored rows that row (a) then serves, so it is setup for (a) rather than a sample of it; timing it would put one read miss into the served sample. Read misses are measured on their own in rows (b1) and (b2), each after the stored rows have been made stale.

## Statistic resources and traceability

Each projection has a stable opaque `statisticId`, a deterministic hash of the participant and the
scope that names it, so replaying the same events preserves every resource reference. A single
projection is addressable at `/api/v1/participants/{participantId}/statistics/{statisticId}`.

Unlike fixture statistics, aggregates do not offer a contributing-event expansion. A career spans
thousands of deliveries, and the per-delivery trace belongs to the fixture endpoints, which remain
the place to reproduce a figure event by event. `sourceEventCount`, `fixtureCount`, and `appearances`
report the event, activity-fixture, and selected-fixture sizes represented by each resource.

## Representative career response

```json
{
  "scope": "career",
  "appearances": 62,
  "fixtureCount": 58,
  "batting": {
    "innings": 54,
    "runsScored": 1234,
    "dismissals": 49,
    "notOuts": 5,
    "battingAverage": 25.18,
    "highestScore": 112,
    "highestScoreNotOut": true,
    "fifties": 7,
    "hundreds": 2
  },
  "bowling": {
    "innings": 31,
    "wicketsTaken": 41,
    "bowlingAverage": 20.54,
    "bowlingStrikeRate": 16.83,
    "bestBowling": { "wicketsTaken": 5, "runsConceded": 22 },
    "fourWicketHauls": 2,
    "fiveWicketHauls": 1
  },
  "fielding": { "catches": 18, "stumpings": 2, "runOutInvolvements": 4 }
}
```

Season and competition resources use the same record objects with their existing scope identity.

## Incomplete data

An accepted but incomplete record returns HTTP `200` with `status: partial`. Warning codes cover:

- a participant with neither accepted squad appearances nor accepted standard delivery events;
- fixtures published without a competition; and
- a group whose fixtures do not share one balls-per-over divisor.

A selected participant with no delivery activity still returns appearance resources. A participant
with neither squad selection nor accepted events returns no statistics rather than an all-zero
career. An unknown participant returns `404`.

## AI Declaration

The preceding calculation, performance and API documentation was generated with the assistance of
Claude Code[Claude Opus 5]. The corpus measurements were taken against the imported corpus and are
reproduced in the issue #285 validation record. The selective correction-refresh dependency model
was documented with the assistance of Codex[GPT-5]. The record of figures not derived, under issue
#476, was documented with the assistance of Claude Code[Claude Opus 5]. The issue #623 wide-run rule
was documented with the assistance of Claude-Code[Claude Opus 5].
The issue #632 appearance, batting, bowling and fielding aggregate rules and example were updated
with the assistance of Codex[GPT-5].
The issue #635 leaderboard API, qualification rules and performance documentation were implemented
with the assistance of Codex[GPT-5].
The issue #582 public season and competition leaderboard presentation was documented with the
assistance of Codex[GPT-5].
The issue #592 correction dependency participant set was corrected, and participant statistics data
versions and stored aggregates documented, with the assistance of Claude-Code[Claude Opus 5].
