# Issue #515: bowling extras breakdown

**Date:** 2026-09-13
**Tool:** Codex (GPT-5)

## Work recorded

Codex inspected the repository contribution, testing and Git-methodology guidance; fetched
`origin/main`; and created `feat/515-add-bowling-extras-breakdown` from that revision. The
configured Gitea Git remote was reachable for fetching, but its issue API and web route returned
not-found responses, and the local issue export predated #515. The implementation scope was
therefore confirmed against the issue title and the project’s Sprint 2 P03 usability evidence,
which explicitly identifies wides and no-balls as bowler-attributable and leg-byes as team extras.

The resulting change exposes backend-derived `wides` and `noBalls` on fixture player figures,
participant fixture history and participant aggregates. It keeps byes, leg-byes and innings-level
penalty runs out of bowling figures, and updates the shared contracts, OpenAPI description,
responsive player UI and regression coverage.

## Verification recorded

Focused contract, backend derivation/API and frontend tests passed. Full frontend (165 tests),
backend (220 unit and 167 API tests), contracts (138 tests), lint, typecheck, OpenAPI validation,
build and desktop/mobile focused Playwright coverage passed. The disposable PostgreSQL test runner
could not start because Node reported `uv_os_get_passwd ENOMEM`; no database test executed in that
environment. The focused Playwright test used an isolated port after existing processes occupied
the normal preview ports.

## Commit

- `f6c97bf` — `feat(statistics): add bowling extras breakdown`

No credentials, tokens, cookies, or private links are included in this record.

## AI Declaration

This evidence record was prepared with the assistance of Codex[GPT-5].
