# Issue #592: slow first participant aggregate read after a bulk load

## Summary

`npm run measure:performance` failed its 1,500 ms participant aggregate target because one request
took minutes. The same failure occurs on `main` before any #592 change (49cb137: 1,874,734 ms), at
#592 PR 2 (4a3fa5f: 76,502 ms) and at PR 3 (147,517 ms and 183,703 ms). Every other sample in those
runs was fast.

**Cause:** the first participant aggregate statement runs before PostgreSQL has analysed the freshly
loaded tables. With no statistics, the planner estimates one row for the participant's deliveries
and chooses nested loops. The `participant_delivery` step then joins the 72,000 deliveries of the
participant's 300 fixtures to the participant's 8,174 matched deliveries with a join filter,
re-reading the matched set for every delivery: 588,550,650 rows removed by the join filter,
243,043 ms of execution. The derivation SQL is unchanged by #592; stored aggregates neither cause
nor prevent this.

**ANALYZE removes it:** `ANALYZE` on the involved tables took 732 ms, after which the identical
statement used hash joins and executed in 411 ms, then 403 ms.

## Reproduction (17 September 2026)

A scratchpad harness, not committed, reproduced the benchmark database at PR 3 head (1ebed89) exactly
as `apps/backend/scripts/run-performance-benchmark.ts` builds it: a disposable embedded PostgreSQL
16.14 server with default autovacuum settings (`autovacuum = on`, `autovacuum_naptime = 60`,
`autovacuum_analyze_threshold = 50`, `autovacuum_analyze_scale_factor = 0.1`), all migrations, and
the 300-fixture generated corpus ingested with `ingestMatchData` on one connection. It then, with no
pause:

1. read `pg_stat_user_tables` (`stats-before-first-request.json`);
2. captured `EXPLAIN` (`plan-0-estimated-before-analyze.txt`) and `EXPLAIN (ANALYZE, BUFFERS)`
   (`plan-1-first-request-before-analyze.txt`) of the aggregate statement for participant 1,
   `fictional-perf-player-1`, exactly as the repository issues it (`aggregate-statement.sql`);
3. read `pg_stat_user_tables` again (`stats-after-first-request.json`);
4. ran `ANALYZE delivery, delivery_wicket, delivery_wicket_fielder, fixture_squad, fixture, innings,
submission, person, dismissal_kind` (`stats-after-analyze.json`);
5. captured `EXPLAIN (ANALYZE, BUFFERS)` twice more (`plan-2-after-analyze.txt`,
   `plan-3-after-analyze-repeat.txt`).

| Step                              | Elapsed    | Plan                                          |
| --------------------------------- | ---------- | --------------------------------------------- |
| First request, before any analyze | 243,080 ms | nested loops, join filter over 72,000 × 8,174 |
| `ANALYZE` of the involved tables  | 732 ms     | —                                             |
| Same request after `ANALYZE`      | 450 ms     | hash joins                                    |
| Same request again                | 435 ms     | hash joins                                    |

Elapsed times are measured by the harness around each statement; the plans record execution times
of 243,043 ms, 411 ms and 403 ms.

## Statistics at the moment of the slow request

`stats-before-first-request.json`, read immediately before the first request: `last_analyze` and
`last_autoanalyze` were null for every table involved, including `delivery`, `fixture_squad`,
`innings`, `fixture`, `submission`, `person` and the snapshot tables. `delivery_current` is a view
and has no row in `pg_stat_user_tables`; its plan uses the statistics of `delivery`.

`stats-after-first-request.json`: autoanalyze ran on `person`, `fixture`, `fixture_squad`, `innings`,
`submission`, `delivery` and `participant_statistics_version` at 16:18:52–16:18:53 UTC, about a
minute after the load finished and while the first request was still executing. A plan is fixed when
a statement starts, so that request stayed slow; statements started after autoanalyze are fast,
which is why the benchmark's later samples pass.

## Can this happen in production?

**Yes, in the same circumstance: statements planned between a load that makes a table's statistics
unrepresentative and the next analyze.** Autoanalyze runs a table once its changed rows exceed
50 + 10% of its rows at the last analyze, checked every `autovacuum_naptime`.

- **A corpus import or restore into an empty or much smaller database** is the direct equivalent of
  the benchmark: tables are unanalysed or analysed while tiny, so participant aggregate reads in the
  first minute or so can take minutes. Restores that do not carry planner statistics are included.
- **A large batch publication into an established database** is much less exposed. On the corpus
  database (about 3.2 million deliveries) even a 100,000-delivery publication changes about 3% of
  `delivery`, below the autoanalyze threshold, and the existing statistics still describe the data
  distribution, so the planner should not fall back to one-row estimates. This was not reproduced or
  verified against the hosted database, whose autovacuum settings were not inspected.
- **No statement timeout is configured** in the backend, worker or migrations, so such a request
  would run to completion and hold one of the backend pool's ten connections for its duration.

Running `ANALYZE` on the loaded tables immediately after a bulk import or restore, before serving
reads, removes the slow plan in this reproduction. The investigation itself changed no code. As a
result of it, `measure:performance` now runs `ANALYZE` after its bulk ingest and before any timed
request; import scripts, restore procedures and statement timeouts are unchanged and need a team
decision outside #592.

## AI Declaration

The reproduction, plan capture and this record were produced with the assistance of
Claude-Code[Claude Opus 5].
