# Issue #499 — Plain-language submission validation

**Date:** 2026-09-11
**Tool:** ChatGPT-Web
**Model:** GPT-5.6 Sol
**Developer:** Shayna Unterslak
**Branch:** `feat/499-plain-language-submission-errors`
**Base:** `af5e014` (`main` from the uploaded latest repository bundle)

## User request and approved design

The user selected Issue #499, **“ux: present submission validation failures in plain language”**, after completing Issue #480. The approved design was to keep the backend validation contracts unchanged while improving the frontend presentation of immediate submission failures and completed batch-report failures.

The agreed UX rules were:

- show readable cricket field names instead of raw schema paths such as `runs.total`;
- explain what the user should check or correct;
- use the same formatting rules for immediate submission validation and batch-report validation;
- keep rule codes and raw schema paths available in a collapsed **Technical details** disclosure for debugging/support;
- preserve unknown backend failures safely rather than hiding them;
- add unit/component and Playwright coverage; and
- document the user-facing rule in the existing submission UX design documentation.

## Repository review

The latest repository bundle was inspected before implementation. On `main` at `af5e014`:

- `SubmissionPage.tsx` displayed raw validation field paths such as `Event 1 — runs.total`;
- `BatchReportsPage.tsx` displayed rule codes such as `EVENT_SCHEMA_INVALID` directly in the main report copy;
- batch report source labels exposed raw JSON paths;
- local technical-JSON schema validation could surface Zod-style text such as `Invalid uuid`;
- the API and batch contracts already carried enough structured detail to improve copy without changing backend contracts.

## Implementation

A shared frontend helper, `submission-validation-copy.ts`, was added to centralise validation copy. It:

- maps common cricket/schema fields to readable labels (`runs.total` → `Total runs`, `eventId` → `Event identifier`);
- handles nested/indexed paths and falls back to a humanised field name for unknown paths;
- rewrites common schema diagnostics such as `Expected number, received string` into plain instructions;
- gives known batch rule codes readable labels and next-step guidance;
- falls back to a generic **Validation problem** label for unknown rule codes while preserving the original code in technical details.

`SubmissionPage.tsx` now leads with readable validation locations/messages and hides codes/raw paths under **Technical details**. Local technical-JSON schema failures use the same formatter.

`BatchReportsPage.tsx` now:

- presents a **What needs attention** summary using readable rule labels;
- uses readable source field labels;
- appends actionable guidance to batch error messages; and
- keeps original rule codes, JSON paths and backend messages available under collapsed technical details.

The frontend styles were extended for the validation summary and keyboard-focus/overflow handling of technical details.

## Tests added or updated

Coverage was added/updated for:

- field-path humanisation;
- plain schema-diagnostic conversion;
- local technical-JSON schema failures;
- immediate API validation with readable event/row field labels;
- batch-report rule summaries and actionable messages;
- preservation of technical rule codes/paths;
- readable source labels; and
- the Playwright submitter journey for immediate and asynchronous validation feedback.

## Documentation

`docs/design/information-architecture-and-wireframes.md` now records that submission validation must lead with readable fields and corrective guidance, while technical identifiers remain available on demand.

## Verification performed in the ChatGPT sandbox

The sandbox could not complete `npm ci` because DNS access to `registry.npmjs.org` failed with `EAI_AGAIN`, so the project Vitest/Playwright/Prettier dependencies were unavailable there.

The following checks were completed instead:

- `git diff --check` — passed;
- standalone TypeScript check of `submission-validation-copy.ts` with a minimal contract type declaration — passed;
- Node 22 TypeScript-stripping smoke checks for the formatter — 7/7 passed;
- parser-level TypeScript inspection of changed TS/TSX files found no syntax diagnostics (dependency-resolution errors were expected because dependencies were unavailable).

Full repository verification (`npm run hygiene`, `npm run check`, focused frontend tests and Playwright) is intentionally left for the student's local repository where dependencies are installed.

## AI declaration

The preceding evidence record was generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
