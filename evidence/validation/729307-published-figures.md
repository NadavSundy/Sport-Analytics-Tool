# Published figures for validation — match 729307

Reference figures used to validate the delivery event schema, taken from
published scorecards independent of the Cricsheet source file.

**Match:** Kolkata Knight Riders v Kings XI Punjab, 15th match, Pepsi Indian
Premier League 2014
**Date:** 26 April 2014
**Venue:** Sheikh Zayed Stadium, Abu Dhabi
**Cricsheet identifier:** 729307
**Source file:** `data/cricsheet/matches/indian-premier-league/729307.json`

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

| | |
|---|---|
| Kings XI Punjab | 132/9 (20 overs) |
| Kolkata Knight Riders | 109 all out (18.2 overs), chasing 133 |
| Result | Kings XI Punjab won by 23 runs |
| Player of the match | Sandeep Sharma (3/21) |

## Innings totals

| Innings | Team | Runs | Wickets | Overs | Extras |
|---|---|---|---|---|---|
| 1 | Kings XI Punjab | 132 | 9 | 20.0 | 5 |
| 2 | Kolkata Knight Riders | 109 | 10 | 18.2 | 10 |

Extras breakdown derived from the source file, pending confirmation against the
published scorecard's extras line:

- Kings XI Punjab: 1 no-ball, 1 wide, 2 leg byes, 1 bye
- Kolkata Knight Riders: 5 wides, 5 leg byes

## Running score checkpoints

These test that runs and extras accumulate at the correct point in the innings,
not merely that the totals agree. Taken from the ESPNcricinfo match flow.

| Innings | Milestone | Overs | Balls | Extras at that point |
|---|---|---|---|---|
| 1 | 50 runs | 5.5 | 36 | 4 |
| 1 | 100 runs | 13.1 | 80 | 4 |
| 2 | 50 runs | 10.5 | 65 | 5 |

Powerplay figures:

| Innings | Powerplay | Overs | Runs | Wickets |
|---|---|---|---|---|
| 1 | Mandatory | 0.1 – 6.0 | 51 | 2 |
| 2 | Mandatory | 0.1 – 6.0 | 24 | 3 |

## Fall of wickets — Kolkata Knight Riders

The strongest single validation target. Reproducing all ten rows requires the
delivery ordering, the run accumulation and the wicket attribution to be
simultaneously correct.

| Wicket | Score | Over | Batter dismissed |
|---|---|---|---|
| 1 | 13 | 2.4 | Manish Pandey |
| 2 | 19 | 4.1 | Gautam Gambhir |
| 3 | 19 | 5.1 | Jacques Kallis |
| 4 | 50 | 11.1 | Chris Lynn |
| 5 | 59 | 12.3 | Yusuf Pathan |
| 6 | 62 | 12.6 | Robin Uthappa |
| 7 | 65 | 13.4 | Piyush Chawla |
| 8 | 85 | 15.6 | Sunil Narine |
| 9 | 103 | 17.3 | Suryakumar Yadav |
| 10 | 109 | 18.2 | Umesh Yadav |

## Independent corroboration from the source

The source file's own recorded outcome is a win for Kings XI Punjab by 23 runs.
132 − 109 = 23, so the source is internally consistent as well as agreeing with
the published record. These are separate checks: internal consistency alone would
not detect a systematic error in the derivation rules.

## Validation status

| Check | Status |
|---|---|
| Innings totals derived from the source file | Confirmed against published figures |
| Innings totals derived from the database | Pending |
| Running score checkpoints from the database | Pending |
| Fall of wickets reproduced from the database | Pending |
| Extras breakdown confirmed against the published extras line | Pending |

## AI Declaration

The preceding document was planned and generated with the assistance of
Claude-Web[Claude Opus 5].