# Issue #886 — final API, OpenAPI and external-consumer documentation review

| Field        | Value                                                            |
| ------------ | ---------------------------------------------------------------- |
| Date         | 2026-10-10                                                       |
| Branch       | `docs/886-api-documentation-review`                              |
| Reviewed at  | `74cf6827` (merge of PR #944 into `main`)                        |
| Scope        | Documentation, OpenAPI descriptions and documentation tests only |
| Code changed | None                                                             |

## What was compared, and against what

The review treated the implementation as authoritative. Where a document disagreed with the code,
the document was corrected; where the code itself looked wrong, nothing was changed and a finding
was recorded instead. No finding of the second kind arose.

| Claim under review              | Checked against                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------ |
| Documented endpoint surface     | The routes mounted on the Express application, read from the live router stack                   |
| Operation methods and paths     | `apps/backend/tests/contract/route-inventory.contract.test.ts`, which has no allowlist           |
| Parameters, bounds and defaults | The Zod contracts in `packages/contracts/src/`                                                   |
| Status and error codes          | The route handlers, `error-handler.ts` and the middleware that admits each request               |
| Rate limits and quotas          | `apps/backend/src/config/env.ts`, `canonical-read-authentication.ts`, the consumer-key migration |
| Authentication and privilege    | The declared `security` of each operation against the middleware actually mounted in front of it |
| Deployed base URL               | Every occurrence in the repository, and `swagger-metadata.contract.test.ts`                      |
| Natural-language behaviour      | The #868 conversation contract, the #924 limiter and the #940 refusal wording                    |

**87 documented operations; all 87 marked `x-implementation-status: implemented`; none `planned`.**

## Automated guards relied on

Two existing suites already hold parts of this issue's acceptance criteria, so the review verified
that they pass and are genuinely load-bearing rather than re-deriving what they prove:

- `route-inventory.contract.test.ts` asserts, in both directions and with no allowlist, that every
  implemented route is a documented operation and every documented operation is implemented. A new
  route cannot merge without an operation in `docs/api/openapi.yaml`.
- `test:api-contract` (93 tests) validates real API responses against the specification, including
  the documented `400`s for invalid queries, the limit headers and the deprecation lifecycle.

The review found what these do **not** cover, and that is where the findings are: the route
inventory compares methods and paths only, not response codes or security, and the contract tests
validate the responses a test actually exercises rather than every response an operation can return.

## Findings

### F1 — The shared limiter's responses were undocumented on 22 operations · corrected

The twenty-two canonical cricket reads are admitted by `canonical-read-authentication`, which can
answer `429` when the anonymous or consumer allowance is spent, `503 RATE_LIMIT_UNAVAILABLE` when
the counter cannot be read, and `401` when a supplied key is invalid or revoked. None of the
twenty-two documented any of those three: between them they declared only `200`, `400`, `404`, `409`
and `422`.

The operations were identified by evaluating the middleware's own `canonicalReadPatterns` against
every documented path, rather than by reading the list by eye.

**Corrected.** Two reusable responses were added — `CanonicalReadLimitExceeded`, which covers the
anonymous bounds and the consumer limit and quota together because which applies depends on whether
a key was sent, and `CanonicalReadLimitUnavailable`, which covers the fail-closed counter — and
applied with `ApiKeyUnauthorized` to all twenty-two.

### F2 — `POST /query-definitions/evaluate` was documented as accepting no credential · corrected

The operation declared `security: []`, meaning no scheme applies. Since issue #924 it is admitted by
the same middleware as the canonical reads, which honours `X-API-Key` on it and rejects an invalid
key with `401` rather than ignoring it and falling back to anonymous access.

**Corrected.** The operation now declares `[{}, { apiKeyAuth: [] }]`, the shape the canonical reads
carry, and documents `401`. Its `429` now references the shared component, because a keyed request
there is limited as a consumer and not as an anonymous source.

### F3 — Three prose statements predated the #924 rate limit · corrected

- `docs/api/overview.md` described the natural-language endpoint as "protected **instead** by" its
  limits. The contrast was with an evaluate endpoint that was then unbounded; it no longer is, so
  the sentence told a reader the opposite of the truth.
- The same page's consumer-protection section listed the anonymous bounds without the one POST they
  now cover.
- `docs/api/consumer-keys.md` described the anonymous counters as covering "canonical reads" only.

**Corrected** in all three places. While in the analytics paragraph, the natural-language bounds were
also missing the five-turn conversation limit, which is as much a cost control as the character
bound beside it; that is added.

### F4 — `AnonymousReadLimitExceeded` left unused · corrected

Superseding it with `CanonicalReadLimitExceeded` left the component with no reference, which
`openapi:lint` reports as a warning `main` does not have. It was removed rather than ignored.

### F5 — No follow-up issues were opened

Every finding was a documentation defect fixable in this issue's own scope, and all five are
corrected here. Nothing was deferred, so no linked follow-up issue was raised. The deferred items
that remain open for the natural-language feature are tracked on #924 and are unrelated to the
accuracy of this documentation.

## Acceptance criteria

| #   | Criterion                                                        | Evidence                                                                                                                                                                                                                                                                                                  |
| --- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | API overview matches deployed routes                             | Every endpoint `docs/api/overview.md` names exists in the specification; the page is a grouped narrative that defers to the specification for completeness, and the route inventory holds the specification to the implementation. F3 corrected.                                                          |
| 2   | OpenAPI specification matches implementation                     | Route inventory passes in both directions with no allowlist; parameters, bounds and defaults checked against the Zod contracts; F1, F2 and F4 corrected.                                                                                                                                                  |
| 3   | API Explorer documentation is current                            | `docs/api/openapi.md` verified: the served endpoint, the `dist` copy, the `servers` list, the `security: []` convention, `bearerAuth` as the raw Supabase token, `apiKeyAuth` in `X-API-Key`, and the CORS-exposed limit headers all match the implementation.                                            |
| 4   | Authentication/consumer-key requirements are clear               | Declared security grouped and checked: 9 public, 22 anonymous-or-keyed, 14 key-required, 42 bearer. F2 corrected the one operation whose declaration understated what it accepts.                                                                                                                         |
| 5   | Pagination/filter/error conventions are documented               | Pagination `limit` 1–100 default 50 matches `MAX_PAGE_LIMIT`/`DEFAULT_PAGE_LIMIT`; the error envelope `{error:{code,message,details?}}` matches `error-handler.ts`, `ApiErrorResponse` and `docs/api/contracts.md`; leaderboard filters and their conditional requirement match `leaderboardQuerySchema`. |
| 6   | Versioning/deprecation matches implemented behaviour             | `docs/api/versioning.md` matches `api-deprecation.ts`: `Deprecation: ?1`, `Link: rel="successor-version"`, no `Sunset` until retirement is scheduled, `404 UNSUPPORTED_API_VERSION`. Guarded by `deprecation-lifecycle.contract.test.ts`.                                                                 |
| 7   | Rate limits/quotas are accurate                                  | Anonymous 30/source/minute and 600/minute platform match the `env.ts` defaults; consumer 60/minute and 10,000/day match the migration defaults; natural-language 10/100/300, 300 characters and 5 turns match `env.ts` and the contract. F1 and F3 corrected the coverage.                                |
| 8   | Dataset/aggregate/provenance routes documented where implemented | Dataset releases (3 operations), provenance (5) and participant aggregates (2) are all documented and implemented; the route inventory proves there is no route without an operation.                                                                                                                     |
| 9   | Natural-language query API documentation is accurate             | Limits table matches the code exactly; the #868 conversation shape, the #924 bounds and the #940 refusal and not-found wording are all documented. Live behaviour recorded separately in `issue-940-live-verification-2026-10-10.md`.                                                                     |
| 10  | Public versus privileged behaviour is clear                      | The four security groups above are each distinguishable in the specification; `consumer-keys.md` classifies the consumer-only surface and states that omitting a key is a smaller bounded allowance rather than unrestricted fallback.                                                                    |
| 11  | Deployed base URL is current                                     | One host throughout the repository, asserted by `swagger-metadata.contract.test.ts`: `https://statsthegame-dev-api.calmground-aa50efe2.southafricanorth.azurecontainerapps.io`.                                                                                                                           |
| 12  | Findings corrected or opened as linked follow-up issues          | F1–F4 corrected in this branch; F5 records that nothing needed deferring.                                                                                                                                                                                                                                 |

## Verification

| Command                           | Result                       |
| --------------------------------- | ---------------------------- |
| `npm run openapi:lint`            | Valid, 0 warnings            |
| `npm run test:api-contract`       | 93 passed (6 files)          |
| `npm run test:deployment`         | 105 passed                   |
| `python -m mkdocs build --strict` | 0 warnings, 0 errors         |
| `npx prettier --check .`          | Clean for every tracked file |

Two documentation tests were updated rather than relaxed, because they encoded assumptions the
review found to be wrong: the exact documented-status list for `GET /api/v1/competitions` is kept as
a canary rather than loosened to a substring match, and the evaluate security assertion now expects
the canonical-read shape.

## Integrity

This record contains no credentials, tokens, keys or production data. No `.env` file was read, no
`LLM_API_KEY` was used, and no paid provider call was made. The specification was edited as text and
then re-parsed to assert that nothing but the intended response codes changed.

## AI Declaration

This review was carried out with the assistance of Claude-Code[Claude Opus 5 (1M context)] under
issue #886. The operations covered by the shared limiter were computed by evaluating the
middleware's own patterns against the documented paths rather than listed by eye, and every limit
figure was read from the code or the migration that sets it rather than from another document.
