# Event-to-statistic mapping

| Document Information | Details                                                                |
| -------------------- | ---------------------------------------------------------------------- |
| Purpose              | Deliverable of issue #49                                               |
| Contract             | `packages/contracts/src/submissions.ts`                                |
| Derivation           | `apps/backend/src/modules/statistics/fixture-statistics.derivation.ts` |
| Status               | Current                                                                |

## 1. Purpose

Section 8 of [the sport domain definition](../requirements/sport-domain-definition.md)
maps event types to the statistics they affect. This document does the narrower
job issue #49 asks for: it maps the individual fields of a submission to the
statistics computed from them, and records which fields feed nothing.

It describes the derivation as implemented, not a proposed design. Where the two
disagree, the implementation is authoritative and this document is wrong.

## 2. Batting statistics

Computed per participant per fixture.

| Statistic            | Derived from                                                         | Rule                                                                  |
| -------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Runs scored          | `runs.offBat` of every delivery where the participant is the striker | Extras are excluded: they are not the batter's runs.                  |
| Balls faced          | Deliveries where the participant is the striker                      | A wide is not a ball faced. A no-ball is.                             |
| Strike rate          | Runs scored and balls faced                                          | Runs per hundred balls faced. Undefined where no balls were faced.    |
| Innings / not-outs   | Striker, non-striker and wicket records                              | Retired hurt and retired not out do not count as dismissals.          |
| Average              | Runs scored and dismissals                                           | Recomputed over the full scope; undefined with no dismissal.          |
| Highest / 50s / 100s | Per-innings runs                                                     | Derived from every eligible innings, independently of API pagination. |

## 3. Bowling statistics

Computed per participant per fixture.

| Statistic                     | Derived from                                                  | Rule                                                                                                   |
| ----------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Runs conceded                 | `runs.offBat`, plus wides and no-balls                        | Byes and leg byes are excluded, except when run off a wide, where Law 22.6 makes them wides.           |
| Legal balls bowled            | Deliveries where the participant is the bowler                | Wides and no-balls do not count.                                                                       |
| Overs bowled                  | Legal balls bowled                                            | Formatted against the fixture's balls per over, which is not assumed to be six.                        |
| Wickets taken                 | `wickets[]` on deliveries where the participant is the bowler | Only kinds flagged `credits_bowler` in `dismissal_kind`. A run out is not the bowler's wicket.         |
| Economy rate                  | Runs conceded and legal balls bowled                          | Runs per over. Undefined where no legal balls were bowled.                                             |
| Bowling average / strike rate | Runs conceded, legal balls and credited wickets               | Undefined with no credited wicket.                                                                     |
| Best bowling / 4W / 5W        | Per-innings conceded runs and credited wickets                | Wickets descending, runs ascending, then earliest innings; 4W is exactly four and 5W is at least five. |

## 4. Appearance and fielding statistics

| Statistic            | Derived from                                              | Rule                                                            |
| -------------------- | --------------------------------------------------------- | --------------------------------------------------------------- |
| Appearances          | Accepted fixture squad membership                         | Counts a selected player even with no delivery activity.        |
| Catches              | `caught` fielder records and caught-and-bowled deliveries | One contribution per wicket.                                    |
| Stumpings            | `stumped` fielder records                                 | One contribution per wicket.                                    |
| Run-out involvements | `run out` fielder records                                 | Every distinct identified contributor receives one involvement. |

## 5. Team statistics

| Statistic  | Derived from                                                                       | Rule                                                                                                                   |
| ---------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Team total | `runs.total` of every delivery in the innings, **plus** innings-level penalty runs | The one statistic that cannot be derived from deliveries alone. Penalty runs belong to the innings and to no delivery. |

## 6. Field-level summary

| Submission field               | Feeds                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| `runs.offBat`                  | Runs scored, strike rate, runs conceded                                               |
| `runs.extras`                  | Team total                                                                            |
| `runs.total`                   | Team total                                                                            |
| `extras.wides`                 | Runs conceded; excludes the delivery from balls faced and from legal balls bowled     |
| `extras.noBalls`               | Runs conceded; excludes the delivery from legal balls bowled but not from balls faced |
| `extras.byes`                  | Team total. Runs conceded and bowler wides only when recorded on a wide.              |
| `extras.legByes`               | Team total. Runs conceded and bowler wides only when recorded on a wide.              |
| `extras.penalty`               | Team total only                                                                       |
| `strikerId`                    | Attribution of runs scored, balls faced, strike rate                                  |
| `bowlerId`                     | Attribution of runs conceded, legal balls, overs, wickets, economy rate               |
| `nonStrikerId`                 | Batting innings and not-out attribution                                               |
| `wickets[].kind`               | Bowler wickets, batter dismissals, catches, stumpings and run-out involvements        |
| `wickets[].playerOutId`        | Dismissals, not-outs and batting average                                              |
| `wickets[].fielders[]`         | Catches, stumpings and every identified run-out involvement                           |
| `overNumber`, `positionInOver` | Delivery identity and ordering. Not a statistic.                                      |
| `sequenceNumber`               | Ordering within the innings. Not a statistic.                                         |
| `ballNumber`                   | Nothing. Display only.                                                                |
| `eventId`                      | Retry and replay detection. Not a statistic.                                          |

A delivery is a wide only when `extras.wides` is greater than zero, and a no-ball only when
`extras.noBalls` is greater than zero. An omitted field, `null` and an explicit `0` are
equivalent: none of them makes a delivery a wide or a no-ball, so none changes balls faced, legal
balls bowled, overs or economy. Stored events and the public events API keep the value exactly as
submitted, including an explicit `0`. Every derivation applies this rule through the shared
classification in `packages/contracts/src/cricket-delivery-classification.ts` (issue #590).

## 7. Scope exclusions

Super-over innings are excluded from batting and bowling aggregates. Super-over
runs, wickets and balls do not count towards a player's record. The exclusion is
applied once, where standard innings are selected, so no super-over delivery
enters the derivation. The response reports `superOversIncluded: false`.

The rule is verified against fixture 423788 in the database integration tests:
the excluded records would otherwise add two runs and one ball to one batter and
six runs, six legal balls and a wicket to one bowler.

Client confirmation of this convention is recorded as pending in
`evidence/validation/issue-104-super-over-aggregates.md`.

## 8. Statistics not derived from submitted events

| Statistic                   | Reason                                                                                  |
| --------------------------- | --------------------------------------------------------------------------------------- |
| Powerplay-scoped aggregates | Powerplay markers have no submission path.                                              |
| Fixture outcome             | Recorded on the fixture, not derived from deliveries. Not used in any player statistic. |

## AI Declaration

The preceding document was generated with the assistance of Claude-Web[Claude Opus 5].
The issue #623 wide-run rule was documented with the assistance of Claude-Code[Claude Opus 5].
The issue #632 participant aggregate mappings were updated with the assistance of Codex[GPT-5].
