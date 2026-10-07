# Issue #875 — Database, Worker and Asynchronous Reliability Verification

## Metadata

| Field | Value |
| --- | --- |
| Execution issue | #875 |
| Tester | Dean Feldman with Codex assistance |
| Date/time | 2026-10-07 (Africa/Johannesburg) |
| Candidate commit/tag | `ab216b987` local `main` base; local branch `test/875-final-db-worker-verification` |
| Environment | Windows; Node.js v24.13.0; disposable PostgreSQL 16 test runtime |
| API URL | `https://statsthegame-dev-api.calmground-aa50efe2.southafricanorth.azurecontainerapps.io/api/v1` |
| Worker/release context | No public worker ingress by design; deployed worker probe and aggregate-only database checks executed through its managed identity |
| Fixture/package/dataset | Repository deterministic database seed and worker test doubles; deployed database aggregate metadata only |

> No passwords, bearer tokens, OAuth credentials, API keys or service secrets were used or retained.

## Results

| Verification ID | Result (`PASS` / `FAIL` / `BLOCKED` / `N/A`) | Evidence / observation | Linked bug / blocker | Retest |
| --- | --- | --- | --- | --- |
| DB-TECH-01 | PASS | Live `worker.probe` completed after its database dependency check; the public API health URL remains independently unavailable. | — | — |
| DB-TECH-02 | PASS | Disposable PostgreSQL 16 reset, every committed migration, deterministic seed, and database integration suite completed: 38 files passed, 1 skipped; 278 tests passed, 2 skipped. | — | Completed after capturing the runner output to a temporary local log. |
| DB-TECH-03 | PASS | The completed isolated database suite exercised representative constraints and relationships. | — | — |
| DB-TECH-04 | PASS | The completed isolated database suite exercised transactional rollback/consistency coverage. | — | — |
| DB-TECH-05 | PASS | The completed isolated database suite includes representative query-plan/index integration coverage. | — | — |
| DB-TECH-06 | PASS | Aggregate-only deployed database check found 3,207,623 deliveries, 14,020 fixtures, and 4 releases. Release metadata classifies one release as `local` and three as `dev`; all declare `published-accepted-deliveries` scope with 3,207,110 events. | This verifies the deployed dev environment; it does not represent an assertion about a separately named production environment. | â€” |
| WRK-TECH-01 | PASS | Internal status at 2026-10-07T11:34:38Z was `ready`: database up (169 ms); object storage up (5 ms); Service Bus up (59 ms). Earlier dependency-failure logs were transient/historical. | — | — |
| WRK-TECH-02 | PASS | Live probe `109202de-70c9-4b3b-9328-7d704e1f7486` was received; verified worker dependencies; and completed at 2026-10-07T11:36:50Z. | — | — |
| WRK-TECH-03 | BLOCKED | The queue has 19 historical dead-letter messages, but their safe failure reasons and a controlled retry were not captured. | Requires operator review of historical DLQ messages. | Run approved failure/retry procedure without exposing payload data. |
| WRK-TECH-04 | PASS | The final-candidate worker suite (17 files; 125 tests) exercised transient redelivery, already-completed delivery replay, and duplicate dataset-release prevention in its supported integration paths. | â€” | â€” |
| WRK-TECH-05 | PASS | The final-candidate worker suite (17 files; 125 tests) exercised interrupted object cleanup, lease release, and resumed publication on redelivery. No destructive deployed restart was needed. | â€” | â€” |

## Commands / deterministic steps

```text
node node_modules/vitest/vitest.mjs run --config apps/worker/vitest.config.ts apps/worker/tests --pool=threads --maxWorkers=1
  Result: 17 test files passed; 125 tests passed.

npm run test:database
  Result: disposable PostgreSQL 16 started; reset; every committed migration applied; deterministic seed completed.
  Test Files: 38 passed; 1 skipped. Tests: 278 passed; 2 skipped.

Invoke-WebRequest <documented API>/health -TimeoutSec 20
  Result: timed out.

Azure read-only verification
  Result: backend revision `statsthegame-dev-api--0000028` is Running; worker revision
  `statsthegame-dev-batch-worker--0000068` is Healthy/Running; Service Bus namespace is Active.
  Finding: worker logs show object-storage and repeated Service Bus dependency failures; queue has
  19 dead-letter messages. A later internal status was ready with all dependencies up.

Live worker probe
  Result: probe 109202de-70c9-4b3b-9328-7d704e1f7486 was enqueued; received; verified database
  and private Blob dependencies; and completed. Queue remained at 0 active and 19 historical DLQ messages.

Aggregate-only deployed database inventory
  Result: 3,207,623 deliveries; 14,020 fixtures; 4 dataset releases. Release metadata lists one `local`
  and three `dev` releases, each scoped to `published-accepted-deliveries` with 3,207,110 events.
  No application records, message payloads, credentials, or secrets were retrieved.
```

## Untested / partial coverage

This record deliberately does not treat local automated evidence as deployed verification. The live readiness, aggregate-only deployed data inventory, and probe checks passed; deterministic final-candidate worker tests cover the supported idempotency and recovery paths. The safe failure reasons and a controlled retry for the 19 historical dead-letter messages remain unavailable.

## AI Declaration

Codex[GPT-5] prepared this evidence record and matrix update from observed commands only.
