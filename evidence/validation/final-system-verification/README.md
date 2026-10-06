# Final System Verification Evidence

This folder contains retained **technical/system verification evidence** for Milestone 4.

It is separate from `evidence/user-testing/`. Do not place participant feedback, facilitator observations
or formal user-testing outcomes here.

The authoritative test catalogue is:

`docs/testing/final-system-verification.md`

Execution is split across:

- #871 — frontend/authentication/roles;
- #872 — submission/review/batch/corrections;
- #873 — statistics/provenance/dataset releases;
- #874 — external API/contracts/consumer controls/integrations;
- #875 — database/worker/reliability;
- #876 — performance/accessibility/responsiveness;
- #877 — automated suites/coverage/CI/deployment.

## Evidence rules

- Record the exact final candidate commit/tag or deployed revision.
- Never retain passwords, bearer tokens, OAuth credentials, API keys or service secrets.
- Do not mark a test `PASS` merely because it passed in an earlier Sprint.
- A failed check should link to the resulting bug/issue.
- After a fix, retain a retest result rather than overwriting the original failure.
- Keep raw command output only where useful; prefer a concise sanitised record linked to the authoritative run.

Use `execution-record-template.md` for new lane records.

## Suggested filenames

- `issue-871-frontend-auth-roles.md`
- `issue-872-ingestion-review-corrections.md`
- `issue-873-statistics-data-releases.md`
- `issue-874-api-integration.md`
- `issue-875-database-worker.md`
- `issue-876-non-functional.md`
- `issue-877-automated-coverage-ci.md`

## AI Declaration

The preceding document was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
