# Issue #274 Basic security, privacy and dependency audit

> **Follow-up (2026-09-16):** Issue #329 is the dedicated Sprint 3 remediation for the deferred Vite/esbuild development-tool finding (SEC-274-04). This file intentionally preserves the state and decisions at the time of Issue #274; current migration and verification evidence is recorded in `evidence/validation/issue-329-vite-vitest-toolchain-migration.md`.

**Date:** 2026-08-30  
**Branch:** `test/274-security-privacy-dependency-audit`

## Purpose

Review the completed Basic flows for server-side authorisation, untrusted input and file handling,
public-data exposure, authentication and administration boundaries, secret handling, dependency
risk and repository hygiene.

Material findings are either resolved within the audit or explicitly tracked with rationale.

## Competition-scope authorisation

Focused authorisation coverage was executed with:

```text
npx.cmd vitest run apps/backend/tests/authorization.test.ts apps/backend/tests/api/admin-users.test.ts apps/backend/tests/api/submissions.test.ts
```

Result:

```text
Test Files  3 passed (3)
Tests       48 passed (48)
```

The passing scenarios include:

- anonymous submission denial;
- viewer submission denial;
- approved submitter competition-scope enforcement;
- uploaded submission scope enforcement;
- correction scope derived from the source event competition;
- administrator submission without persisted competition scope;
- administrator correction without persisted competition scope;
- administrator approval, re-scoping and revocation; and
- invalid or unauthorised requests being rejected before persistence.

The complete handwritten API suite also passed:

```text
npm.cmd run test:api

Test Files  11 passed (11)
Tests       114 passed (114)
```

## File upload and untrusted-input review

The Basic submission flow uses server-side validation in addition to browser validation.

Existing API regression coverage verifies:

- JSON file normalization;
- CSV file normalization;
- invalid uploaded rows;
- unsupported file formats;
- oversized uploaded files;
- competition-scope enforcement;
- malformed JSON;
- oversized request payloads;
- event-indexed validation details;
- invalid domain values; and
- authenticated submission rate limiting.

The upload-specific regression suite was rerun after dependency remediation:

```text
npx.cmd vitest run apps/backend/tests/api/submissions.test.ts
```

Result:

```text
Test Files  1 passed (1)
Tests       22 passed (22)
```

The implementation also applies an explicit upload-size limit and validates untrusted file content
before the submission service persists accepted event data.

## Public and export data exposure review

A focused repository scan was performed across the public-read, fixture-statistics and submission
modules for sensitive account/authentication fields including:

```text
auth_subject
SUPABASE_SECRET_KEY
deleted_auth_subject
email
access_token
refresh_token
```

No matching sensitive identifier was found in the reviewed public-response implementation paths.

Existing database integration coverage includes:

```text
filters accepted events and returns privacy-safe stable resources
```

The public API and filtered exports therefore expose the stable sport-analysis resources required by
the product without intentionally including internal authentication or account-management data.

## Authentication and administrator boundaries

Authentication, authorisation and administrator routes were reviewed through the focused and full API
regression suites.

Existing coverage verifies:

- signed-out requests are denied where authentication is required;
- viewer accounts cannot gain submitter capabilities through stale approval/scope state;
- submitters remain restricted to approved competition scope;
- administrator-only operations enforce administrator role;
- protected administrator targets are not changed through invalid transitions;
- account deletion uses a separate server-only Supabase administrative client; and
- provider/database failures are mapped to safe client responses.

No material role-enforcement defect was identified.

## Secret and environment-variable handling

The repository was scanned for common secret/configuration identifiers while excluding AI transcript
evidence.

The matches reviewed consisted of:

- `.env.example` placeholders;
- deterministic test credentials;
- test-only Supabase URLs and publishable keys;
- Gitea workflow references using `${{ secrets.* }}`;
- browser-safe Supabase publishable-key configuration;
- documented server-only `SUPABASE_SECRET_KEY` references; and
- scripts that obtain tokens from an environment variable or hidden interactive input.

No production secret value was identified as hard-coded in the repository.

`SUPABASE_SECRET_KEY` remains server-only and is not configured through the frontend Vite
environment.

## Dependency audit

Initial command:

```text
npm.cmd audit --audit-level=high
```

The initial audit identified vulnerabilities affecting:

- `multer@2.0.2`;
- transitive `nanoid@3.3.17`;
- Wrangler/Miniflare `undici@7.28.0`; and
- the Vite 5 development-server dependency on an affected esbuild version.

A non-breaking remediation preview was first inspected:

```text
npm.cmd audit fix --dry-run
```

The preview showed that the runtime and tooling findings could be patched without changing major
application-framework versions.

The actual remediation was then applied with:

```text
npm.cmd audit fix
```

No `--force` remediation was used.

The resulting lockfile resolved:

```text
multer     2.0.2   -> 2.3.0
nanoid     3.3.17  -> 3.3.18
wrangler   4.119.0 -> 4.127.1
undici     7.28.0  -> 7.29.0
```

Related Cloudflare `workerd` and Miniflare packages were also refreshed by the lockfile update.

No application source file or declared dependency range required modification.

### Production dependency status

Command:

```text
npm.cmd audit --omit=dev
```

Result:

```text
found 0 vulnerabilities
```

The production dependency tree is therefore clean according to the npm audit performed on
2026-08-30.

### Remaining development-tool advisory

The normal full audit continues to report the Vite 5 dependency on an affected esbuild version.

npm proposes remediation only through:

```text
npm audit fix --force
```

which would install Vite 8 and introduce a breaking major-version migration.

This finding is limited to development tooling rather than the deployed application dependency tree.
Because the production audit reports zero vulnerabilities and a forced Vite major upgrade would
introduce disproportionate regression risk during Sprint 2 hardening, the finding is explicitly
deferred rather than force-remediated.

A future dependency-modernisation task should reassess the supported Vite/Vitest upgrade path.

## Repository hygiene review

Dependency alignment:

```text
npm.cmd run hygiene:dependencies
```

Result:

```text
No issues found
```

Architecture boundaries:

```text
npm.cmd run hygiene:architecture
```

Result:

```text
no dependency violations found
```

The earlier full hygiene run also reported several Knip findings consisting of one MkDocs JavaScript
file loaded outside the application dependency graph and several internally used exported TypeScript
types.

These were reviewed as non-security code-hygiene findings and were not expanded into unrelated
cleanup work under Issue #274.

## Findings summary

| ID         | Area                        | Finding                                                                                        | Severity             | Decision                                                                                |
| ---------- | --------------------------- | ---------------------------------------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------- |
| SEC-274-01 | File upload dependency      | `multer@2.0.2` affected by published denial-of-service advisories.                             | High                 | Fixed in scope through non-breaking update to `2.3.0`; upload tests passed.             |
| SEC-274-02 | Transitive frontend tooling | `nanoid@3.3.17` affected by published advisory.                                                | High                 | Fixed in scope through lockfile refresh to `3.3.18`.                                    |
| SEC-274-03 | Cloudflare tooling          | Wrangler/Miniflare resolved affected `undici@7.28.0`.                                          | High/tooling         | Fixed in scope through Wrangler/Undici refresh.                                         |
| SEC-274-04 | Vite development server     | Vite 5 resolves an affected esbuild version; npm remediation requires breaking Vite 8 upgrade. | Moderate/dev tooling | Deferred with rationale. Production audit is clean; do not use `npm audit fix --force`. |
| SEC-274-05 | Knip hygiene                | Existing unused-file/export reports unrelated to security/privacy.                             | Low                  | Reviewed; no security action required under #274.                                       |
| SEC-274-04 | Vite development server     | Vite 5 resolves an affected esbuild version; npm remediation requires breaking Vite 8 upgrade. | Moderate/dev tooling | Deferred to #329. Production audit is clean; do not use `npm audit fix --force`.        |

Follow-up issue #329 tracks the supported Vite/Vitest migration required to resolve the remaining development-tool advisory.

## Repository quality gate

After dependency remediation:

```text
npm.cmd run check
```

Result:

```text
PASS
```

The repository continues to pass structure validation, formatting, linting, TypeScript checks,
backend/frontend/contracts tests, API tests, OpenAPI validation and production builds.

## Acceptance-criteria traceability

| Acceptance criterion                                                                       | Outcome                                                                                                                                  |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Competition-scope authorisation is reviewed across submission and correction endpoints     | PASS — focused authorization/admin/submission suite passed 48/48 and covers submission/correction competition scope.                     |
| File upload limits and untrusted-input handling are reviewed                               | PASS — size/type/content/error paths reviewed; Multer vulnerability remediated; submission suite passed 22/22.                           |
| Public/export responses are checked for unintended private data exposure                   | PASS — focused sensitive-field scan found no exposure in reviewed public paths; privacy-safe database regression exists.                 |
| Authentication/admin routes are checked for role enforcement                               | PASS — focused and full API suites verify authentication and role boundaries.                                                            |
| Secret and environment-variable handling is reviewed                                       | PASS — repository scan found expected placeholders/test values/secret-store references, not a committed production secret.               |
| Dependency and repository-hygiene findings are reviewed alongside the new monorepo tooling | PASS — npm audit, Syncpack, Dependency Cruiser and Knip findings reviewed.                                                               |
| Material findings become linked bugs or are fixed in scope                                 | PASS — runtime/high-risk dependency findings were safely fixed in scope; remaining dev-tool advisory explicitly deferred with rationale. |
| Security/privacy review evidence is documented                                             | PASS — this validation record retains the audit evidence and decisions.                                                                  |

## Outcome

The Basic security/privacy audit found no material authorisation, public-data exposure or secret-handling
defect.

The material dependency findings that could be resolved without destabilising the application were
remediated and retested. The production dependency tree reports zero known npm audit
vulnerabilities.

The remaining Vite/esbuild finding is development-only and requires a breaking major upgrade, so it
is explicitly deferred rather than force-upgraded during Sprint 2.

## AI Declaration

The security/privacy audit planning, dependency triage, validation analysis and documentation were
produced with the assistance of ChatGPT-Web[GPT-5.6 Sol].
