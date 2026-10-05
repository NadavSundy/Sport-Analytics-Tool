# Final API audit

- **Issue:** #806
- **Audit date:** 2026-10-05
- **Audited deployment:** [Azure Container Apps backend](https://statsthegame-dev-api.calmground-aa50efe2.southafricanorth.azurecontainerapps.io/api/v1)

This is an evidence-led audit of the deployed public API. It supplements, rather
than replaces, the version-controlled [OpenAPI specification](openapi.md) and
the endpoint-specific reference pages. Results below are limited to the
anonymous, read-only checks actually performed; no bearer credential or API key
was available for this audit.

## Production observations

At 19:29 SAST on 2026-10-05, the documented Container Apps origin returned
`200 application/json` from `GET /api/v1/health`, with `API-Version: v1` and
the expected `sport-analytics-api` service name. The public `GET
/api/v1/competitions`, `GET /api/v1/fixtures?limit=2`, filtered `GET
/api/v1/competitions?name=Asia&limit=2`, and an unknown-fixture request all
returned JSON rather than frontend HTML.

The filtered competition response returned two matching resources and a
non-null opaque `pagination.nextCursor`; the fixture response retained stable
`fixtureId` values. Invalid `limit` input returned `400`, and an unknown
fixture returned `404` with a structured `NOT_FOUND` error. `GET
/api/v2/health` returned `404`; the local route contract verifies its required
`UNSUPPORTED_API_VERSION` error shape.

`GET /openapi.yaml` returned `200 application/yaml`. Its SHA-256 was
`084A104767E59C0E9AD2A6DD9ED093A06815CB7B61FEA1326CDB518B555643E8`, identical
to the repository's `docs/api/openapi.yaml`, establishing that the deployed
document and maintained specification matched at audit time. A request carrying
`Origin: https://sport-analytics-tool-web.pages.dev` received the matching
`Access-Control-Allow-Origin` response header.

The deployed Explorer page at
`https://sport-analytics-tool-web.pages.dev/api` rendered its Explorer shell,
access guidance and `v1` indicator. In the audit browser, the raw OpenAPI tab
and the Explorer's runtime request were blocked by a client-side policy with
`ERR_BLOCKED_BY_CLIENT`; this is not a backend CORS failure, because the direct
origin-qualified probe above succeeded. A browser without that local blocking
policy still needs to complete the visual Explorer-load check.

## Access, consumer protection and lifecycle observations

Unauthenticated `GET /api/v1/auth/me` returned `401`, `WWW-Authenticate:
Bearer`, and the structured `UNAUTHORIZED` error. `GET /api/v1/consumer/usage`
without a key returned `401`, `WWW-Authenticate: ApiKey`, and
`API_KEY_UNAUTHORIZED`. The anonymous public competition request included
`RateLimit-Limit`, `RateLimit-Remaining` and `RateLimit-Reset` headers.

The retained deprecated consumer path `/api/v1/consumer/fixtures?limit=1`
returned `401` without a key, and carried `Deprecation: ?1` plus the documented
`successor-version` link to `/api/v1/fixtures?limit=1`. This verifies the
implemented versioning/deprecation metadata without manufacturing a consumer
credential. Key issue, rotation, revocation, consumer quota exhaustion and
authorised role workflows remain covered by automated API/contract tests, not
by this unauthenticated production probe.

## Representative observed response times

These are external client round trips from the audit machine, including public
internet, Azure ingress, rate-limit processing and response transfer. They are
not interchangeable with the ten-sample, isolated-local, backend-to-database
P95 targets in [the performance baseline](../development/performance-baseline.md).

| Request                         | Samples (ms)                                     | External P50 | External P95 | Documented local target | Comparison                                                  |
| ------------------------------- | ------------------------------------------------ | -----------: | -----------: | ----------------------: | ----------------------------------------------------------- |
| `GET /api/v1/health`            | 79.256; 55.662; 60.869; 53.295; 73.283           |       60.869 |       79.256 |    No equivalent target | Availability check only                                     |
| `GET /api/v1/fixtures?limit=50` | 3306.203; 1756.047; 1724.622; 1737.164; 1731.124 |     1737.164 |     3306.203 |                     500 | Above the local target, but not a like-for-like measurement |

The fixture-page result is recorded as a performance follow-up, not claimed as
proof of meeting or missing the local benchmark. A repeatable isolated
ten-sample benchmark using the documented representative corpus is required to
make a target decision. No production change was made by this audit.

## Acceptance-criteria result

| Criterion                                                    | Result                                                                                                                                                                                                       |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Deployed availability and documented origins                 | Verified by HTTPS health, OpenAPI and public-read probes at the documented Container Apps origin.                                                                                                            |
| OpenAPI and Explorer                                         | Deployed OpenAPI verified byte-identical and CORS-permitted; Explorer visual completion blocked only by this audit browser's client policy.                                                                  |
| Architecture, resources, identifiers, filters and pagination | Verified from deployed JSON probes and the current handwritten-API/OpenAPI source; canonical public reads expose opaque IDs and cursor paging.                                                               |
| Errors, validation, versioning and deprecation               | Verified `400`, `401`, `404`, structured errors, `API-Version: v1`, unsupported-version routing and deprecated consumer metadata.                                                                            |
| Authentication, keys, rates and quotas                       | Anonymous/bearer/key rejection and anonymous rate-limit headers verified live; privileged/key-issued paths verified by focused automated contracts.                                                          |
| Statistics, fixtures and events                              | Live `200` JSON responses verified the fixture-event, fixture-statistics and participant-statistics endpoints for published records; focused OpenAPI contracts cover their documented shapes.                |
| Performance                                                  | External samples recorded and compared with the local-only target definition; isolated benchmark follow-up remains required.                                                                                 |
| Automated API/OpenAPI checks                                 | Focused OpenAPI/API checks passed: 35 tests in 3 files. The complete `npm.cmd run test:api-contract` suite passed: 90 tests in 6 files. `npm.cmd run openapi:lint` passed.                                   |
| Documentation consistency                                    | This page cross-checks the live origin against [API overview](overview.md), [OpenAPI](openapi.md), [consumer keys](consumer-keys.md) and [versioning](versioning.md); no URL or contract mismatch was found. |

## AI Declaration

The Issue #806 audit summary and evidence cross-references were prepared with
the assistance of Codex[GPT-5]. Claims are limited to the checks recorded on
this page.
