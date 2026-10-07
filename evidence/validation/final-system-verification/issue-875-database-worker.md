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
| Worker/release context | No public worker ingress by design; no Azure operator credentials or live probe authority provided |
| Fixture/package/dataset | Repository deterministic database seed and worker test doubles only |

> No passwords, bearer tokens, OAuth credentials, API keys or service secrets were used or retained.

## Results

| Verification ID | Result (`PASS` / `FAIL` / `BLOCKED` / `N/A`) | Evidence / observation | Linked bug / blocker | Retest |
| --- | --- | --- | --- | --- |
| DB-TECH-01 | PASS | Live `worker.probe` completed after its database dependency check; the public API health URL remains independently unavailable. | — | — |
| DB-TECH-02 | PASS | Disposable PostgreSQL 16 reset, every committed migration, deterministic seed, and database integration suite completed: 38 files passed, 1 skipped; 278 tests passed, 2 skipped. | — | Completed after capturing the runner output to a temporary local log. |
| DB-TECH-03 | PASS | The completed isolated database suite exercised representative constraints and relationships. | — | — |
| DB-TECH-04 | PASS | The completed isolated database suite exercised transactional rollback/consistency coverage. | — | — |
| DB-TECH-05 | PASS | The completed isolated database suite includes representative query-plan/index integration coverage. | — | — |
| DB-TECH-06 | BLOCKED | No authorised production dataset inventory or test/demo classification was available. | Production data access unavailable. | Obtain sanitised operator inventory. |
| WRK-TECH-01 | PASS | Internal status at 2026-10-07T11:34:38Z was `ready`: database up (169 ms); object storage up (5 ms); Service Bus up (59 ms). Earlier dependency-failure logs were transient/historical. | — | — |
| WRK-TECH-02 | PASS | Live probe `109202de-70c9-4b3b-9328-7d704e1f7486` was received; verified worker dependencies; and completed at 2026-10-07T11:36:50Z. | — | — |
| WRK-TECH-03 | BLOCKED | The queue has 19 historical dead-letter messages, but their safe failure reasons and a controlled retry were not captured. | Requires operator review of historical DLQ messages. | Run approved failure/retry procedure without exposing payload data. |
| WRK-TECH-04 | BLOCKED | Deterministic idempotency coverage passed, but live redelivery was not exercised. | No live redelivery authority. | Execute documented redelivery probe. |
| WRK-TECH-05 | BLOCKED | Deterministic interruption/recovery coverage passed, but no deployed restart exercise was authorised. | No worker restart authority. | Execute documented graceful and abrupt recovery procedures. |

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
```

## Untested / partial coverage

This record deliberately does not treat local automated evidence as deployed verification. It contains no production data inventory/classification, safe reasons for the 19 historical dead-letter messages, controlled retry/redelivery, or restart recovery evidence. The current live readiness and probe checks passed.

## AI Declaration

Codex[GPT-5] prepared this evidence record and matrix update from observed commands only.
