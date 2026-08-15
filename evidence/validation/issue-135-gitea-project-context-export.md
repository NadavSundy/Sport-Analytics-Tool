# Issue #135 Gitea project-context export verification

**Date:** 15 August 2026
**Scope:** local repository context for Codex, Claude Code and similar coding agents; complete Gitea
issue and comment export; safe authentication, pagination, replacement and failure handling.

## Implemented outcome

The exporter keeps authentication under developer control and writes a gitignored local snapshot.
Coding agents operating in the checkout can read the source tree directly and use
`gitea-export/ai-project-context.md` or `.json` for checkout identity, a tracked-file index and Gitea
issue context. `AGENTS.md` and `CLAUDE.md` make the generated entry point discoverable without
containing or granting access to a token.

The implementation preserves the original issue outputs and adds:

- `ai-project-context.md`;
- `ai-project-context.json`;
- `repository-files.json`; and
- `repository-files.txt`.

The exporter does not upload context to an AI service, give a token to an agent, modify Gitea, export
Pull Request reviews or duplicate repository source in generated files.

## Static verification

The following checks passed on Windows with Git Bash:

```text
bash -n scripts/gitea-export/export-issues.sh
bash scripts/gitea-export/export-issues.sh --help
git diff --check
npm exec -- prettier --check <changed Markdown and YAML files>
python -m mkdocs build --strict --site-dir test-results/mkdocs-issue-135
```

The installed Windows environment did not include `jq`, so the official jq 1.7.1 Windows binary and
its published checksum were downloaded into the ignored `test-results/` directory for behavioral
testing. The checksum matched before execution. No test binary or mock output is committed.

## Repository pre-Pull-Request checks

The repository structure check, workspace lint, contracts build, all workspace type-checks, OpenAPI
lint and production build passed. The standard non-database test command passed 106 tests across 21
test files:

- 18 backend unit tests;
- 31 frontend tests;
- 34 backend API tests; and
- 23 shared-contract tests.

The root `npm run check` command reached the formatting stage and stopped because the unchanged
`docs/deployment/azure-app-service-recovery.md` file does not currently match Prettier. That unrelated
baseline file was deliberately not reformatted as part of Issue #135. Prettier passed for every file
changed by this issue, and all checks after the root formatting stage were run separately and passed.

## Behavioral verification

A localhost-only mock Gitea REST API was used with a non-secret test token. Its repository listing
returned 50 records on page one and two on page two: 51 issues plus one Pull Request marker. Issue
number 1 returned 51 comments across two pages. The test verified that:

- both issue pages were requested and all 51 issues were exported;
- the Pull Request record was excluded;
- open and closed issues were present;
- a separate detail response and complete description were preserved for every issue;
- all 51 comments for issue 1 were present in JSON and the last comment appeared in Markdown;
- `all-issues-detailed.json`, `issues-all.json`, per-issue JSON and both project-context JSON
  structures parsed successfully;
- the CSV contained 51 data rows, preserved a comma-containing title and reported the exported
  comment count;
- the generated project-context file count agreed with its tracked-file array;
- the test token did not occur anywhere in generated output;
- a second run removed an intentionally added stale output file;
- an invalid token exited non-zero with an HTTP 401 explanation and did not change the prior completed
  snapshot;
- the root `.gitignore` rule matched the generated context; and
- a valid zero-issue response produced valid empty JSON and an explicit Markdown message.

The first Windows test exposed a carriage return left on scalar output by the native Windows `jq`
binary. The script was adapted to normalise these values, after which the paginated and zero-issue
tests passed. The final authentication test also confirmed that streaming the authorization header
to `curl` through standard input was accepted by the mock server.

## Live Wits Gitea validation still required

No real Wits Gitea token was supplied to this development session. The following acceptance checks
must therefore be performed by a team member before Issue #135 is closed:

- run with a valid personal token carrying `read:issue` permission;
- compare the exported count with the live repository's open and closed issue count;
- inspect representative live descriptions and an issue with several comments;
- test a real expired or invalid token and, if available, an insufficiently scoped token; and
- confirm that no generated snapshot appears in normal `git status --short` output.

This record does not claim those live checks have occurred. Gitea remains the source of truth.

## Traceability

- Branch: `feat/135-gitea-project-context-export`
- Implementation commit: `08422fe3a91cd4098adeb2b040b8ca559d6a5165`
- Pull Request: pending Gitea authentication and creation

## AI Declaration

The implementation and this verification record were produced with the assistance of Codex[GPT-5].
