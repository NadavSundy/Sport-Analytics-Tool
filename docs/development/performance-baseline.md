# Representative-scale API performance baseline

Issue #289 defines the reproducible local workload and response-time targets
used for Intermediate performance work. It measures the public API only; it
does not use a browser session, authentication token, production secret, or
private data.

## Workload

Generate a fictional T20 corpus from the repository root:

```bash
npm run data:performance:generate
```

The command deterministically writes 300 Cricsheet-shaped JSON fixtures to
`data/performance/representative-t20/`. Each has two 20-over innings of 120
deliveries, for **72,000 delivery events** in total. The same 22 fictional
players appear across the season, which gives participant-history reads a
realistic multi-fixture shape. The generated files are intentionally ignored:
they are a repeatable local input, not committed test data.

The generator refuses to overwrite a non-empty directory. To use a different
temporary output path or scale, give it explicit arguments:

```bash
npm run data:performance:generate -- --fixtures 300 --output C:/temp/sport-analytics-performance
```

Use only an isolated local or test PostgreSQL database. Import the generated
directory through the existing ingestion path, which preserves the normal
validation and public-read data shape:

```bash
npm run db:import --workspace=@sport-analytics/backend -- C:/temp/sport-analytics-performance
```

`db:import` reads `DATABASE_URL`; never point it at production or place a URL,
password, token, or private dataset in an evidence file. The corpus itself
contains invented teams, venues, names, and identifiers only.

After import, resolve one generated fixture and a participant who appears in
it from the local database, start the local backend, and supply only the
resulting numeric public identifiers to the measurement command.

## Operations and targets

Targets are steady-state local API response-time targets, set before any
optimisation for this issue. They are P95 of ten sequential successful requests
and include the backend-to-database round trip but exclude browser and public
internet latency.

| Representative operation | Request shape                                         | Warm P95 target |
| ------------------------ | ----------------------------------------------------- | --------------: |
| Public read              | `GET /api/v1/fixtures?limit=50`                       |          500 ms |
| Event page               | `GET /api/v1/fixtures/{fixtureId}/events?limit=100`   |          750 ms |
| Statistic                | `GET /api/v1/fixtures/{fixtureId}/statistics`         |        1,500 ms |
| Aggregate                | `GET /api/v1/participants/{participantId}/statistics` |        1,500 ms |
| Export                   | `GET /api/v1/fixtures/{fixtureId}/events/export.csv`  |        1,000 ms |

The statistics endpoint derives fixture, innings, and participant values from
accepted events. The participant-statistics endpoint derives the implemented season, competition and career
aggregates from accepted current delivery revisions. The benchmark requests all aggregate scopes in
one call so the measurement exercises the public Intermediate aggregate path rather than using
fixture history as a substitute. Since issue #467 the export returns every matching event by
following the event collection's cursor at 100 events per page, up to a
5,000-event bound, so an unfiltered export of a fixture with more than 100
events issues one database read per page. The target was set when the export
was a single page and has not been re-set for the complete export.

## Repeatable procedure

For a warm-cache measurement, first start the backend connected to the isolated
database. Then run:

```bash
npm run measure:api-response-times -- \
  --base-url http://127.0.0.1:3000 \
  --fixture-id <generated-fixture-id> \
  --participant-id <generated-participant-id> \
  --samples 10 \
  --output evidence/validation/issue-289-local-measurement.md
```

The script makes one successful database-backed warm-up request and discards it,
then reports P50/P95 for each operation and exits non-zero if a stated target is
missed. It consumes each response body so the timing includes export transfer to
the local client. Commit an output only when its environment and IDs are safe to
publish.

Issue #293 adds a versioned, 60-second PostgreSQL cache-aside layer for the repeated public fixture
statistics operation only. The benchmark should compare the first miss with subsequent same-version
hits; an accepted event, correction, or publication makes an earlier version unreachable before the
next read. Other listed paths remain uncached, except participant aggregates: issue #592 stores
their derived rows per participant and serves them while current (ADR-015).
`npm run measure:aggregate-snapshots --workspace=@sport-analytics/backend` measures reads served from
stored rows, read misses including the synchronous refresh, and batch publication throughput on the
same generated corpus. The measurements that include a live derivation are interleaved
request by request, because derivation cost varies over tens of seconds on a developer host. Both measurements run `ANALYZE` after their bulk ingest and before any timed request: freshly loaded tables have no planner statistics until autoanalyze reaches them, and a participant aggregate request planned before then took minutes (`evidence/validation/issue-592-first-read-plans/`). The first participant read is not timed. It builds the stored rows that row (a) then serves, so it is setup for (a) rather than a sample of it; timing it would put one read miss into the served sample. Read misses are measured on their own in rows (b1) and (b2), each after the stored rows have been made stale.
“Warm” means the backend is running and its retained PostgreSQL pool connection
has been established; PostgreSQL's own buffer state is not forcibly reset.
“Cold” is measured separately: restart the local backend, make no prior
database-backed request, record the first request for each operation as a
startup observation, then restart again before the next operation. Do not mix
cold observations into the warm P95. The previously observed remote database
connection-start penalty means a cold observation is expected to be slower and
has a separate **5,000 ms maximum** target for each successful request.

Run the generator again from an empty directory for every clean baseline. Its
fixed data, counts, and source references make the workload reproducible;
machine specifications, Node version, PostgreSQL version, backend commit, and
database location belong in the generated measurement evidence.

## Additional measured workloads

Issue #599 added three runners for workloads the commands above do not cover. Each
follows the same pattern: a disposable embedded PostgreSQL server, the generated
fictional corpus, and `ANALYZE` before any timed request. Each takes an explicit
output path, and **every run must pass one**: the two older harnesses default to the
path of an existing committed evidence file, so a defaulted run overwrites history.

```bash
npm run measure:public-read-workloads --workspace=@sport-analytics/backend -- \
  --filtered-output evidence/validation/<issue>/filtered-paginated-reads.md \
  --consumer-output evidence/validation/<issue>/consumer-enforcement-overhead.md

npm run measure:batch-and-release-workloads --workspace=@sport-analytics/backend -- \
  --report-output evidence/validation/<issue>/batch-report-reads.md \
  --release-output evidence/validation/<issue>/dataset-release-generation.md

npm run measure:cold-start --workspace=@sport-analytics/backend -- \
  --output evidence/validation/<issue>/cold-start-observations.md
```

| Workload                                            | Target                                                      |
| --------------------------------------------------- | ----------------------------------------------------------- |
| Fixture list under a filter, or a deep cursor page  | P95 ≤ 500 ms                                                |
| Participant fixture history, `?limit=50`            | P95 ≤ 1,500 ms                                              |
| Consumer-authenticated read against its public twin | P95 delta ≤ 100 ms, and within the public twin's own target |
| Batch report read                                   | P95 ≤ 1,500 ms                                              |
| Public reads sampled during release generation      | Their ordinary targets above                                |
| Dataset release generation                          | **No latency target.** Throughput recorded only.            |

Release generation carries no target because it had never been measured. The issue
#599 run recorded 72,000 events in 4,322 ms to 16,236 ms across three runs that
produced byte-identical artefacts, a 3.8x spread whose cause was not isolated. Quote
the range, not a figure, until a dedicated repeat measurement explains the variance.

The consumer delta is measured as a pair, public read then consumer read,
interleaved request by request, and it bounds the enforcement logic rather than its
deployed cost: the middleware adds three database round trips, which cost tens of
milliseconds over loopback and would cost far more against the hosted database.

`measure:cold-start` polls `/api/v1/health`, which does not touch PostgreSQL, so
readiness polling does not establish the pool connection the measurement exists to
time. It covers process start and the first local connection only. It does not cover
an Azure Container Apps cold start, and `infra/azure/backend/main.bicep` sets
`minReplicas` to 0, so a deployed first request after idle also waits for a container
to be scheduled.

## Existing baseline evidence

The first recorded large-corpus baseline is retained in
`evidence/validation/issue-289-representative-scale-baseline.md`. It is based on
the prior measured corpus of 14,011 fixtures and 3,207,109 deliveries, and is
therefore a stronger scale check than the local synthetic workload. It records
results before performance optimisation and distinguishes initial connection
behaviour from warm API timings.

## Query-plan regression check

Issue #290 adds an opt-in PostgreSQL regression check for the representative
corpus.

> **Do not run this check with the full database suite.**
> `RUN_PERFORMANCE_DATABASE_TESTS=1` combined with `npm run test:database` **causes
> unrelated tests to fail.** Every file in the database suite shares one disposable
> PostgreSQL server and Vitest runs files in parallel, so this check's 300-fixture,
> 72,000-delivery ingest lands in the same database as tests that did not create
> those rows. The isolated command below is the only supported way to run it.

### Supported command

Generate the corpus first, then run the check against a database **nothing else is
using**, from `apps/backend`:

```powershell
$env:NODE_ENV = 'test'
$env:DATABASE_URL_TEST = '<an isolated PostgreSQL 16 database nothing else is using>'
$env:RUN_PERFORMANCE_DATABASE_TESTS = '1'
npm.cmd run db:test:reset
npm.cmd run db:test:migrate
npx.cmd vitest run tests/database/performance-query-plans.database.test.ts
```

Set `PERFORMANCE_PLAN_OUTPUT` to a file path to retain the first test's plan
comparison as JSON. **The directory must already exist**; the test writes the file
but does not create the directory.

`compose.test.yml` defines one suitable database on `127.0.0.1:55432`. Any other
isolated PostgreSQL 16 instance works equally well. The issue #599 run used a
disposable embedded server started for that single file; the form of the database
does not matter, only that no other test is using it.

### Why the combined command fails

Issue #599 ran the combined command twice and it failed **differently each time** —
once on an assertion returning nulls, once on two five-second timeouts in
`tests/database/public-events.database.test.ts` at lines 460 and 501, both in tests
that page published events. Differing symptoms across runs is what identifies this as
a race rather than a defect in either test.

| Run                                                       | Result                                                |
| --------------------------------------------------------- | ----------------------------------------------------- |
| `npm run test:database`, flag unset                       | 32 files passed, 1 skipped; 233 passed, 2 skipped     |
| `npm run test:database`, flag set, first run              | 2 files failed, 31 passed; 2 tests failed, 233 passed |
| `npm run test:database`, flag set, second run             | 1 file failed, 32 passed; 2 tests failed, 233 passed  |
| Performance file alone, own disposable database, flag set | 1 file passed; 2 tests passed                         |

If you have run the combined command and seen a failure elsewhere in the suite,
**that is this interference, not a regression.** Re-run the suite with the flag unset
to confirm it is clean, then run the check in isolation.

Fixing this properly means giving the opt-in check its own database or forcing the
suite sequential. Both are changes to shared test infrastructure and belong in their
own issue. `evidence/validation/issue-599/query-plans/README.md` records the detail.

### What the check proves

It imports the 300-fixture corpus, then compares the old and current
participant-history delivery selection using
`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`, proving that both forms return the same
live delivery IDs. The current query relies on the `delivery_current` invariant: its
partial unique natural-key index already admits one live delivery per innings, over
and position. It therefore must not add a second `DISTINCT ON` and sort over those
same keys.

The second test plans the statement `listParticipantFixtures` actually issues and
asserts a **loop count, not a duration**: zero repeated scans of the materialised
`accepted_delivery` set beneath a `SubPlan`. A loop count is stable across machines
in a way an elapsed time is not.

The API timing command above remains the authoritative response-time target
measurement. The query-plan check is complementary database evidence and does not
substitute for a networked API measurement.

## AI Declaration

This performance-baseline procedure, generator-command documentation and target
table were created with the assistance of Codex[GPT-5]. The repeated fixture-statistics cache
measurement procedure was updated with the assistance of Codex[GPT-5].
The Issue #297 aggregate performance procedure was reviewed and updated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
The issue #592 stored participant aggregate references were added with the assistance of Claude-Code[Claude Opus 5].
The issue #599 additional workload commands, their targets, and the query-plan isolation
note were added with the assistance of Claude-Code[Claude Opus 5].
