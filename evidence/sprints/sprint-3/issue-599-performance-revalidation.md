# Issue #599 — Sprint 3 representative-scale performance re-validation

## 1. Scope and what these figures are not

Every measurement in this record was taken **locally, against a disposable embedded
PostgreSQL 16 server on the measuring host**, with the backend reached over loopback.
The figures are directly comparable to the previous local runs recorded for issues
#290, #410 and #592, because they use the same generator, the same corpus size, the
same harnesses and — in the case of #592 — the same host profile.

**They do not measure the deployed topology.** Sprint 3 moved the backend API to Azure
Container Apps (#563) and the frontend to Cloudflare Pages (#564). Nothing in this
document exercises that topology, its network path, or its Supabase-hosted database.

The gap between the two is large and already on record. A warm public read in this
document costs single-digit milliseconds over loopback to an embedded server on the
same machine. The equivalent warm read from a locally running backend to the team's
hosted development database was measured at **183 ms**
(`evidence/validation/issue-369-idle-backend-latency.md`, quoted in
`evidence/validation/issue-289-representative-scale-baseline.md`), and its first
request after start-up at **2,863 ms**. That is roughly a **36x** difference on the
warm path, before any Container Apps cold start, replica scheduling or public-internet
latency is added.

A figure in this document is therefore evidence that **a code path does or does not do
unnecessary work at representative data volume**. It is not evidence of deployed
response time. Read this section before quoting any number outside this file.

### 1.1 Deployed acceptance remains pending

Issue #565 defines the deployed production-scale acceptance procedure
(`docs/deployment/production-scale-acceptance.md`). Its evidence record,
`evidence/sprints/sprint-3/issue-565-production-scale-deployment-acceptance.md`, is at
the time of writing a **baseline smoke only**: backend health with CORS and the two
static frontend routes are recorded as passing on 2026-09-22 16:23 UTC, and every other
row — the asynchronous release lifecycle, public reads during generation, artifact
checksum, recovery and duplicate safety, and all capacity, replica and CPU signals — is
`pending`. Its own conclusion reads "Pending a live run."

**Issue #599 does not include a deployed re-run.** It could not: the runner requires a
deployed API and worker, a deployed frontend origin and a short-lived administrator
bearer token, none of which are available to a local measurement session. Deployed
acceptance remains outstanding under #565 and is not discharged by anything here.

## 2. Build and environment under measurement

| Field                 | Value                                                                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository commit     | `c5999394476235120aa77dcd2aa244eeb9bbd585`                                                                                                           |
| Branch                | `test/599-sprint-3-performance-baseline`, from `main` at the same commit                                                                             |
| Working tree          | Clean at the start of every run                                                                                                                      |
| Host operating system | Windows 11, `win32` 10.0.26200                                                                                                                       |
| CPU                   | Intel Core 7 150U, 12 logical processors                                                                                                             |
| Memory                | 16 GB                                                                                                                                                |
| Node.js               | v25.9.0                                                                                                                                              |
| npm                   | 11.12.1                                                                                                                                              |
| PostgreSQL            | Embedded PostgreSQL 16 (`embedded-postgres` 16.14.0-beta.17, `@embedded-postgres/windows-x64`), disposable and non-persistent, on the measuring host |
| `pg` client           | 8.22.0                                                                                                                                               |
| Express               | 4.22.3                                                                                                                                               |
| TypeScript            | 5.5.4                                                                                                                                                |
| Vitest                | 4.1.11                                                                                                                                               |

This host profile is identical to the one recorded in the #592 evidence of 2026-09-17
(win32, Node v25.9.0, 12 logical CPUs, 16 GB), which makes the #592 rows the closest
available before-figures for a like-for-like comparison.

## 3. Test dataset

| Field                  | Value                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| Generator              | `scripts/generate-representative-corpus.mjs`, run by `npm run data:performance:generate`          |
| Fixtures               | **300**                                                                                           |
| Deliveries per fixture | 240, as two 20-over innings of 120                                                                |
| Total delivery events  | **72,000**                                                                                        |
| Participants           | 22 fictional players, appearing across the whole season                                           |
| Content                | Entirely fictional teams, venues, names and identifiers. No production, private or personal data. |
| Determinism            | Fixed. The generator refuses to write into a non-empty directory.                                 |

The corpus size is deliberately unchanged from issues #290, #410 and #592. Changing it
would have made every prior local result incomparable, which is the opposite of what a
re-validation is for.

### 3.1 A stated limitation of this corpus

All 300 fixtures belong to **one competition, one season and two teams**. A read
filtered by `competitionId` or `seasonId` therefore selects the entire corpus, and is a
**worst-case** filter measurement rather than a selective one. Only `startDateFrom` and
`startDateTo` are genuinely selective, because the generated dates span about eleven
months.

This limitation is recorded rather than engineered around. Extending the generator to
produce multiple competitions would have improved one secondary measurement at the cost
of comparability with every previous run.

## 4. Deployment topology

The table below is drawn **from the repository only**. Azure Bicep defines what a
deployment would provision; it is not evidence of what is live.
`docs/deployment/overview.md` makes the same point: "Repository definitions are not
evidence that a live Azure deployment has succeeded."

| Component              | Hosting                                                          | Sizing and replicas                                                                                                                 | Source                                                                               |
| ---------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Frontend               | Cloudflare Pages, static                                         | Not applicable                                                                                                                      | `docs/deployment/overview.md`; `docs/deployment/frontend-cloudflare-pages.md` (#564) |
| Backend API            | Azure Container Apps, `statsthegame-dev-api`                     | cpu `0.5`, memory `1Gi`; `minReplicas` default `0`, `maxReplicas` `1`                                                               | `infra/azure/backend/main.bicep` lines 53–61, 213–218                                |
| API health probes      |                                                                  | Startup 2 s delay / 5 s period / 12 failures; Liveness 5 / 15 / 3; Readiness 5 / 10 / 3 with a 5 s timeout, all on `/api/v1/health` | `infra/azure/backend/main.bicep` lines 186–212                                       |
| Worker                 | Azure Container Apps, `statsthegame-dev-batch-worker`            | cpu `0.5`, memory `1Gi`; `minReplicas` default `0`, `maxReplicas` default `3`, parameter bound `5`                                  | `infra/azure/worker/main.bicep` lines 33–42, 276–281                                 |
| Worker autoscale       |                                                                  | KEDA `azure-servicebus` rule on queue `batch-ingestion`, `messageCount: 1`, `pollingInterval: 15`, `cooldownPeriod: 60`             | `infra/azure/worker/main.bicep` lines 279–297                                        |
| Durable job delivery   | Azure Service Bus, **Standard** tier                             | Queue `batch-ingestion`, peek-lock                                                                                                  | `infra/azure/worker/main.bicep` line 100; `docs/deployment/azure-worker.md`          |
| Container registry     | Azure Container Registry, **Basic**                              | —                                                                                                                                   | `infra/azure/worker/main.bicep` line 89                                              |
| Log Analytics          | `PerGB2018`                                                      | —                                                                                                                                   | `infra/azure/worker/main.bicep` line 68                                              |
| Database               | Supabase-hosted PostgreSQL, session-pooler URL through Key Vault | **Tier, instance size, region and connection limit: unknown**                                                                       | `docs/deployment/overview.md`; `docs/deployment/azure-worker.md`                     |
| Managed authentication | Supabase Auth                                                    | —                                                                                                                                   | `docs/deployment/overview.md`                                                        |
| API region             | `southafricanorth`, inferred from the published API FQDN         | —                                                                                                                                   | `docs/deployment/overview.md`                                                        |

### 4.1 Explicitly unknown

Not evidenced in the repository, and therefore not stated: the Supabase database tier,
instance size, region or connection limit; the deployed PostgreSQL server version; the
replica counts, CPU and memory actually observed under load; and whether `minReplicas`
is `0` in the live deployment or overridden at deploy time. The #565 capacity table,
which would carry the observed figures, is `pending` throughout.

### 4.2 Finding: the API replica cap may no longer be necessary

`infra/azure/backend/main.bicep` constrains the API to a single replica, and says so
deliberately in two parameter descriptions:

- `minReplicas` — "Scale to zero while idle; maxReplicas remains one to preserve
  process-local rate-limit semantics." Bounded `@minValue(0) @maxValue(1)`.
- `maxReplicas` — "Keep at one until shared rate-limit state is implemented." Bounded
  `@minValue(1) @maxValue(1)`, so the cap cannot be raised by passing a parameter; the
  Bicep itself would have to change.

That rationale was accurate when it was written. It appears to have been overtaken by
Sprint 3. Issue #595 added shared rate-limit state in migration
`database/migrations/20260919100000000_api-consumer-shared-rate-limits.sql`, which
creates the `api_consumer_minute_usage` table, and
`apps/backend/src/modules/api-consumers/consumer-authentication.ts` now consumes the
rate limit through `repository.consumeRateLimit(...)` against that shared table rather
than from process-local memory.

If rate-limit state is now shared in the database, the stated reason for pinning the API
to one replica no longer holds, and a single 0.5-CPU replica is a throughput ceiling and
a single point of failure that the infrastructure no longer needs to accept.

**This is reported, not acted on.** Issue #599 is a measurement exercise, changing
infrastructure to improve a measurement is out of scope, and the interaction between
shared rate limiting and horizontal scaling needs its own issue, its own review and a
deployed test. It is recorded here so that it is not lost.

## 5. Targets, stated before measurement

These targets were written down and committed before any figure in this document was
produced. That ordering is the point: a target chosen after seeing the result is not a
target.

### 5.1 Carried forward unchanged

From `docs/development/performance-baseline.md` (#289) and the #592 harness. Unchanged
so that comparison against the prior local runs remains valid.

| Operation                                             | Target         |
| ----------------------------------------------------- | -------------- |
| `GET /api/v1/fixtures?limit=50`                       | P95 ≤ 500 ms   |
| `GET /api/v1/fixtures/{fixtureId}/events?limit=100`   | P95 ≤ 750 ms   |
| `GET /api/v1/fixtures/{fixtureId}/statistics`         | P95 ≤ 1,500 ms |
| `GET /api/v1/participants/{participantId}/statistics` | P95 ≤ 1,500 ms |
| `GET /api/v1/fixtures/{fixtureId}/events/export.csv`  | P95 ≤ 1,000 ms |
| Any cold first request after backend start            | ≤ 5,000 ms     |
| Participant aggregate snapshot reads, all rows        | P95 ≤ 1,500 ms |
| Deployed season-scale batch publication (#364, #540)  | ≤ 15 minutes   |

The deployed season-scale target is listed for completeness. It is **not** re-measured
here; see section 1.1.

### 5.2 Newly stated for issue #599

Each new target is set at the same tier as the closest existing operation, because a
first measurement should not invent a bar that no prior evidence supports.

| Workload                                                     | Target                                                                        |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Filtered fixture list, `?competitionId=`                     | P95 ≤ 500 ms                                                                  |
| Filtered fixture list, `?startDateFrom=` and `?startDateTo=` | P95 ≤ 500 ms                                                                  |
| Deep cursor page, the last page of the 300-fixture set       | P95 ≤ 500 ms                                                                  |
| Participant fixture history, `?limit=50`                     | P95 ≤ 1,500 ms                                                                |
| Consumer-authenticated read against its public twin          | Delta P95 ≤ 100 ms, and the consumer read within its public twin's own target |
| Batch report read                                            | P95 ≤ 1,500 ms                                                                |
| Dataset release generation over the 72,000-event corpus      | **No latency target.** Wall-clock and events per second recorded only.        |
| Public reads sampled while a release generation runs         | Each within its section 5.1 target                                            |

Two of these deserve their reasoning stated.

**Consumer enforcement** is measured as a _paired delta_ rather than an absolute,
because `createConsumerAuthentication` adds three database round trips per request
(`findActiveConsumer`, `consumeRateLimit`, `consumeDailyQuota`) on top of whatever the
underlying read costs. Over loopback to an embedded server, those three round trips
should cost tens of milliseconds. A materially larger delta is a finding, and pairing
the two reads in one run removes host drift from the comparison.

**Dataset release generation** carries no target because it has never been measured, at
any scale, in any recorded evidence. Publishing a first measurement against an invented
bar would produce a pass or a fail that means nothing. It is recorded as throughput, the
same treatment `evidence/validation/issue-592-aggregate-snapshot-performance.md` gives
batch publication.

## 6. Run plan

1. Record the build, environment and dataset above. _(This section, completed before any
   run.)_
2. `measure:performance:local` — the five #289 operations, **three runs**, each with an
   explicit `--output`.
3. `measure:aggregate-snapshots` — snapshot reads and batch publication throughput, 20
   samples, explicit `--output`.
4. Query-plan regression with `RUN_PERFORMANCE_DATABASE_TESTS=1` and
   `PERFORMANCE_PLAN_OUTPUT` set.
5. Filtered and paginated public reads.
6. API consumer enforcement overhead, as a paired delta.
7. Batch report reads.
8. Dataset release generation throughput, with public reads sampled concurrently.
9. Cold-start observations, per the documented procedure.
10. Compare every result against the prior evidence in section 7, and investigate
    anything slower.

**Every harness invocation passes an explicit `--output`.** Both measurement harnesses
default to the path of an existing committed evidence file:
`run-performance-benchmark.ts` to `evidence/validation/issue-290-local-measurement.md`,
and `measure-aggregate-snapshots.ts` to
`evidence/validation/issue-592-aggregate-snapshot-performance.md`. Running either
without `--output` would silently overwrite the historical record this re-validation is
measured against.

Note also that `scripts/measure-api-response-times.mjs` writes the fixed heading
"Issue #289 local representative-scale measurement" into every file it produces,
whatever the output path. The #410 and #592 evidence handles this by placing an
explanatory preamble above a horizontal rule and leaving the generated text untouched
below it. The #599 evidence files follow the same convention: nothing below the rule is
edited.

## 7. Prior results this run is compared against

Local, 300 fixtures and 72,000 deliveries, P95 in milliseconds, the five #289
operations:

| Run                                                 | Date          | Commit           | fixtures | events | fixture statistics | participant aggregate | CSV export |
| --------------------------------------------------- | ------------- | ---------------- | -------: | -----: | -----------------: | --------------------: | ---------: |
| `issue-290-local-measurement.md`                    | c. 2026-09-07 | not recorded     |     23.0 |   24.6 |               25.3 |        3,843.2 — fail |       13.2 |
| `issue-410-reproduced-baseline.md`                  | 2026-09-08    | `5b750e5`        |     21.9 |   32.8 |               43.8 |        9,978.5 — fail |       26.7 |
| `issue-410-post-change-measurement.md`              | 2026-09-08    | #410 applied     |     24.0 |   22.7 |               56.4 |                 567.5 |       17.6 |
| `issue-410-post-merge-measurement.md`               | 2026-09-08    | #410 plus `main` |     20.7 |   26.9 |               40.3 |                 256.2 |       13.5 |
| `issue-592-performance-benchmark-before-analyze.md` | 2026-09-17    | `1ebed89`        |     13.0 |   18.9 |               40.9 |      147,517.1 — fail |      254.7 |
| `issue-592-performance-benchmark-after-analyze.md`  | 2026-09-17    | `0ac4fe0`        |     14.8 |   31.7 |               45.2 |                 257.3 |       90.6 |

The `before-analyze` row is not a product regression. It records a defect in the
_harness_: timed requests were issued against freshly bulk-loaded tables that had no
planner statistics yet, and the resulting plan took minutes. The diagnosis is in
`evidence/validation/issue-592-first-read-plans/`, and the same failure reproduced on
`main` at `49cb137` at 1,874,734 ms. Both harnesses now run `ANALYZE` after ingest and
before any timed request. The `after-analyze` row is the closest comparable
before-figure for this re-validation.

Participant aggregate snapshot reads and batch publication throughput, from
`evidence/validation/issue-592-aggregate-snapshot-performance.md`, 2026-09-17T19:00:35Z,
20 samples, same host profile:

| Read                                            |  P50 |   P95 |
| ----------------------------------------------- | ---: | ----: |
| (a) served from current snapshot                |  2.8 |   4.5 |
| (b1) read miss after a version advance          | 94.2 | 121.2 |
| (b2) read miss with no stored rows              | 96.2 | 128.6 |
| reference: live derivation only                 | 89.4 | 139.0 |
| fixture statistics, unchanged per-fixture cache |  3.2 |   3.8 |

| Publication scenario                          | Deliveries | Deliveries/s | Chunk P95 |
| --------------------------------------------- | ---------: | -----------: | --------: |
| one batch                                     |      1,000 |      1,562.5 |     103.5 |
| two concurrent batches, shared participants   |      2,000 |      2,578.2 |      76.3 |
| two concurrent batches, disjoint participants |      2,000 |      2,634.9 |      91.7 |

Query plans: `evidence/validation/issue-290-query-plan-measurement.md` records 12,240
rows at 32.115 ms with a redundant `Unique` and sort, and 21.082 ms without, a 34.4%
reduction. `evidence/validation/issue-410-participant-history-plan.md` records the
SubPlan re-scan of the materialised `accepted_delivery` set at 51 and 102 loops,
845.5 ms of an 889.5 ms plan, which the current structural assertion pins at zero
repeated scans.

Deployed, for context only and not re-measured here:
`evidence/acceptance/issue-540-season-scale-publication.md`, 2026-09-15, PR #556 and
`b68158c`, 70 fixtures and 16,713 events, validation 4m27s and publication 3m37.235s
against a 15-minute target.

## 8. Results

_Pending. Populated by the runs listed in section 6, each committed as it completes._

## 9. Measured facts, assumptions and unknowns

_Pending. Completed once the results in section 8 are in._

## AI Declaration

The issue #599 re-validation plan, target statement, evidence structure and the
measurement runners added for this issue were produced with the assistance of
Claude-Code[Claude Opus 5]. Every figure recorded in this document is a **measured
figure** under `docs/development/reference-fixtures.md` section 4.2, produced by the
command named alongside it. No figure is estimated, extrapolated, or copied from an
unstated source.
