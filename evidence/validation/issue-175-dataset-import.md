# Issue #175 dataset import verification

| Document Information | Details                                                     |
| -------------------- | ----------------------------------------------------------- |
| Issue                | #175 Import and verify the complete cricket dataset         |
| Verified by          | Ben Swartz                                                  |
| Date                 | 2026-08-19                                                  |
| Environment          | Shared development database, hosted PostgreSQL in eu-west-2 |

## 1. Source dataset and scope

The source is the Cricsheet corpus downloaded by scripts/download_cricsheet_t20.py under issue #28, held in data/cricsheet/matches and excluded from version control.

A dry run over the corpus reports 13,953 JSON files, all of which are valid match files carrying info and innings. No file was skipped as unrecognised.

```
npm run db:import --workspace=@sport-analytics/backend -- ../../data/cricsheet/matches --dry-run
```

**Caveat on scope.** Section 10 of the sport domain definition records that match_type "IT20" is not a reliable filter for international matches: every true T20 international carries match_type "T20" with team_type "international". Whether the downloader scope reflects this has not been confirmed against the corpus, and is recorded here as an open question rather than a verified property.

## 2. Import process

```
npm run db:import --workspace=@sport-analytics/backend -- <directory> [--limit N] [--dry-run]
```

Each match is ingested in its own transaction. A file that cannot be ingested rolls back alone and the run continues, and its reason is printed as it occurs and summarised at the end. Ingestion is idempotent, so an interrupted run is resumed by issuing the same command: matches already present are recognised and skipped.

## 3. Verification through the API

Verified against fixture 8937, Australia versus New Zealand on 17 February 2005 and the first men's T20 international, which was imported by this process and is not part of the development seed.

### Fixtures

GET /api/v1/fixtures?limit=5 returns imported fixtures with stable identifiers, season, match type, team type, gender, balls per over and scheduled overs, together with a pagination cursor.

### Ordered events

GET /api/v1/fixtures/8937/events?limit=3 returns deliveries in occurrence order, each carrying its innings ordinal, sequence number, over number and position in over, the participants involved, runs and typed extras.

The first three deliveries demonstrate the printed ball number behaving as property O1 describes: deliveries 1 and 2 both carry 0.1, being a wide and a leg bye, and delivery 3 carries 0.2. The label repeats within the over while positionInOver distinguishes the deliveries.

### Derived statistics

GET /api/v1/fixtures/8937/statistics returns:

| Figure               | Value                                    |
| -------------------- | ---------------------------------------- |
| Innings 0 team total | 214 from 123 deliveries, no penalty runs |
| Innings 1 team total | 170 from 122 deliveries, no penalty runs |
| Outcome              | Won by 44 runs                           |
| Super overs included | false                                    |

Participant statistics are derived for every player, with batting figures carrying runs, balls faced, fours, sixes and strike rate, and bowling figures carrying runs conceded, legal balls, wickets, overs and economy rate. Bowling figures show four overs as 24 legal balls throughout, so wides and no-balls are correctly excluded from the over count.

The margin of 44 runs is consistent with the two team totals, and the highest individual score of 98 from 55 deliveries with 8 fours and 5 sixes matches the published record for this fixture.

## 4. Repeated execution

Re-running the importer over matches already present reports them as already present and adds no rows. Verified over sixty matches: twenty imported, forty already present, none rejected.

The development seed is retained and unaffected. npm run db:seed reports four no-ops with unchanged fixture identifiers, and reference fixture 729307 continues to pass all twenty-two assertions against its published scorecard.

## 5. Known limitations

A submission row is created for every match processed, including one already present in full, so a resumed run leaves submission records referencing no delivery. Detecting a fully present fixture before inserting would cost an extra query per match, which over the corpus is more expensive than the rows it saves.

The full import had not completed at the time of this verification. Final counts are recorded separately once the run finishes.

## AI Declaration

The preceding document was generated with the assistance of Claude-Web[Claude Opus 5].
