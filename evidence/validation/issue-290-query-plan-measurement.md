# Issue #290 representative query-plan measurement

## Environment and workload

- Local disposable PostgreSQL 16 database.
- The deterministic Issue #289 corpus: 300 fictional T20 fixtures and 72,000
  delivery events.
- Participant-history page selection: 51 fixtures (the API's 50-record page
  plus its cursor probe), containing 12,240 live standard-innings deliveries.
- PostgreSQL command: `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`.

## Before and after

The previous query read `delivery_current`, then ran `DISTINCT ON
(innings_id, over_number, position_in_over)` and an ordering sort. The current
query retains the accepted-submission filter but removes that redundant work:
`delivery_current` is backed by the partial unique `delivery_natural_key_live`
index, so duplicate live natural keys cannot exist.

| Form   |   Rows | Plan-specific nodes                            | Execution time |
| ------ | -----: | ---------------------------------------------- | -------------: |
| Before | 12,240 | `Unique`, `Sort`                               |      32.115 ms |
| After  | 12,240 | neither `Unique` nor its de-duplication `Sort` |      21.082 ms |

The selected workload's database execution time fell by 11.033 ms (34.4%). The
regression test asserts exact delivery-ID equivalence and absence of the
redundant `Unique` plan node. This is a local database-plan measurement; it
does not claim a networked API P95. Rerun the documented API timing procedure
before release to record environment-specific end-to-end targets.

## AI declaration

This query-plan check, query simplification and evidence summary were created
with the assistance of Codex[GPT-5].
