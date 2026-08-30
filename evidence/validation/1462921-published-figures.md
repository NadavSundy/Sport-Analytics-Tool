# Published figures for validation — match 1462921

Reference figures used to validate a shortened, target-adjusted fixture, taken
from a published scorecard independent of the Cricsheet source file.

**Match:** Uganda v Rwanda, 4th match, Africa Continental Cup 2024/25
**Date:** 5 December 2024
**Venue:** Gahanga International Cricket Stadium, Kigali City
**Cricsheet identifier:** 1462921
**Committed source file:** `database/seeds/matches/1462921.json`

## Sources

- ESPNcricinfo full scorecard:
  `https://www.espncricinfo.com/series/africa-continental-cup-2024-25-1462871/rwanda-vs-uganda-4th-match-1462921/full-scorecard`

The ESPNcricinfo URL contains the identifier 1462921, confirming that the
published scorecard and the Cricsheet file describe the same match.

This match was selected because it was shortened and its target adjusted by the
Duckworth–Lewis–Stern method. It is the reference case for a fixture whose innings
are not of the scheduled length and whose result margin is not derivable from the
two innings totals. It also carries the highest proportion of uncredited
dismissals in the reference set, and it is the fixture in which a divergence
between the committed source and the published record was first found.

## Result

|                     |                                      |
| ------------------- | ------------------------------------ |
| Uganda              | 192/7 (18 overs)                     |
| Rwanda              | 83 all out (16.1 overs), chasing 196 |
| Result              | Uganda won by 112 runs (D/L method)  |
| Player of the match | Robinson Obuya (83)                  |

The match was scheduled over 20 overs and reduced to 18 per innings. Rwanda's
target was 196 from 18 overs, three above the 193 that Uganda's 192 would
otherwise imply. The margin of 112 is the difference between the par score of 195
and Rwanda's 83, not between the two innings totals.

The source records `"by": {"runs": 112}` with `"method": "D/L"`.

## Innings totals

| Innings | Team   | Runs | Wickets | Overs | Maximum overs | Extras |
| ------- | ------ | ---- | ------- | ----- | ------------- | ------ |
| 1       | Uganda | 192  | 7       | 18.0  | 18            | 11     |
| 2       | Rwanda | 83   | 10      | 16.1  | 18            | 12     |

Extras breakdown as published, in runs:

- Uganda: 3 leg byes, 6 wides, 2 no-balls
- Rwanda: 1 bye, 7 leg byes, 4 wides

Delivery counts, measured from the committed source file:

| Innings | Deliveries | Legal |
| ------- | ---------- | ----- |
| 1       | 115        | 107   |
| 2       | 101        | 97    |

Uganda's legal-delivery count is one short of the 108 that a completed 18-over
innings implies. See the source data note below.

## Fall of wickets — Uganda

| Wicket | Score | Over | Batter dismissed (published) | Batter dismissed (source) | Kind (source) |
| ------ | ----- | ---- | ---------------------------- | ------------------------- | ------------- |
| 1      | 22    | 2.5  | Shrideep Mangela             | SG Mangela                | bowled        |
| 2      | 50    | 5.2  | Raghav Dhawan                | Raghav Dhawan             | caught        |
| 3      | 107   | 10.4 | Riazat Ali Shah              | Riazat Ali Shah           | caught        |
| 4      | 146   | 14.1 | Robinson Obuya               | R Obuya                   | caught        |
| 5      | 170   | 16.1 | Alpesh Ramjani               | AR Ramjani                | run out       |
| 6      | 171   | 16.2 | Dinesh Nakrani               | DM Nakrani                | run out       |
| 7      | 183   | 17.1 | Fred Achelam                 | F Achelam                 | run out       |

## Fall of wickets — Rwanda

| Wicket | Score | Over | Batter dismissed (published) | Batter dismissed (source) | Kind (source) |
| ------ | ----- | ---- | ---------------------------- | ------------------------- | ------------- |
| 1      | 37    | 4.1  | Oscar Manishimwe             | O Manishimwe              | lbw           |
| 2      | 37    | 4.2  | Eric Dusingizimana           | E Dusingizimana           | lbw           |
| 3      | 37    | 4.5  | Isae Niyomugabo              | I Niyomugabo              | caught        |
| 4      | 38    | 5.3  | Daniel Gumyusenge            | D Gumyusenge              | bowled        |
| 5      | 39    | 6.1  | Rukundo Pierre               | RJ Pierre                 | lbw           |
| 6      | 41    | 7.6  | Didier Ndikubwimana          | D Ndikubwimana            | bowled        |
| 7      | 65    | 13.1 | Emile Rukiriza               | E Rukiriza                | bowled        |
| 8      | 66    | 13.6 | Martin Akayezu               | M Akayezu                 | caught        |
| 9      | 82    | 15.5 | Zappy Bimenyimana            | Z Bimenyimana             | caught        |
| 10     | 83    | 16.1 | Ignace Ntirenganya           | I Ntirenganya             | bowled        |

Both dismissal orders match the source file exactly.

Rukundo Pierre is worth noting: published as given name then surname, recorded as
`RJ Pierre`. A comparison assuming the published form is always
`<given> <surname>` and the source always `<initials> <surname>` would pair them
wrongly.

## Running score checkpoints

The ESPNcricinfo match flow for this fixture does not print running-score
milestones or powerplay figures.

## Bowler credit

Seventeen dismissals occur. Fourteen are credited to a bowler and three are not:
the run outs of Dinesh Nakrani, Alpesh Ramjani and Fred Achelam, all in Uganda's
innings.

| Innings | Credited | Not credited |
| ------- | -------- | ------------ |
| 1       | 4        | 3            |
| 2       | 10       | 0            |

At three uncredited dismissals from seven, this fixture carries the highest
proportion of uncredited dismissals in the reference set and is the strongest
test of the bowler-credit rule.

## Independent corroboration from the source

The source's deliveries sum to 192 runs and 7 wickets for Uganda and 83 runs and
10 wickets for Rwanda, matching the published totals exactly. No innings penalty
runs are recorded. Extras breakdowns sum to the published extras totals of 11 and
12, and batters' runs plus extras sum to the published innings totals.

Note that internal consistency here is not corroboration of the result: 192 − 83
is 109, not the published 112, because the margin depends on the revised target.

## Source data notes

1. **The committed source omits one scoreless delivery from Uganda's innings.**
   The scorecard prints a completed 18.0 overs, which is 108 legal deliveries; the
   source records 107. The shortfall is in `over: 16` — the seventeenth over,
   Cricsheet numbering overs from zero — which holds five deliveries labelled 16.1
   to 16.5, all legal, with the next over beginning at 17.1. Every other over in
   the innings holds six, including the eighteenth, so this is not an innings
   closed early.

   **No run or wicket figure is affected.** The source sums to the published
   totals exactly, so the omitted delivery scored nothing and took no wicket.

   Consequently the totals, wickets, extras and fall-of-wickets figures in this
   document may all be asserted against the platform's derivation. Uganda's
   legal-delivery count and any over figure derived from it may not be asserted
   against the published 18.0 overs: the platform will correctly derive 107 from
   the data it holds.

   This is the first case in the reference set where the committed source and the
   published record disagree on a figure the platform derives from. Its handling
   is governed by the reference update policy.

2. A derivation that computes a result margin as the difference between innings
   totals will produce 109 for this fixture, not the published 112.

3. A derivation that assumes a scheduled innings length of 20 overs will treat
   Uganda's completed innings as incomplete.

4. A scorecard's extras line reports runs, not deliveries. For this fixture every
   wide and no-ball conceded a single run, so the two coincide; that is not true
   in general.

## Validation status

| Check                                | Status                                     |
| ------------------------------------ | ------------------------------------------ |
| Innings totals                       | Transcribed; awaiting automated comparison |
| Wickets per innings                  | Transcribed; awaiting automated comparison |
| Legal ball counts                    | Measured from source; 107 and 97           |
| Extras totals                        | Transcribed; awaiting automated comparison |
| Extras breakdown by type             | Runs published; delivery counts coincide   |
| Fall of wickets                      | Transcribed; source name column incomplete |
| Running score checkpoints            | Not published for this fixture             |
| Powerplay runs and wickets           | Not published for this fixture             |
| Run outs excluded from bowler credit | Awaiting automated comparison              |
| Uganda legal-delivery count          | Disputed; see source data note 1           |
| Result margin under D/L              | Transcribed; not derivable from totals     |

No automated comparison exists for this fixture yet. It is added under issue #287.

## AI Declaration

The preceding document was planned and generated with the assistance of
Claude-Web[Claude Opus 5]. Every published figure was transcribed from the
scorecard cited above and checked against it by hand before this document was
committed.
