# Issue #430 — published match statistics fail to load on fixture detail pages

## Scope

Fixture 5 (Thailand vs Singapore, ACC Eastern Region T20, 2019/20) was reported as intermittently
failing to render its published statistics, in two distinct observed states:

1. the section's error state — "Match statistics could not be loaded / Published match statistics
   could not be requested"; and
2. an entirely blank statistics section, with no error state at all.

Every figure below is a **measured figure** under `docs/development/reference-fixtures.md` §4.2.

## What was measured against the deployed environment

Deployed frontend
`https://statsthegame-web-dev-dngxgqb2esbudsce.southafricanorth-01.azurewebsites.net/fixtures/5`.
The API base URL compiled into that build is
`https://statsthegame-api-dev-eecff5bbfjbyhbb2.southafricanorth-01.azurewebsites.net/api/v1`, read
from the deployed bundle rather than assumed.

`GET /api/v1/fixtures/5/statistics`, 2026-09-10, 33 requests, **every one HTTP 200** with the
correct payload. Thirty-one carry a timing:

| Condition                                                    | Requests | Response time     |
| ------------------------------------------------------------ | -------: | ----------------- |
| First call of the session, after an overnight container idle |        1 | 25.00 s           |
| First call after a gap in traffic of 13–31 minutes, app warm |        4 | 1.10 s – 2.61 s   |
| Warm, cache miss                                             |        3 | 1.01 s – 1.51 s   |
| Warm, cache hit                                              |       23 | 0.275 s – 0.492 s |

Only **one** container cold start was observed, at the start of the session. The application stayed
warm afterwards across every subsequent gap, including one of 31 minutes, so the 25.00 s figure is a
single observation and not a distribution. Two probe runs overlapped during the session and each
kept the other's intended idle windows warm; the 1.10 s – 2.61 s band above is therefore a
first-call-after-a-gap figure, not a cold start. It is consistent with the 1.3 s – 1.6 s remote
PostgreSQL connection cost that `evidence/validation/issue-369-idle-backend-latency.md` measured.

`GET /api/v1/fixtures/5/statistics/{statisticId}?includeContributors=true` returned 200 in
0.66 s – 0.81 s across three requests, with 124 contributing events.

Page-shaped bursts — the four requests the fixture detail page issues (`/fixtures/5`,
`/fixtures/5/weather`, `/fixtures/5/statistics`, `/participants?fixtureId=5`) fired concurrently —
returned 200 for every request across 14 bursts, including bursts issued after gaps of 13 and 27
minutes. Across both probe logs, 61 of 61 requests returned 200.

The deployed page was also loaded in a real Chromium instance. It rendered the known-good figures:
Singapore 139 runs from 124 accepted events, Thailand 96 from 122, 2 innings totals, 21 player
statistics, calculation-trace links present. No console errors, no page errors, all four API
requests 200.

**No request to the deployed environment failed during this investigation.** The reported failure
did not reproduce on demand. The findings below are therefore about failure paths established in
the code and demonstrated in controlled tests, not about a captured deployed failure. Backend logs
were not available: no Azure credentials are present in this working copy.

The known-good figures were also confirmed directly in the database used by the deployed API:
fixture 5 is published from an accepted submission, has two standard innings, and carries 124 and
122 accepted deliveries respectively.

## Hypothesis 1 — the fixture-statistics cache (#286/#293): disproved as the cause

- **A miss does not return empty.** `read()` returns `{ dataVersion, value: null }` when no live
  entry exists, and `derive` falls through to `loadSource` and derivation. A missing fixture row
  returns `null`, which is the existing 404 path.
- **State is not shared across requests.** The cache is a database table. The only in-process state
  is the memoised cache object, which holds the shared pool and no per-request data.
- **Cold behaviour is a plain miss** followed by derivation and one write.
- **Invalidation is correct.** `advanceFixtureStatisticsCacheVersions` advances the authoritative
  version and deletes entries in the same transaction as an accepted direct submission, correction
  or batch publication. The version is part of the key, so a prior entry is unreachable even if
  deletion does not complete. A reader that derived under the old version cannot write under the
  new one: the write's `WHERE` clause requires the version it read to still be current.
- The deployed cache table confirms this in practice: entries exist only per fixture and version,
  every one carrying `data_version = 0` because no accepted event write has advanced a version
  since the migration.
- The deployed endpoint returns the exact known-good figures on the cold first call, on warm misses
  and on cache hits, and the response validates against `fixtureStatisticsResponseSchema`.

The cache is not producing wrong or empty results. One real defect it introduced is recorded under
"Cause B" below.

## Hypothesis 2 — cold-start latency against a client-side timeout: disproved

**The frontend has no request timeout.** `requestPublicApi` passes only the caller's `AbortSignal`
to `fetch` and sets no timer. This was confirmed in the source and in the deployed JavaScript
bundle, which contains no `AbortSignal.timeout` and passes `signal: n ?? null`.

The one observed deployed cold first response was measured at **25.00 s and succeeded with the
correct payload**. There is no client-side bound for it to exceed, and none of the 33 statistics
requests failed. The #410 figures (9,978 ms and 19,199 ms) were not
carried across: they were local and for the participant-aggregate endpoint, as
`evidence/validation/issue-410-reproduced-baseline.md` records.

A cold start is a real effect on this deployment and it does make the page slow. It is not what
makes the statistics section fail.

## Cause A — an unbounded wait for a database connection (symptom 2's class)

`5d14c4f` (issue #369, 2026-09-04) rewrote the pool configuration. Its own evidence document,
`evidence/validation/issue-369-idle-backend-latency.md`, records the fix as:

```ts
max: options.max ?? 10,
min: 1,
connectionTimeoutMillis: 10_000,
idleTimeoutMillis: 30_000,
```

What landed in `apps/backend/src/database/pool.ts` was:

```ts
min: 1,

idleTimeoutMillis: 30_000,
```

`max` is harmless — `pg-pool` defaults it to 10. `connectionTimeoutMillis` is not. Without it
`pg-pool` installs no connection timer at all, in `newClient` or when waiting for a free slot, so a
request that cannot obtain a connection **never fails**: it waits indefinitely.

Demonstrated against a TCP server that accepts the connection and never answers the PostgreSQL
startup message:

| Pool configuration                          | Outcome                                        |
| ------------------------------------------- | ---------------------------------------------- |
| As shipped in `5d14c4f`                     | still pending after 20,007 ms                  |
| As #369's evidence document records the fix | rejected after 10,021 ms, "connection timeout" |

A request that never terminates never reaches the interface's error state. `usePublicData` only
leaves its loading state when the promise settles, so the reader is given no error, no reason and
no retry. This is the failure class the acceptance criteria name.

**The existing regression test did not guard this.** `apps/backend/tests/unit/database-pool.test.ts`
asserted `min`, `max` and `idleTimeoutMillis` and passed throughout — `max` passing only because
`pg-pool` supplies the same default. It never asserted the connection bound, which is how the
removal reached the deployed environment.

The fixture-statistics read path is the most exposed endpoint on the fixture detail page: since
#293 it performs four pool acquisitions per request (cache read, fixture and innings query, delivery
query, cache write) where `/fixtures/{id}` performs one.

## Cause B — a disposable cache failing an authoritative read (symptom 1's class)

`derive` awaited `cache.write` on the request's critical path and let its rejection propagate. Any
cache-side failure — a transient database error, a constraint violation, contention — therefore
turned a fixture that had been **fully and correctly derived** into an HTTP 500, which the section
renders as "Match statistics could not be loaded". The same applied to `cache.read`: a cache read
failure failed the request instead of falling through to the authoritative path.

This contradicts the module's own documented model, in which "PostgreSQL delivery rows remain
authoritative; cache rows are disposable".

One concrete way the write can fail: `cacheKey` is built from the raw path parameter, which is
validated only as `/^\d+$/`. `/fixtures/05/statistics` produces the key `…:fixture:05:v0` while the
row for the same fixture and version is keyed `…:fixture:5:v0`. The insert conflicts on
`UNIQUE (fixture_id, data_version)`, which the statement's `ON CONFLICT (cache_key)` arbiter does
not cover, and raises `23505`. That path is contrived; the class of failure it demonstrates is not.

**The existing coverage did not reach this.** The service unit tests injected a fake cache whose
read and write always succeed, so a failing cache was never exercised. The API tests stub the
statistics service entirely. No test ran the cache's SQL against a database at all.

## What was not established

The reported failure was not reproduced against the deployed environment during this
investigation, and no server-side log was available. Cause A and Cause B are failure paths proved
in the code and in controlled tests; which of them produced the specific occurrences recorded in
#430 is not established. A literally blank statistics section is not reachable from the section's
own request states — those are exhaustive, and a hung request leaves it showing "Loading match
statistics" — so the blank state must come from a failure to display, which is what Cause C covers.

## Cause C — no error boundary anywhere in the frontend (symptom 2, demonstrated)

The application mounts no error boundary. An exception raised while displaying the statistics
unmounts the entire React root. Demonstrated with a contract-valid response — `apiIdentifierSchema`
is `z.string().min(1)`, so an identifier the record links cannot encode passes validation and makes
`encodeURIComponent` raise `URIError: URI malformed` inside `StatisticCard`. The rendered document
becomes:

```html
<body>
  <div />
</body>
```

An entirely blank page: no statistics, no error state, no retry, and the rest of the match overview
gone with it. This is the second reported symptom exactly.

## Changes

| Change                                                                                         | Cause |
| ---------------------------------------------------------------------------------------------- | ----- |
| Restore `connectionTimeoutMillis: 10_000` and the explicit `max` to the pool                   | A     |
| A failed cache read falls through to derivation; a failed write never fails a derived response | B     |
| The statistics section carries an error boundary and shows the failure reason                  | C     |

Deliberately not changed: `usePublicData` is shared by every public browse page, so its
abort-swallowing behaviour was left alone rather than altered for one section; and the deep-link
`/fixtures/{id}/statistics` page was left without a boundary of its own. Both are outside the
reported symptom. The deep-link page has the same exposure to Cause C and is worth a separate
issue.

## Coverage added

| Test                                                                                                                                                              | What it would have caught             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `database-pool.test.ts` — the connection bound is configured                                                                                                      | The dropped setting                   |
| `database-pool.test.ts` — a stalled connection rejects rather than pending forever                                                                                | The behaviour itself                  |
| `fixture-statistics.service.test.ts` — a failing cache read still derives                                                                                         | Cause B                               |
| `fixture-statistics.service.test.ts` — a failing cache write still returns statistics                                                                             | Cause B                               |
| `fixture-statistics.database.test.ts` — the cache's own SQL, cold miss through hit, contract-validated after its jsonb round trip, invalidated by version advance | An untested cache                     |
| `StatisticsPages.test.tsx` — a transport failure reports an actionable error with its reason                                                                      | Rejected fetches, previously untested |
| `StatisticsPages.test.tsx` — a failure to display keeps an actionable section                                                                                     | Cause C                               |

Each new test was confirmed to fail against the unchanged code.

## Verification

| Suite                                  | Result                                                  |
| -------------------------------------- | ------------------------------------------------------- |
| Backend unit and API                   | 153/153 passed                                          |
| Backend database (embedded PostgreSQL) | 145 passed, 2 skipped, 1 pre-existing unrelated failure |
| Frontend                               | 127/127 passed, three consecutive runs                  |
| Type-check, lint, Prettier             | passed                                                  |
| `hygiene:knip`, `hygiene:dependencies` | passed                                                  |

The pre-existing database failure is `public-events.database.test.ts` "creates and retrieves an
immutable checksum-backed published-data release", failing on a `dataset_release.format_version`
not-null constraint. It fails identically before these changes and belongs to the 2026-09-09
dataset-release work.

`hygiene:architecture` could not run: dependency-cruiser does not support the Node 25 runtime in
this working copy. Docker was not available, so the disposable PostgreSQL suite ran through the
repository's `embedded-postgres` runner instead.

Deployed verification of the **changed** code was not possible: these changes are not deployed. The
deployed environment was measured only as it currently stands, as recorded above.

## AI Declaration

This investigation, its measurements, the changes and this record were produced with the assistance
of Claude-Code[Claude Opus 5] and Claude-Web[Claude Opus 5].
