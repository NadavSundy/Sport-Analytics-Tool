# Published figures for validation — match 729307

Reference figures used to validate the delivery event schema, taken from
published scorecards independent of the Cricsheet source file.

**Match:** Kolkata Knight Riders v Kings XI Punjab, 15th match, Pepsi Indian
Premier League 2014
**Date:** 26 April 2014
**Venue:** Sheikh Zayed Stadium, Abu Dhabi
**Cricsheet identifier:** 729307
**Committed source file:** `database/seeds/matches/729307.json`

## Sources

- ESPNcricinfo full scorecard:
  `https://www.espncricinfo.com/series/pepsi-indian-premier-league-2014-695871/kolkata-knight-riders-vs-kings-xi-punjab-15th-match-729307/full-scorecard`
- Wisden live scores:
  `https://www.wisden.com/team/punjab-kings-1107/live-cricket-scores/kolkata-knight-riders-vs-kings-xi-punjab-match-t20-krkp04262014175886`

The ESPNcricinfo URL contains the identifier 729307, confirming that the
published scorecard and the Cricsheet file describe the same match.

This match was selected because it exercises the parts of the schema most likely
to be modelled wrongly: all four common extras types appear, including byes and
leg byes which must be excluded from a bowler's runs conceded, and the dismissals
include a run out, which must not be credited to the bowler.

## Result

|                       |                                       |
| --------------------- | ------------------------------------- |
| Kings XI Punjab       | 132/9 (20 overs)                      |
| Kolkata Knight Riders | 109 all out (18.2 overs), chasing 133 |
| Result                | Kings XI Punjab won by 23 runs        |
| Player of the match   | Sandeep Sharma (3/21)                 |

## Innings totals

| Innings | Team                  | Runs | Wickets | Overs | Extras |
| ------- | --------------------- | ---- | ------- | ----- | ------ |
| 1       | Kings XI Punjab       | 132  | 9       | 20.0  | 5      |
| 2       | Kolkata Knight Riders | 109  | 10      | 18.2  | 10     |

Extras breakdown, derived by SQL from the database:

- Kings XI Punjab: 1 wide, 1 no-ball, 1 bye, 2 leg byes
- Kolkata Knight Riders: 5 wides, 5 leg byes

## Fall of wickets — Kolkata Knight Riders

The strongest single validation target. Reproducing all ten rows requires the
delivery ordering, the run accumulation and the wicket attribution to be
simultaneously correct.

| Wicket | Score | Over | Batter dismissed (published) | Batter dismissed (source) |
| ------ | ----- | ---- | ---------------------------- | ------------------------- |
| 1      | 13    | 2.4  | Manish Pandey                | MK Pandey                 |
| 2      | 19    | 4.1  | Gautam Gambhir               | G Gambhir                 |
| 3      | 19    | 5.1  | Jacques Kallis               | JH Kallis                 |
| 4      | 50    | 11.1 | Chris Lynn                   | CA Lynn                   |
| 5      | 59    | 12.3 | Yusuf Pathan                 | YK Pathan                 |
| 6      | 62    | 12.6 | Robin Uthappa                | RV Uthappa                |
| 7      | 65    | 13.4 | Piyush Chawla                | PP Chawla                 |
| 8      | 85    | 15.6 | Sunil Narine                 | SP Narine                 |
| 9      | 103   | 17.3 | Suryakumar Yadav             | SA Yadav                  |
| 10     | 109   | 18.2 | Umesh Yadav                  | UT Yadav                  |

The two name columns are recorded deliberately. The published scorecard spells
names in full while Cricsheet uses initials and surname. This is a further reason
that names cannot serve as identity, beyond the renames and collisions recorded in
the schema document: the same person is written differently by different sources.
The database stores the registry identifier and reproduces the source form.

## Running score checkpoints

Recorded from the ESPNcricinfo match flow and asserted by the automated database
test. These test that runs and extras accumulate at the correct point in the
innings rather than merely summing correctly.

| Innings | Milestone | Overs | Balls | Extras at that point |
| ------- | --------- | ----- | ----- | -------------------- |
| 1       | 50 runs   | 5.5   | 36    | 4                    |
| 1       | 100 runs  | 13.1  | 80    | 4                    |
| 2       | 50 runs   | 10.5  | 65    | 5                    |

Powerplay figures:

| Innings | Powerplay | Overs     | Runs | Wickets |
| ------- | --------- | --------- | ---- | ------- |
| 1       | Mandatory | 0.1 – 6.0 | 51   | 2       |
| 2       | Mandatory | 0.1 – 6.0 | 24   | 3       |

## Bowler credit

Seventeen dismissals are credited to nine bowlers. Two are not credited to any
bowler: one run out and one further dismissal of a kind flagged
`credits_bowler = false` in the `dismissal_kind` lookup.

Sandeep Sharma's three wickets agree with the published player of the match line
of 3 for 21, which corroborates the credit rule independently.

## Independent corroboration from the source

The source file's own recorded outcome is a win for Kings XI Punjab by 23 runs.
132 − 109 = 23, so the source is internally consistent as well as agreeing with
the published record. These are separate checks: internal consistency alone would
not detect a systematic error in the derivation rules.

## Validation status

Manual validation is performed by `apps/backend/scripts/validate-match.ts`, which
derives every figure by SQL over `delivery_current` and reads nothing from the
source file. Its twenty-two comparisons cover the two innings totals, all ten
fall-of-wicket rows, and credited and uncredited dismissals.

`apps/backend/tests/database/reference-fixture.database.test.ts` now runs those
same twenty-two comparisons automatically against a transactionally ingested
copy of the committed fixture. It also verifies the domain shape, ordered Basic
events, the running-score checkpoints, both powerplays, repeat loading and all
three invalid examples.

On 20 August 2026, `npm run test:database` provisioned a disposable PostgreSQL 16
cluster, applied all eight migrations and passed all 46 tests in 10 database test
files. The seven reference-fixture cases passed as part of that run.

| Check                                       | Status                                      |
| ------------------------------------------- | ------------------------------------------- |
| Innings totals derived from the source file | Confirmed against published figures         |
| Innings totals derived from the database    | Confirmed                                   |
| Wickets per innings                         | Confirmed                                   |
| Legal ball counts and overs                 | Confirmed                                   |
| Extras totals                               | Confirmed                                   |
| Extras breakdown by type                    | Derived from the database; see caveat below |
| Fall of wickets                             | Confirmed, all ten rows                     |
| Run outs excluded from bowler credit        | Confirmed                                   |
| Repeat loading                              | Confirmed: no duplicate domain records      |
| Running score checkpoints                   | Confirmed by automated database test        |
| Powerplay runs and wickets                  | Confirmed by automated database test        |
| Invalid submission examples                 | Confirmed rejected without partial fixtures |

**Caveat on the extras breakdown.** The published scorecard's per-type extras line
could not be read directly, because the site blocks automated access. The
breakdown above is derived from the database and is consistent with the source
file, and the extras totals of 5 and 10 match the published innings figures. The
per-type split should be confirmed against the scorecard by hand before this
document is treated as complete.

## AI Declaration

The preceding document was planned and generated with the assistance of
Claude-Web[Claude Opus 5] and reviewed and edited with the assistance of
Codex[GPT-5].
