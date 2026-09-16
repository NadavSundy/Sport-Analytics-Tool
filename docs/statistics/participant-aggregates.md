# Participant aggregate calculations

Season, competition-wide and career aggregates are deterministic projections of accepted cricket
events, calculated when requested. As with fixture statistics there is no manually editable total
and no persisted cache; the difference is only the set of fixtures a projection spans.

When a correction changes a delivery, refresh dependencies include every previous and resulting
participant relationship consumed here: striker, non-striker, bowler, dismissed player, and every
identified fielder. Each participant receives at most one refresh target at each applicable season,
competition, and career level. The correction response and the
durable `statistics_refresh_dependency` journal make this selective boundary observable; unrelated
participants and competition/season groups have no dependency record and no recalculation target.

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
