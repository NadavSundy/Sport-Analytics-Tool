# Issue #44 authorisation verification

**Date:** 12 August 2026
**Scope:** account synchronization, current-user profile, administrator policy,
approved-submitter policy, competition scope, and public-read regression coverage.

## Commands and results

```powershell
npm.cmd run build --workspace=@sport-analytics/contracts
npm.cmd run typecheck --workspace=@sport-analytics/backend
```

Result: passed.

```powershell
npm.cmd run test:api --workspace=@sport-analytics/backend
```

Result: 4 test files passed; 23 tests passed.

```powershell
npm.cmd run test:unit --workspace=@sport-analytics/backend
```

Result: 4 test files passed; 13 tests passed.

```powershell
npm.cmd run lint --workspace=@sport-analytics/backend
npm.cmd run openapi:lint
```

Result: passed. The OpenAPI check reported the repository's one explicitly ignored baseline rule.

```powershell
npm.cmd test
```

Result: passed all 84 repository unit, frontend, API, and contract tests across 16 test files.

```powershell
python -m mkdocs build --strict --site-dir <temporary-directory>
```

Result: passed. The generated site was written outside the repository.

```powershell
npm.cmd run db:test:migrate --workspace=@sport-analytics/backend
```

Result: not run to completion because the configured isolated PostgreSQL service at
`127.0.0.1:5433` was not running and Docker was unavailable. The command stopped on connection
refusal before applying any schema change. Gitea CI supplies PostgreSQL 16, resets and migrates the
test database, and runs database integration tests for the Pull Request.

## Covered authorization cases

- anonymous request;
- invalid and expired token;
- normal authenticated viewer;
- disabled application account;
- approved in-scope submitter;
- approved out-of-scope submitter;
- administrator; and
- anonymous public-read endpoints that do not invoke authentication.

No real access token, user credential, or production identity was used or recorded.

## Documentation and evidence updated

- root project status and local endpoint guidance;
- OpenAPI profile contract and API overview;
- authentication, security, architecture, database, ERD, testing, and sport-scope documentation;
- ADR-004 dated implementation note;
- MkDocs navigation and AI-evidence guidance; and
- Dean Feldman's per-member AI usage register.

## AI declaration

This verification record was generated with the assistance of Codex[GPT-5.6 Sol].
