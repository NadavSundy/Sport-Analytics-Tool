# Issue #599 — representative-scale performance re-validation, raw measurement records

This directory holds the raw output of every issue #599 measurement run. The analysis,
targets, environment, deployment topology and before-and-after comparison live in
`evidence/sprints/sprint-3/issue-599-performance-revalidation.md`, which is the record
issue #599 is reported against.

**These are local measurements** taken against a disposable embedded PostgreSQL server
over loopback. They are comparable to the earlier local runs for issues #290, #410 and
#592. They do **not** measure the deployed Azure Container Apps and Cloudflare Pages
topology. See section 1 of the report before quoting any figure here.

## Files

| File                               | Run                                                                                | Produced by                                                                              |
| ---------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `api-response-times-run-1.md`      | The five #289 public operations, run 1 of 3                                        | `npm run measure:performance:local -- --output …`                                        |
| `api-response-times-run-2.md`      | Run 2 of 3                                                                         | as above                                                                                 |
| `api-response-times-run-3.md`      | Run 3 of 3                                                                         | as above                                                                                 |
| `aggregate-snapshots.md`           | Participant aggregate snapshot reads and batch publication throughput              | `npm run measure:aggregate-snapshots --workspace=@sport-analytics/backend -- --output …` |
| `filtered-paginated-reads.md`      | Filtered and deep-paginated public reads                                           | `npm run measure:filtered-reads`                                                         |
| `consumer-enforcement-overhead.md` | API consumer enforcement, paired against the public twin of each read              | `npm run measure:consumer-overhead`                                                      |
| `batch-report-reads.md`            | Authenticated batch report and report download reads                               | `npm run measure:batch-reports`                                                          |
| `dataset-release-generation.md`    | Dataset release generation throughput, with public reads sampled during generation | `npm run measure:release-generation`                                                     |
| `cold-start-observations.md`       | First request per operation after a backend restart                                | documented procedure, `docs/development/performance-baseline.md`                         |
| `query-plans/`                     | `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` output and loop-count assertions         | `RUN_PERFORMANCE_DATABASE_TESTS=1 npm run test:database`                                 |

## Conventions

`scripts/measure-api-response-times.mjs` writes the fixed heading "Issue #289 local
representative-scale measurement" into every file it produces, whatever the output path.
Files produced by that script therefore carry an explanatory preamble above a horizontal
rule; **nothing below the rule is edited**, apart from the Markdown table alignment that
Prettier applies to every file in this repository. No figure is altered.

Every figure in this directory is a **measured figure** under
`docs/development/reference-fixtures.md` section 4.2.

Every run passes an explicit `--output`. Both measurement harnesses default to the path
of an existing committed evidence file, and a defaulted run would overwrite the
historical record this re-validation is measured against.
