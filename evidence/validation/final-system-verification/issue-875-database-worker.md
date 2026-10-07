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
| DB-TECH-01 | BLOCKED | Documented public `/health` request timed out after 20 seconds; the follow-up database-backed read was not attempted. | Deployed API did not respond from this environment. | Requires a responding deployed candidate. |
| DB-TECH-02 | PASS | Disposable PostgreSQL 16 reset, every committed migration, deterministic seed, and database integration suite completed: 38 files passed, 1 skipped; 278 tests passed, 2 skipped. | — | Completed after capturing the runner output to a temporary local log. |
| DB-TECH-03 | PASS | The completed isolated database suite exercised representative constraints and relationships. | — | — |
| DB-TECH-04 | PASS | The completed isolated database suite exercised transactional rollback/consistency coverage. | — | — |
| DB-TECH-05 | PASS | The completed isolated database suite includes representative query-plan/index integration coverage. | — | — |
| DB-TECH-06 | BLOCKED | No authorised production dataset inventory or test/demo classification was available. | Production data access unavailable. | Obtain sanitised operator inventory. |
| WRK-TECH-01 | BLOCKED | Local `health.test.ts` passed (2 tests); deployed worker status is internal only. | No Azure operator access. | Inspect deployed `/health/status` through approved operator path. |
| WRK-TECH-02 | BLOCKED | Worker suite passed 17 files / 125 tests, but no live Service Bus probe was authorised. | No live queue sender/receiver evidence. | Run `worker.probe` and retain safe logs. |
| WRK-TECH-03 | BLOCKED | Deterministic worker failure/retry coverage passed, but no controlled deployed failing job was authorised. | No live failure fixture. | Execute approved failure fixture. |
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
```

## Untested / partial coverage

This record deliberately does not treat local automated evidence as deployed verification. It contains no production database inventory, worker readiness response, Service Bus message receipt, live failure/retry/redelivery, or restart recovery evidence. Those checks require approved Azure/operator access and a responding deployed API.

## AI Declaration

Codex[GPT-5] prepared this evidence record and matrix update from observed commands only.
