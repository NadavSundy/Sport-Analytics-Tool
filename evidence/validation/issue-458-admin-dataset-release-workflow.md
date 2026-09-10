# Issue #458 administrator dataset-release workflow verification

**Date:** 10 September 2026

**Scope:** administrator discovery, role-gated release creation, immutable-publication warning,
shared-contract version validation, authenticated submission, accessible feedback, public follow-up
links and responsive browser verification.

## Implemented workflow

An authenticated administrator can open **Publish dataset release** from the Account page and use:

```text
/admin/dataset-releases/new
```

The page checks the backend-owned current-user role before exposing the form. The form validates its
version with `datasetReleaseVersionSchema` and invokes the existing handwritten endpoint exactly
once while its action is pending:

```http
POST /api/v1/admin/dataset-releases
```

Before submission, the interface identifies publication as an immediate, immutable and public
action. A successful response shows the stable version, creation time, event count and checksum,
then links to the public release detail, JSON artefact and catalogue. Validation and retryable request
failures preserve the entered version.

## Security and accessibility

- Signed-out users are redirected to sign in.
- Signed-in non-administrators receive an accessible denial state before the form is rendered.
- The existing backend administrator guard remains authoritative and the request uses the existing
  authenticated frontend client.
- Invalid input is associated with the labelled version field and focus moves to the alert summary.
- Success and request failures move focus to their status or alert region.
- The pending action is disabled to prevent accidental duplicate submission.

## Automated verification

The focused component run passed 19 tests across the administrator release page, unchanged public
release pages and Account-page administrator actions. The complete frontend suite passed 134 tests
across 18 files. Frontend lint, typecheck and the production build passed. The repository-wide
`npm run check` quality gate also passed, including structure, formatting, every workspace linter and
typecheck, 690 database-independent tests, OpenAPI validation and every production build.
The strict MkDocs build passed for the changed published documentation.

The focused Playwright specification used intercepted API responses rather than a shared release
environment. Both configured projects passed:

```text
desktop-chromium: passed
mobile-chromium (Pixel 7): passed
```

The journey started on the Account page, followed the administrator-only action, asserted one
authenticated creation request, and confirmed that the returned release appeared in the public
catalogue. Both projects checked for horizontal overflow and serious or critical Axe findings.

No static screenshots are retained because the deterministic desktop and mobile browser journey
captures the same responsive and accessibility evidence without publishing mocked release data as a
product screenshot.

## Documentation

The information architecture, dataset-release usage and testing guidance now describe the new
frontend workflow. The OpenAPI and backend API documentation were not changed because issue #458
reuses the existing endpoint without changing its contract or authorization boundary.

## Review status

Independent human review and a linked Pull Request remain pending.

## AI declaration

The implementation and this verification record were generated and tested with the assistance of
Codex[GPT-5.6 Sol].
