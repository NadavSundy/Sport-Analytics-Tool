# AI transcript: Issue #294 versioned dataset releases

## Record scope

This is the reviewed, redacted retained transcript for the Issue #294 Codex session on
9 September 2026. It preserves the user requests, implementation decisions and verification
outcomes relevant to retained repository work. Routine command output and local paths that do not
affect the implementation are summarised; no credentials, tokens or personal data are included.

## User request

> Implement versioned dataset releases, snapshots, field documentation and checksums #294.

The supplied acceptance criteria required a stable identifier and creation metadata, immutable
published/corrected-data snapshots, schema/field documentation, checksums, repeatable retrieval,
API/database tests and reproducibility documentation. The user additionally requested efficient
CI/CD validation, asked that this Codex transcript be added before a push, and authorised pushing
the branch and creating a pull request.

## Codex work retained

Codex implemented and committed `740afdeb` on `feat/294-versioned-dataset-releases`:

- PostgreSQL `dataset_release` records with a database trigger preventing updates and deletes;
- administrator release creation and public metadata/artifact retrieval endpoints;
- canonical JSON artifacts containing ordered, accepted current-delivery data and field
  descriptions, with SHA-256 checksums;
- version reuse that returns the original release instead of regenerating content;
- shared API contracts, API tests, database integration coverage and release documentation.

The snapshot source is `delivery_current` joined to accepted submissions. This excludes pending,
rejected and superseded delivery revisions, so later corrections require a new release version
without altering an earlier artifact.

## Verification retained

- backend type-check passed;
- backend lint passed;
- scoped dataset-release API tests passed: 2 of 2;
- the disposable PostgreSQL suite applied the release migration and passed its database tests,
  including release creation, retrieval, stable reuse and immutability;
- strict MkDocs build and `git diff --check` passed;
- the aggregate workspace test command confirmed backend units at 177 of 177 before the local
  runner stopped returning nested-workspace completion output. Hosted CI was not run.

## Redactions

None required. No credentials, tokens, private keys or personal data were present in the retained
task record.

## Links

- Issue: #294
- Branch: `feat/294-versioned-dataset-releases`
- Implementation commit: `740afdeb`
- Pull request: pending creation at the time this record was committed

## AI declaration

The preceding retained transcript record was prepared with the assistance of Codex[GPT-5].
