# Published figures for validation — match 423788

Reference figures used to validate super-over exclusion and the delivery event
schema, taken from a published scorecard independent of the Cricsheet source
file.

**Match:** New Zealand v Australia, 2nd Twenty20 International, Australia tour of
New Zealand 2009/10
**Date:** 28 February 2010
**Venue:** AMI Stadium, Christchurch
**Cricsheet identifier:** 423788
**Committed source file:** `database/seeds/matches/423788.json`

## Sources

- ESPNcricinfo full scorecard:
  `https://www.espncricinfo.com/series/australia-tour-of-new-zealand-2009-10-423770/new-zealand-vs-australia-2nd-t20i-423788/full-scorecard`

The ESPNcricinfo URL contains the identifier 423788, confirming that the
published scorecard and the Cricsheet file describe the same match.

This fixture already carries a validation record at
`evidence/validation/issue-104-super-over-aggregates.md`, written under issue #104
and scoped to super-over exclusion. That record cites two match reports; this
document adds the full scorecard and the figures a match report does not carry —
innings totals, fall of wickets, extras and running-score checkpoints.

The two documents are complementary and neither supersedes the other. Where this
document concerns the eliminator, it defers to the #104 record rather than
restating it.

This match was selected because it was tied and decided by a one-over
eliminator. It is the reference case for the super-over exclusion rules
implemented under issue #104: eliminator deliveries are recorded as events but
must not contribute to batting or bowling aggregates. It is also the only fixture
in the reference set where a scorecard extras figure and the corresponding
delivery count differ.

## Result

|                     |                                                     |
| ------------------- | --------------------------------------------------- |
| New Zealand         | 214/6 (20 overs)                                    |
| Australia           | 214/4 (20 overs), chasing 215                       |
| Result              | Match tied; New Zealand won the one-over eliminator |
| Player of the match | Brendon McCullum (116 not out)                      |

## Innings totals

Figures below exclude the one-over eliminator, which is recorded separately.

| Innings | Team        | Runs | Wickets | Overs | Extras |
| ------- | ----------- | ---- | ------- | ----- | ------ |
| 1       | New Zealand | 214  | 6       | 20.0  | 18     |
| 2       | Australia   | 214  | 4       | 20.0  | 6      |

Extras breakdown as published, in runs:

- New Zealand: 12 leg byes, 5 wides, 1 no-ball
- Australia: 1 leg bye, 2 wides, 3 no-balls

Delivery counts, measured from the committed source file:

| Innings | Deliveries | Legal | Wide deliveries | No-ball deliveries |
| ------- | ---------- | ----- | --------------- | ------------------ |
| 1       | 125        | 120   | 4               | 1                  |
| 2       | 125        | 120   | 2               | 3                  |

**New Zealand conceded four wide deliveries for five runs.** A count-based
assertion on that innings must expect 4; the extras line's `w 5` is the run
figure. This distinction is easy to lose and this fixture is where it first
matters.

## Fall of wickets — New Zealand

| Wicket | Score | Over | Batter dismissed (published) | Batter dismissed (source) | Kind (source) |
| ------ | ----- | ---- | ---------------------------- | ------------------------- | ------------- |
| 1      | 10    | 0.6  | Peter Ingram                 | PJ Ingram                 | bowled        |
| 2      | 62    | 6.2  | Martin Guptill               | MJ Guptill                | caught        |
| 3      | 69    | 8.5  | Ross Taylor                  | LRPL Taylor               | run out       |
| 4      | 77    | 10.2 | James Franklin               | JEC Franklin              | caught        |
| 5      | 145   | 15.2 | Gareth Hopkins               | GJ Hopkins                | hit wicket    |
| 6      | 164   | 16.4 | Jacob Oram                   | JDP Oram                  | bowled        |

## Fall of wickets — Australia

| Wicket | Score | Over | Batter dismissed (published) | Batter dismissed (source) | Kind (source) |
| ------ | ----- | ---- | ---------------------------- | ------------------------- | ------------- |
| 1      | 27    | 2.3  | David Warner                 | DA Warner                 | caught        |
| 2      | 100   | 11.1 | Brad Haddin                  | BJ Haddin                 | caught        |
| 3      | 132   | 13.3 | David Hussey                 | DJ Hussey                 | bowled        |
| 4      | 214   | 19.6 | Michael Clarke               | MJ Clarke                 | run out       |

The source column follows the convention established for match 729307: the
published scorecard spells names in full while Cricsheet uses initials and
surname, and both forms are recorded because names cannot serve as identity.
Ross Taylor is the sharpest example — published as two names, recorded as
`LRPL Taylor`.

Both dismissal orders match the source file exactly.

## Running score checkpoints

Recorded from the ESPNcricinfo match flow.

| Innings | Milestone | Overs | Balls | Extras at that point |
| ------- | --------- | ----- | ----- | -------------------- |
| 1       | 50 runs   | 5.2   | 33    | 6                    |
| 1       | 100 runs  | 12.2  | 75    | 11                   |
| 1       | 150 runs  | 15.4  | 96    | 13                   |
| 1       | 200 runs  | 18.5  | 117   | 16                   |
| 2       | 50 runs   | 5.6   | 37    | 1                    |
| 2       | 100 runs  | 10.6  | 69    | 3                    |
| 2       | 150 runs  | 15.1  | 95    | 5                    |
| 2       | 200 runs  | 18.5  | 118   | 6                    |

Powerplay figures are not printed on this scorecard.

## Bowler credit

Excluding the eliminator, ten dismissals occur. Eight are credited to a bowler
and two are not: the run outs of Ross Taylor and Michael Clarke.

| Innings | Credited | Not credited |
| ------- | -------- | ------------ |
| 1       | 5        | 1            |
| 2       | 3        | 1            |

Gareth Hopkins is recorded as `hit wicket b Nannes` and **is** credited to the
bowler. A rule that excludes hit wicket from bowler credit would produce 4 and 3
here rather than 5 and 3.

This is the only fixture in the reference set containing a `hit wicket`
dismissal, so it is the only one that exercises that row of the `dismissal_kind`
lookup.

## One-over eliminator

As published:

| Team        | Runs | Balls   |
| ----------- | ---- | ------- |
| Australia   | 6    | 1 over  |
| New Zealand | 9    | 4 balls |

As recorded in the committed source file:

| Innings | Team        | `super_over` | Deliveries | Legal | Wide deliveries |
| ------- | ----------- | ------------ | ---------- | ----- | --------------- |
| 3       | Australia   | true         | 6          | 6     | 0               |
| 4       | New Zealand | true         | 5          | 3     | 2               |

Cricsheet records a super over as additional innings within the same match,
flagged `super_over: true`. This fixture therefore contains **four innings**, and
any assertion on innings count must expect four.

Eliminator deliveries must be excluded from all batting and bowling aggregates
per issue #104. The figures elsewhere in this document exclude them.

The per-participant inclusion deltas — what the excluded deliveries would
otherwise contribute — are recorded in
`evidence/validation/issue-104-super-over-aggregates.md` and asserted by
`apps/backend/tests/database/fixture-statistics.database.test.ts`. They are not
restated here.

**Stakeholder confirmation of the exclusion rule remains pending.** The #104
record notes that the team treats exclusion as the default but that client
confirmation has not been obtained. Until it is, the rule is a team decision
rather than an agreed requirement.

**The published record and the source disagree on the eliminator's ball count.**
The scorecard reports New Zealand's eliminator as four balls; the source records
five deliveries of which three were legal. The runs, 6 and 9, agree. No assertion
should be written against the eliminator ball count until the reference update
policy settles which record governs.

## Independent corroboration from the source

The source file records `"result": "tie"` with `"eliminator": "New Zealand"`,
agreeing with the published result. Both innings totals are 214, which is
consistent with a tie and independent of the eliminator figures.

## Validation status

| Check                                       | Status                                      |
| ------------------------------------------- | ------------------------------------------- |
| Innings totals                              | Transcribed; awaiting automated comparison  |
| Wickets per innings                         | Transcribed; awaiting automated comparison  |
| Legal ball counts                           | Measured from source; 120 and 120           |
| Extras totals                               | Transcribed; awaiting automated comparison  |
| Extras breakdown by type                    | Runs published; delivery counts measured    |
| Fall of wickets                             | Transcribed; source name column outstanding |
| Running score checkpoints                   | Transcribed; awaiting automated comparison  |
| Powerplay runs and wickets                  | Not published for this fixture              |
| Super-over innings excluded from aggregates | Awaiting automated comparison               |
| Eliminator ball count                       | Disputed; see above                         |

No automated comparison exists for this fixture yet. It is added under issue #287.

## AI Declaration

The preceding document was planned and generated with the assistance of
Claude-Web[Claude Opus 5]. Every published figure was transcribed from the
scorecard cited above and checked against it by hand before this document was
committed.
