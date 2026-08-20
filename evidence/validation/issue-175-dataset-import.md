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

## 6. Imported scope

Recorded after the full import of 14,011 fixtures on 19 August 2026. Gabriel Raz
recorded the import itself in `issue-175-cricsheet-corpus-import.md`; this section
records what the imported corpus contains.

### By classification

| Match type | Team type     | Gender | Fixtures |
| ---------- | ------------- | ------ | -------- |
| T20        | club          | male   | 6,827    |
| T20        | international | male   | 3,521    |
| T20        | international | female | 2,114    |
| T20        | club          | female | 1,229    |
| IT20       | international | male   | 240      |
| IT20       | international | female | 80       |

5,955 international fixtures and 8,056 club fixtures.

### The IT20 classification, confirmed against imported data

Section 10 of the sport domain definition records that `match_type: "IT20"` is not
a reliable filter for international matches. The imported corpus confirms it: 320
fixtures carry `IT20`, all of them international, while a further 5,635
international fixtures carry `T20`. Filtering on `IT20` to mean international
would therefore find 320 fixtures and miss 5,635.

Both classifications were imported faithfully. The risk is not in the import but
in anything that later queries `match_type` to determine whether a fixture is
international. The reliable test is `team_type = 'international'`.

### Divergence from the agreed competition scope

The imported corpus contains **741 competitions**, of which 66 fixtures carry
none.

ADR-003 consequence 4 records the agreed competition scope as eleven franchise
competitions plus men's and women's T20 internationals. What has been imported is
every T20 fixture Cricsheet publishes. This is not a defect in the import: the
downloader was built to acquire the full T20 archive and its scope was never
narrowed to the agreed list.

The team should either amend the recorded scope to describe what is held, or
narrow the imported dataset. This is a decision rather than an omission and is
recorded here rather than resolved.

## 7. Measured storage

The benchmark ADR-003 consequence 4 required has been taken against the imported
corpus and is recorded in that decision record. In summary: 798 MB total, of
which `delivery` accounts for 705 MB — 385 MB of heap and 319 MB of indexes —
or approximately 249 bytes per delivery against the 414 bytes estimated.

## 8. Observations

The database reports PostgreSQL 17.6, while continuous integration runs
`postgres:16` and the disposable test database provisions 16. Three versions are
therefore in play across development, test and continuous integration. Nothing
observed depends on the difference, but it is recorded because a divergence of
this kind has already caused a failure elsewhere in the project.

Submissions total 14,225 against 14,011 fixtures. The 214 additional records are
the limitation recorded in section 5: a submission row is created for every match
processed, including one already present in full.
