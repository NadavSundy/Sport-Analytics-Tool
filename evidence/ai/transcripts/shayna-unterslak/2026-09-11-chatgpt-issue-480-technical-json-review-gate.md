# Issue #480 — technical JSON review gate

**Date:** 2026-09-11  
**Tool:** ChatGPT-Web  
**Model:** GPT-5.6 Sol

## User request

Fix issue #480 so Advanced technical JSON cannot let an ordinary submitter bypass the staged batch review/publication workflow, while following the repository's Git and project methodology.

## Assistance provided

- Reviewed the existing submission UI, direct submission API, batch upload API, batch reference resolver, worker canonicalisation, repository methodology, and AI-attribution requirements.
- Routed ordinary submitter technical JSON through `POST /batches` by converting canonical direct-submission events to the maintained batch package shape.
- Added explicit `app:*` application-reference resolution for fixture, innings and participant IDs, scoped to the declared competition/fixture/squad.
- Preserved supplied technical UUIDs when `app:delivery:<uuid>` is canonicalised by the worker.
- Restricted the legacy synchronous `/submissions` and `/submissions/uploads` endpoints to administrators, while leaving direct correction routes available to submitters in scope.
- Preserved the existing administrator direct-import/correction workflow as an explicitly privileged path.
- Updated frontend/backend regression tests and submission API documentation.

## Verification performed in this session

- `npm run typecheck --workspace=@sport-analytics/frontend --if-present` — passed.
- `git diff --check` — passed.
- Broader workspace tests/typechecks could not be completed in this isolated copy because the dependency installation remained incomplete; missing development type packages and `vitest` were reported. This is recorded as a verification limitation rather than treated as a pass.

The implementation must still pass the repository's normal `npm run hygiene`, `npm run check`, database tests, and CI before merge.
