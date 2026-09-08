# Participant aggregate calculations

Season, competition-wide and career aggregates are deterministic projections of accepted cricket
events, calculated when requested. As with fixture statistics there is no manually editable total
and no persisted cache; the difference is only the set of fixtures a projection spans.

When a correction changes a delivery, Issue #286 records refresh dependencies only for the delivery's
previous and resulting striker and bowler. Each of those participants receives at most one refresh
target at each applicable season, competition, and career level. The correction response and the
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

The derivation applies the same rules as the fixture statistics module, so that a career figure
equals the sum of the participant's published fixture figures:

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

| Result             | Calculation                                                                       |
| ------------------ | --------------------------------------------------------------------------------- |
| Runs scored        | Sum `runs_off_bat` over deliveries in the group where the participant is striker  |
| Balls faced        | Count striker deliveries with no wide; a no-ball still counts as faced            |
| Strike rate        | Runs scored / balls faced × 100, recomputed over the group                        |
| Fours and sixes    | Count 4 or 6 `runs_off_bat`, excluding `non_boundary` deliveries                  |
| Runs conceded      | `runs_off_bat + wides + no-balls`; byes and leg-byes are excluded                 |
| Legal balls bowled | Count deliveries with neither wides nor no-balls                                  |
| Overs bowled       | `completeOvers.remainingBalls`, from the counted legal balls                      |
| Economy rate       | Runs conceded / legal balls × balls-per-over, recomputed over the group           |
| Wickets taken      | Count wickets whose `dismissal_kind.credits_bowler` is true; a run out is not one |
| Fixture count      | Distinct fixtures the participant appeared in within the group                    |

Both rates are recomputed over the whole group rather than averaged across fixtures: a career strike
rate is total runs over total balls faced, not the mean of per-innings rates.

`fixtureCount` counts fixtures the participant appeared in as striker or bowler. It is deliberately
narrower than the fixture history at `/api/v1/participants/{participantId}/fixtures`, where
participation is squad selection and a player selected but never called upon still played in the
fixture. A player with 629 squad selections may have a smaller `fixtureCount` here.

A rate is `null` when its denominator is zero, which distinguishes an undefined rate from a real
rate of zero. `batting` or `bowling` is `null` when the participant never took that role in the
group, which distinguishes a player who did not bat from one who was dismissed for nought.

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
grouped derivation — regardless of how many fixtures they have played. All three levels come from a
single pass using `GROUP BY GROUPING SETS`, and the participant's deliveries are found through the
partial indexes `delivery_striker_idx` and `delivery_bowler_idx`, which already carry the
live-revision predicate. The plan contains no sequential scan of the delivery table.

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
the place to reproduce a figure event by event. `sourceEventCount` and `fixtureCount` report the
size of the set each figure was derived from.

## Incomplete data

An accepted but incomplete record returns HTTP `200` with `status: partial`. Warning codes cover:

- a participant with no accepted standard delivery events;
- fixtures published without a competition; and
- a group whose fixtures do not share one balls-per-over divisor.

A participant with no accepted events returns no statistics rather than an all-zero career, because
zero runs from zero fixtures is an absence rather than a figure. An unknown participant returns
`404`.

## AI Declaration

The preceding calculation, performance and API documentation was generated with the assistance of
Claude Code[Claude Opus 5]. The corpus measurements were taken against the imported corpus and are
reproduced in the issue #285 validation record. The selective correction-refresh dependency model
was documented with the assistance of Codex[GPT-5].
