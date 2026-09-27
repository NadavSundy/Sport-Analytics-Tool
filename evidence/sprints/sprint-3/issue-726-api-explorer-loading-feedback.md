# Issue #726 - API Explorer loading feedback

## Feedback preserved

Client feedback received on 2026-09-24 reported that API Explorer metadata could render before the
remaining Explorer content. Scrolling during that interval appeared to reveal an unexplained blank
section. The client specifically requested a spinner alongside the existing `Loading API Explorer`
message.

The supplied feedback is retained verbatim in Gitea issue #726. No participant identity, browser
telemetry, or credentials were supplied or recorded for this feedback.

## Root cause and strategy

Code inspection identified two independent deferred stages:

1. React lazily imports the Explorer route module; and
2. the Explorer fetches and parses the backend-owned `/openapi.yaml` document before mounting
   Swagger UI.

Both stages previously communicated only with text. The selected strategy uses one labelled visual
progress indicator for both stages. The route fallback remains a polite status, and the fetched
specification state remains a polite status. When the specification is ready, its indicator is
removed with the loading state; when it fails, the existing alert and retry control replace it.

## Automated evidence

`ApiExplorerPage.test.tsx` holds the delayed specification request open, verifies the named
progress indicator and status, resolves the request, then verifies Swagger renders and the indicator
is removed. The existing failure-and-retry test verifies that a failed request shows the explicit
error state rather than an indefinite loading region.

The existing `tests/e2e/api-explorer.spec.ts` command completed successfully on 2026-09-27 with
the repository's desktop and tagged mobile coverage. The runner did not emit a per-test summary;
no unobserved browser result is inferred from that omission.

## Outstanding verification

No browser-throttling, screenshot, manual desktop/mobile inspection, or stakeholder-retest evidence
has been recorded for this change. Those checks remain required before claiming the corresponding
issue #726 Definition of Done items are complete.

## Links

- Source feedback and acceptance criteria: Gitea issue #726.
- Product behaviour documentation: `docs/api/overview.md`.
- Existing Explorer browser and accessibility coverage: `evidence/validation/issue-661-api-explorer-production-ux.md`.

## AI Declaration

The preceding record was drafted with the assistance of Codex[GPT-5] from the supplied issue text
and repository inspection. It does not claim unperformed stakeholder or browser verification.
