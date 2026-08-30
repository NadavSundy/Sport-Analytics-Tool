# Issue #273 Basic accessibility and responsive-design audit

**Date:** 2026-08-30  
**Branch:** `test/273-accessibility-responsive-audit`

## Purpose

Audit the completed Basic user journeys for accessibility and responsive behaviour across public,
submitter, administrator, correction and export workflows.

The audit combines automated Playwright/Axe coverage with manual keyboard, browser-zoom and
representative mobile-width checks. Serious or critical product findings must be fixed or tracked
separately with rationale.

## Automated audit baseline

### Dedicated accessibility suite

Command:

```text
npx.cmd playwright test tests/e2e/accessibility.spec.ts
```

Result:

```text
2 passed
```

The suite verifies the public and authentication pages in both configured Playwright projects and
checks both day and night themes for serious or critical Axe accessibility violations.

### Representative Basic journeys

Command:

```text
npx.cmd playwright test tests/e2e/public-browsing.spec.ts tests/e2e/statistics.spec.ts tests/e2e/submissions.spec.ts tests/e2e/admin-users.spec.ts tests/e2e/corrections.spec.ts
```

Result:

```text
24 passed
```

These tests execute in desktop Chromium and the Pixel 7 Chromium project.

Existing regression coverage includes:

- anonymous public browsing, filtering, pagination and keyboard navigation;
- responsive statistics and calculation-trace pages;
- keyboard activation of calculation-trace and CSV export controls;
- JSON and CSV export behaviour;
- submitter keyboard workflow;
- focus transfer after accepted and rejected submissions;
- `aria-invalid` and `aria-describedby` validation relationships;
- administrator approval, re-scoping and revocation;
- keyboard-driven event correction;
- focus transfer after correction success and rejection;
- horizontal-overflow assertions; and
- serious/critical Axe checks on representative authenticated workflows.

## Manual audit

### Public homepage and browsing

The homepage was manually checked at desktop width with keyboard-only interaction.

Verified:

- navigation and primary actions are reachable with `Tab`;
- visible keyboard focus is present;
- links activate with `Enter`;
- the native day/night checkbox receives focus and activates with `Space`;
- no content overlap or clipping was observed; and
- no unexpected horizontal scrolling was observed.

The homepage was then checked at 200% Chrome browser zoom.

Verified:

- content remained readable;
- interactive controls remained reachable;
- no overlapping or disappearing controls were observed; and
- no unexpected horizontal overflow was observed.

Representative public pages were also checked at a Pixel 7-style mobile width of approximately
412 px:

- homepage;
- fixtures;
- competitions;
- seasons;
- competitors; and
- participants.

No clipping, overlapping controls, unreadable text or unexpected horizontal scrolling was observed.

### Statistics and filtered export

A published fixture statistics journey was opened through the normal public interface and followed
through to a calculation trace.

Verified:

- the responsive statistics layout remained usable;
- calculation-trace content remained readable;
- export controls remained visible;
- CSV export completed successfully;
- JSON export completed successfully;
- controls remained reachable from the keyboard; and
- no layout or horizontal-overflow problem was observed at the audited widths.

The statistics/export journey was also checked at 200% browser zoom without a serious layout or
interaction issue being observed.

## Authenticated journey coverage

Submitter, administrator and correction journeys are exercised by the passing Playwright regression
suite.

The automated checks cover keyboard interaction, focus management, validation associations,
responsive overflow and serious/critical Axe violations where applicable.

An additional attempt was made to observe the authenticated workflows using Playwright `--headed`.
The browser did not start because the local Windows Application Control policy blocked Playwright's
managed Chromium `chrome.dll`.

Representative error:

```text
Failed to load Chrome DLL ... An Application Control policy has blocked this file. (0x11C7)
```

This was classified as a local headed-browser environment limitation rather than a product defect:
the same committed submitter, administrator and correction specifications passed successfully in the
normal Playwright desktop/mobile runs.

No product change was made in response to this local environment restriction.

## Acceptance-criteria traceability

| Acceptance criterion                                                                                          | Evidence / outcome                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public, submitter, administrator and correction/export journeys are checked                                   | Public and export journeys were checked manually and automatically. Submitter, administrator and correction journeys passed the dedicated desktop/mobile Playwright regression selection.                                                                      |
| Keyboard navigation, focus visibility, labels, status/error communication and semantic structure are reviewed | Manual public/export keyboard checks passed. Existing E2E assertions verify keyboard activation, focus transfer, labelled controls, validation relationships and status/error focus. Axe regression checks provide additional semantic accessibility coverage. |
| Representative narrow mobile and desktop layouts are verified                                                 | Public pages were manually checked at desktop and approximately 412 px mobile width. The selected Playwright journeys also passed in desktop Chromium and Pixel 7 Chromium.                                                                                    |
| Browser zoom and horizontal overflow are checked                                                              | Homepage and statistics/export were manually checked at 200% browser zoom. Existing E2E tests assert no horizontal overflow on representative public, submitter, administrator, correction and statistics workflows.                                           |
| Serious/critical findings are fixed or explicitly tracked with rationale                                      | No serious or critical product accessibility/responsive finding was identified during this audit. The headed-mode Windows Application Control failure is an environment limitation and not a product defect.                                                   |
| Regression tests are added where practical                                                                    | Existing regression coverage already directly exercises the required keyboard, focus, Axe, responsive and overflow behaviours. No duplicate test was added where equivalent coverage already existed.                                                          |
| Audit evidence is retained and linked from testing documentation                                              | This file is retained under `evidence/validation/` and is linked from `docs/development/testing.md`.                                                                                                                                                           |

## Findings summary

| ID          | Area                          | Finding                                                                                  | Severity               | Decision                                                                          |
| ----------- | ----------------------------- | ---------------------------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------- |
| A11Y-273-01 | Headed Playwright observation | Windows Application Control blocks Playwright managed Chromium when run with `--headed`. | Environment limitation | No product change. Normal desktop/mobile Playwright runs pass the same workflows. |

No serious or critical product accessibility or responsive-design defect was discovered.

## Outcome

The completed Basic journeys satisfy the Issue #273 audit scope based on the combined automated and
manual evidence gathered on 2026-08-30.

No production fix was required during this audit.

## AI Declaration

The audit planning, evidence structure, coverage review and documentation were produced with the
assistance of ChatGPT-Web[GPT-5.6 Sol].
