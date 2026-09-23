# Issue #599 query-plan and index-use evidence

Produced on 23 September 2026 against commit `c599939`, on the host recorded in
section 2 of `evidence/sprints/sprint-3/issue-599-performance-revalidation.md`.

The check is `apps/backend/tests/database/performance-query-plans.database.test.ts`,
an opt-in test enabled by `RUN_PERFORMANCE_DATABASE_TESTS=1`. It reads the committed
corpus path `data/performance/representative-t20` and asserts on
`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` output.

Both tests **pass**.

## 1. Redundant de-duplication removed from the participant-history delivery selection

`delivery-selection-plan.json` is the unmodified `PERFORMANCE_PLAN_OUTPUT` of the first
test.

| Form   |   Rows | Plan-specific nodes                            | Execution time |
| ------ | -----: | ---------------------------------------------- | -------------: |
| Before | 12,240 | `Unique`, `Sort`                               |      89.989 ms |
| After  | 12,240 | neither `Unique` nor its de-duplication `Sort` |      66.324 ms |

Both forms return identical delivery IDs, which the test asserts before comparing plans.
The current form is 26.3% faster on this run.

Issue #290 recorded the same comparison as 32.115 ms against 21.082 ms, a 34.4%
reduction. The **absolute** figures here are about 2.8 times higher and the **relative**
improvement is smaller. Neither is a regression in the query. The #290 figures were
taken on a different host and a different PostgreSQL instance, and the property the
test actually pins — that the current form returns the same rows without a `Unique`
node and executes faster than the form it replaced — holds in both runs. An
`EXPLAIN ANALYZE` execution time is not comparable across hosts; the node set is.

The current form depends on the `delivery_current` invariant: its partial unique
natural-key index `delivery_natural_key_live` already admits only one live delivery per
innings, over and position, so a second `DISTINCT ON` over those same keys is
redundant work rather than a correctness measure.

## 2. No repeated scan of the materialised delivery set

The second test captures the statement `listParticipantFixtures` actually issues, rather
than restating it, and plans that. Result:

```json
{ "endpointStatementExecutionMs": 287.909, "acceptedDeliveryScans": 3 }
```

- Repeated scans of `accepted_delivery` beneath a `SubPlan`: **0** — the assertion the
  test pins.
- Every `CTE Scan` of `accepted_delivery`: `Actual Loops` = 1, so the set is built once
  and read once per reference.

Issue #410 measured the defective form at 51 and 102 loops, 845.5 ms of an 889.5 ms
plan. The invariant that replaced it still holds.

The assertion is a **loop count, not a duration**, deliberately: a loop count is stable
across machines in a way an elapsed time is not. The 287.909 ms figure is recorded as an
observation, not as a pass condition.

## 3. Finding: the documented command does not run cleanly

`docs/development/performance-baseline.md` documents this check as:

```powershell
$env:RUN_PERFORMANCE_DATABASE_TESTS = '1'
npm run test:database
```

On this host, at this commit, **that command fails** — not in the performance test, but
in unrelated database tests that the performance test runs alongside.

| Run                                                       | Result                                                          |
| --------------------------------------------------------- | --------------------------------------------------------------- |
| `npm run test:database`, flag unset                       | 32 files passed, 1 skipped; 233 tests passed, 2 skipped. Clean. |
| `npm run test:database`, flag set, first run              | 2 files failed, 31 passed; 2 tests failed, 233 passed.          |
| `npm run test:database`, flag set, second run             | 1 file failed, 32 passed; 2 tests failed, 233 passed.           |
| Performance file alone, own disposable database, flag set | 1 file passed; **2 tests passed**.                              |

The symptom differs between the two flagged runs, which is itself the evidence that this
is a race rather than a deterministic failure. The first run failed on an assertion, a
`toEqual` over event IDs that returned a list of nulls. The second failed on two
five-second timeouts in `tests/database/public-events.database.test.ts`, at lines 460 and
501, both in tests whose first statement is
`createDatasetReleaseRepository(...).loadPublishedEventPage(...)`.

The cause is a shared database, not a defect in either test. `run-database-tests.ts`
starts **one** disposable PostgreSQL server for the whole suite, and Vitest runs test
files in parallel by default. The performance test's `beforeAll` ingests 300 fixtures
and 72,000 deliveries into that same database. A test elsewhere in the suite then either
sees rows it did not create, or issues a query that now has to scan those rows and
exceeds Vitest's five-second default timeout.

### 3.1 A performance observation inside the interference

The timeout is worth separating from the test-isolation problem. The two tests that
timed out both page published events through
`DatasetReleaseRepository.loadPublishedEventPage`, which is the read that dataset release
generation streams. Against the seeded fixtures alone that call returns well inside five
seconds; with 72,000 additional deliveries present it does not.

That is a signal about release generation at representative scale, not a proof: these
tests were running concurrently with a 300-fixture bulk ingest, so contention is a
plausible part of the cost, and `ANALYZE` had not necessarily run on the freshly loaded
tables. The issue #599 dataset-release generation measurement records that path
deliberately, on a quiet database with statistics present, rather than inferring a figure
from a timed-out test.

This is reported rather than fixed. Making the opt-in check safe alongside the suite
means either giving it its own database or forcing the suite sequential, and both are
changes to shared test infrastructure that belong in their own issue with their own
review. For issue #599 the check was run in isolation, which is what the figures above
record.

Every figure in this directory is a **measured figure** under
`docs/development/reference-fixtures.md` section 4.2.
