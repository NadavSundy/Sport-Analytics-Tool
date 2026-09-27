# Issue #610 AI assistance evidence

## Scope and gap

Codex[GPT-5] inspected #610, #594, #598 and #612 in Gitea. #610 is assigned to GabeRaz;
#594 is closed. #598 is still an open Intermediate acceptance gate, but work proceeded under the
user's explicit instruction. #612 remains open and requires genuine deployed user testing before
#610 can close.

The smallest missing capability was a consumer-authenticated, bounded aggregate over existing
consumer-key infrastructure. The implementation adds `GET /api/v1/consumer/usage`, normalized
request telemetry, a stable safe key identifier, and no administrator read path.

## Verification actually performed

| Command | Outcome |
| --- | --- |
| `npm.cmd exec vitest run --workspace=@sport-analytics/backend -- tests/api/consumer-usage.test.ts` | Red: 2 tests failed with `404` before implementation. |
| `npm.cmd exec vitest run --workspace=@sport-analytics/backend -- tests/api/consumer-usage.test.ts tests/api/api-consumers.test.ts` | Passed: 16 tests. |
| `npm.cmd run test:contract --workspace=@sport-analytics/backend` | Passed: 73 tests. |
| `npm.cmd run openapi:lint` | Passed. |
| `npm.cmd run lint` | Passed. |
| `npm.cmd run typecheck` | Backend completed successfully; the command's remaining workspace output was interrupted by the local runner before a final aggregate result. |
| `npm.cmd run build` | Started successfully but the local runner interrupted it during dependency preparation; no full-build pass is claimed. |
| `npm.cmd exec vitest run --workspace=@sport-analytics/backend -- tests/database/api-consumers.database.test.ts` | Passed: 1 test after a Docker-backed isolated PostgreSQL reset, migration and seed. |
| `git diff --check` | Pending final pre-commit check. |

## Privacy and performance review

Telemetry is limited to consumer ID, safe key ID, timestamp, normalized method/route template and
status class. It excludes raw keys, key hashes, request/response bodies, headers, raw URL and
query parameters. The read uses two fixed set-based database queries (one total and one grouped
page), with a maximum 31-day range and 100 aggregate groups; it does not make per-row queries.

## References

- Issue: #610
- Branch: `feat/610-api-usage-per-consumer`
- Gap analysis: `docs/validation/issue-610-api-usage-gap-analysis.md`
- Actual model/tool attribution: Codex[GPT-5]
- Implementation commit: `3839a7fe` (`feat(api): expose consumer usage`).
- Database verification was supplied by the user from the isolated Docker test database; the
  `20260927180000000_api-consumer-request-usage` migration applied before the passing test.
