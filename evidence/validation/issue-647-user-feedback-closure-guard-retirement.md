# Issue #647 — User-Feedback Closure Guard Retirement

## Purpose

Issue #647 refines the Sprint 3 user-testing dependency model so that Gitea dependencies represent genuine technical/process prerequisites. Dedicated user-feedback issues #601–#607 and #612 remain required validation/evidence work, but their open/closed state no longer automatically blocks otherwise-complete implementation issues from closing.

## Change summary

The dedicated issue-closure automation was retired by removing:

- `.gitea/workflows/user-feedback-closure-guard.yml`;
- `scripts/ci/enforce-user-feedback-closure-gate.mjs`; and
- `scripts/ci/enforce-user-feedback-closure-gate.test.mjs`.

No other Gitea workflow was modified. The normal Pull Request quality gate, unit/integration/E2E routing, coverage, documentation, contract, security and deployment workflows remain in place.

Current user-testing documentation now distinguishes:

- **technical/process dependency** — a genuine prerequisite that may block implementation completion; and
- **user-feedback task** — a separate representative-user validation/evidence activity that records findings and can create or reopen implementation work when action is required.

Any `Cannot Begin Until` text retained on the Sprint 3 user-feedback issues is treated as a testing-readiness checklist, not a reverse Gitea dependency or implementation-closure rule.

## Historical evidence

`evidence/sprints/sprint-3/2026-09-15-planning.md` retains the original 15 September closure-gate model and includes a dated 17 September Issue #647 refinement. The earlier process is therefore preserved rather than silently rewritten.

## Local verification

The following verification was run against the Issue #647 working copy on 17 September 2026:

| Check                                                                                           | Result                   |
| ----------------------------------------------------------------------------------------------- | ------------------------ |
| Closure workflow/script/test are absent                                                         | PASS                     |
| Active process/testing docs contain no old implementation-closure dependency rule               | PASS                     |
| All unrelated `.gitea/workflows/*` files match the uploaded pre-change repository byte-for-byte | PASS                     |
| `node scripts/check-required-files.mjs`                                                         | PASS — 39 required files |
| `node --test tests/ci/*.test.mjs`                                                               | PASS — 63/63 tests       |
| Guard-name reference scan outside retained historical/AI/#647 validation evidence               | PASS                     |

The artifact environment could not complete `npm ci` within its execution window, so repository-wide Prettier/build/application suites were not claimed locally. The hosted Pull Request quality gate remains the authoritative final CI verification after push.

## Hosted verification to retain on the Pull Request

After push, retain evidence that:

1. the normal **Sport Analytics CI / quality (pull_request)** status runs successfully;
2. no user-feedback closure-guard workflow runs;
3. an implementation issue with no genuine remaining dependency can remain closed while its related user-feedback issue is still open; and
4. #601–#607/#612 remain open/usable independently for task-based testing and findings.

## AI Declaration

The preceding validation record was planned, generated, reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
