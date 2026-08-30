# Published figures for validation — match 1399114

Reference figures used to validate international-fixture classification and
legal-delivery counting, taken from a published scorecard independent of the
Cricsheet source file.

**Match:** Pakistan v Hong Kong, Quarter Final, Asian Games Men's Cricket
Competition 2023
**Date:** 3 October 2023
**Venue:** Zhejiang University of Technology Cricket Field, Hangzhou
**Cricsheet identifier:** 1399114
**Committed source file:** `database/seeds/matches/1399114.json`

## Sources

- ESPNcricinfo full scorecard:
  `https://www.espncricinfo.com/series/asian-games-men-s-cricket-competition-2023-1398685/hong-kong-vs-pakistan-2nd-quarter-final-1399114/full-scorecard`

The ESPNcricinfo URL contains the identifier 1399114, confirming that the
published scorecard and the Cricsheet file describe the same match.

This match was selected for two reasons. It is an international fixture played
under an event name rather than a bilateral series, and its `match_type` is `T20`
rather than `IT20` — the reference case for the finding recorded under issue #175
that `match_type` is not a reliable international filter and that
`team_type = 'international'` must be used instead. Its second innings also
contains a seven-ball over, making it the reference case for legal-delivery
counting where the printed over figure and the delivery count diverge.

## Result

|                     |                                      |
| ------------------- | ------------------------------------ |
| Pakistan            | 160 all out (20 overs)               |
| Hong Kong           | 92 all out (18.5 overs), chasing 161 |
| Result              | Pakistan won by 68 runs              |
| Player of the match | Not printed on this scorecard        |

The scorecard's series result field reads "Pakistan advanced". The match result
is the 68-run margin, consistent with the source recording `"by": {"runs": 68}`.

## Innings totals

| Innings | Team      | Runs | Wickets | Overs | Extras |
| ------- | --------- | ---- | ------- | ----- | ------ |
| 1       | Pakistan  | 160  | 10      | 20.0  | 5      |
| 2       | Hong Kong | 92   | 10      | 18.5  | 7      |

Extras breakdown as published, in runs:

- Pakistan: 2 leg byes, 2 no-balls, 1 wide
- Hong Kong: 1 bye, 2 leg byes, 4 wides

Delivery counts, measured from the committed source file:

| Innings | Deliveries | Legal |
| ------- | ---------- | ----- |
| 1       | 123        | 120   |
| 2       | 118        | 114   |

Every wide and no-ball in this fixture conceded a single run, so the published
run figures and the delivery counts coincide. That is not true in general — see
match 423788, where they do not.

## Fall of wickets — Pakistan

| Wicket | Score | Over | Batter dismissed (published) | Batter dismissed (source) | Kind (source) |
| ------ | ----- | ---- | ---------------------------- | ------------------------- | ------------- |
| 1      | 1     | 0.4  | Mirza Baig                   | Mirza Baig                | caught        |
| 2      | 19    | 2.5  | Rohail Nazir                 | Rohail Nazir              | caught        |
| 3      | 24    | 3.4  | Haider Ali                   | Haider Ali                | lbw           |
| 4      | 51    | 8.1  | Qasim Akram                  | Qasim Akram               | caught        |
| 5      | 54    | 8.5  | Omair Yousuf                 | Omair Yousuf              | bowled        |
| 6      | 73    | 12.3 | Khushdil Shah                | Khushdil Shah             | caught        |
| 7      | 109   | 16.4 | Asif Ali                     | Asif Ali                  | caught        |
| 8      | 126   | 18.3 | Arafat Minhas                | Arafat Minhas             | caught        |
| 9      | 160   | 19.5 | Aamer Jamal                  | Aamer Jamal               | caught        |
| 10     | 160   | 19.6 | Arshad Iqbal                 | Arshad Iqbal              | caught        |

## Fall of wickets — Hong Kong

| Wicket | Score | Over | Batter dismissed (published) | Batter dismissed (source) | Kind (source) |
| ------ | ----- | ---- | ---------------------------- | ------------------------- | ------------- |
| 1      | 10    | 1.5  | Muhammad Khan                | Muhammad Khan             | caught        |
| 2      | 29    | 5.3  | Nizakat Khan                 | Nizakat Khan              | bowled        |
| 3      | 54    | 8.6  | Babar Hayat                  | Babar Hayat               | bowled        |
| 4      | 54    | 9.6  | Shiv Mathur                  | S Mathur                  | caught        |
| 5      | 55    | 10.5 | Nasrulla Rana                | Nasrulla Rana             | bowled        |
| 6      | 57    | 11.1 | Anas Khan                    | Anas Khan                 | run out       |
| 7      | 62    | 12.4 | Akbar Khan                   | Akbar Khan                | caught        |
| 8      | 63    | 13.2 | Ayush Shukla                 | A Shukla                  | caught        |
| 9      | 76    | 16.4 | Mohammad Ghazanfar           | Mohammad Ghazanfar        | bowled        |
| 10     | 92    | 18.5 | Niaz Ali                     | Niaz Ali                  | caught        |

Both dismissal orders match the source file exactly.

Most names in this fixture are identical between the published record and the
source, because the source uses full names for players who are not customarily
recorded with initials. Two are not: `S Mathur` and `A Shukla`. A comparison rule
that assumes either convention holds throughout will fail on this fixture.

Note that Hong Kong's fall-of-wicket over figures are affected by the seven-ball
over described below.

## Running score checkpoints

Recorded from the ESPNcricinfo match flow.

| Innings | Milestone | Overs | Balls | Extras at that point |
| ------- | --------- | ----- | ----- | -------------------- |
| 1       | 50 runs   | 7.4   | 46    | 2                    |
| 1       | 100 runs  | 14.5  | 90    | 3                    |
| 1       | 150 runs  | 19.2  | 118   | 5                    |
| 2       | 50 runs   | 8.4   | 52    | 4                    |

Powerplay figures:

| Innings | Powerplay | Overs     | Runs | Wickets |
| ------- | --------- | --------- | ---- | ------- |
| 1       | Mandatory | 0.1 – 6.0 | 38   | 3       |
| 2       | Mandatory | 0.1 – 6.0 | 31   | 2       |

## Bowler credit

Twenty dismissals occur. Nineteen are credited to a bowler and one is not: the
run out of Anas Khan.

| Innings | Credited | Not credited |
| ------- | -------- | ------------ |
| 1       | 10       | 0            |
| 2       | 9        | 1            |

Pakistan's innings is the only one in the reference set in which every dismissal
is credited to a bowler.

## The seven-ball over

The scorecard's match flow records:

> Hong Kong innings: 1x7 ball over (9th over, bowled by Khushdil Shah, called by
> Umpire Masudur Rahman)

The Hong Kong innings is printed as 18.5 overs, which under ordinary counting is
113 legal deliveries. The committed source records **114**. The difference is the
seventh ball of the ninth over, and the two records agree.

This is the value of the fixture as a reference case. A derivation that computes
legal deliveries from a printed over figure, or an over figure from a
legal-delivery count, will be wrong by one here. The existing query at
`apps/backend/scripts/queries/c4-miscounted.sql` addresses this class of case.

## Independent corroboration from the source

160 − 92 = 68, matching both the published margin and the source's recorded
`"by": {"runs": 68}`. The extras breakdowns sum to the published extras totals of
5 and 7, and the batters' runs plus extras sum to the published innings totals.

## Source data notes

1. `match_type` for this fixture is `T20`, not `IT20`, despite it being an
   international match. Any check expecting `IT20` for internationals will fail
   here, and that failure is the intended behaviour.
2. The scorecard records that Babar Hayat was given stumped at 3.2 and recalled.
   The delivery is recorded, the dismissal is not; the fall-of-wickets table above
   reflects the corrected position.
3. A scorecard's extras line reports runs, not deliveries. Assertions built on
   `COUNT(*) FILTER (WHERE d.extra_wides IS NOT NULL)` count deliveries and must
   not be given a figure copied from the extras line.

## Validation status

| Check                                   | Status                                      |
| --------------------------------------- | ------------------------------------------- |
| Innings totals                          | Transcribed; awaiting automated comparison  |
| Wickets per innings                     | Transcribed; awaiting automated comparison  |
| Legal ball counts                       | Measured from source; 120 and 114           |
| Extras totals                           | Transcribed; awaiting automated comparison  |
| Extras breakdown by type                | Runs published; delivery counts coincide    |
| Fall of wickets                         | Transcribed; source name column outstanding |
| Running score checkpoints               | Transcribed; awaiting automated comparison  |
| Powerplay runs and wickets              | Transcribed; awaiting automated comparison  |
| Run out excluded from bowler credit     | Awaiting automated comparison               |
| Seven-ball over reflected in ball count | Confirmed: source records 114               |

No automated comparison exists for this fixture yet. It is added under issue #287.

## AI Declaration

The preceding document was planned and generated with the assistance of
Claude-Web[Claude Opus 5]. Every published figure was transcribed from the
scorecard cited above and checked against it by hand before this document was
committed.
