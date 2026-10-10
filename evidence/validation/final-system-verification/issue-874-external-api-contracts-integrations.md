# Issue #874 External API, Contracts, Consumer Controls and Integrations Verification

## Metadata

| Field                   | Value                                                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Execution issue         | #874                                                                                                                  |
| Tester                  | Ben Swartz with Claude-Code assistance                                                                                |
| Date/time               | 2026-10-10, Africa/Johannesburg                                                                                       |
| Candidate commit/tag    | `74cf6827`                                                                                                            |
| Environment             | Deployed development API and deployed frontend; local suites for the checks that must not be run against the live API |
| Frontend URL            | `https://sport-analytics-tool-web.pages.dev` (the application; the documentation site is a separate deployment)       |
| API URL                 | `https://statsthegame-dev-api.calmground-aa50efe2.southafricanorth.azurecontainerapps.io`                             |
| Worker/release context  | Not exercised; this lane is the API surface, contracts, consumer controls and external integration                    |
| Test role(s)            | Anonymous public reader only; no credential was used and no authenticated session was established                     |
| Fixture/package/dataset | Deployed read-only data; competition 4 (Indian Premier League), participant 8452                                      |

> Do not record passwords, bearer tokens, OAuth credentials, API keys or service secrets.

**Deployed requests were free `GET`s only.** No natural-language call was made, no key was issued
and no limit was flooded. Rate limits, quotas, usage reporting, key lifecycle, shared-limiter
behaviour and weather failure handling were verified from the existing suites and the code, as the
issue requires.

## Results

| Verification ID | Result (`PASS` / `FAIL` / `BLOCKED` / `N/A`) | Evidence / observation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Linked bug / blocker | Retest                   |
| --------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------ |
| API-TECH-01     | PASS                                         | `GET /api/v1/health` → `200`, `application/json`, `{"status":"ok","service":"sport-analytics-api"}`, header `API-Version: v1`. `GET /openapi.yaml` → `200`, `application/yaml; charset=utf-8`, 298,970 bytes, served anonymously. First request took 32.5 s (scale-to-zero cold start); see F3.                                                                                                                                                                                                                  | —                    | Not needed               |
| API-TECH-02     | PASS                                         | The explorer loads at `sport-analytics-tool-web.pages.dev/api` and issued `GET /api/v1/competitions?limit=2` to the deployed Container Apps host: `200`, two competitions and a `nextCursor`. Performed in a browser by Ben Swartz on 2026-10-10; details under "Manual step" below.                                                                                                                                                                                                                             | —                    | Not needed               |
| API-TECH-03     | **FAIL**                                     | Seven representative deployed responses validated against the schemas in the **deployed** `openapi.yaml`: six passed, one failed. `GET /api/v1/participants` returns `totalRecords` on every item; `Participant` is `additionalProperties: false` and does not document it. See F1.                                                                                                                                                                                                                              | F1                   | Retest after F1 is fixed |
| API-TECH-04     | PASS                                         | `404` → `{"error":{"code":"NOT_FOUND","message":"Competition not found."}}`. `?limit=0` → `400 VALIDATION_FAILED` with a `details[]` entry naming `limit`. Missing required `competitionId` → `400 VALIDATION_FAILED` naming the field. Envelope matches `ApiErrorResponse` and `docs/api/contracts.md`.                                                                                                                                                                                                         | —                    | Not needed               |
| API-TECH-05     | PASS                                         | `GET /api/v1/competitions?limit=2` returned 2 records and a `nextCursor`; following that cursor returned the next 2 in name order with no overlap and a fresh cursor. `participants` carried `totalPages: 6760`. Identifiers were opaque immutable strings throughout.                                                                                                                                                                                                                                           | —                    | Not needed               |
| API-TECH-06     | PASS (suite + live headers)                  | Consumer-key issue, rotate and revoke, and the `401` on a missing/invalid/revoked key, are covered by `test:api` (298) and `test:api-contract` (93), including `ApiKeyUnauthorized` with `WWW-Authenticate: ApiKey`. Observed live on the deprecated alias: `401` with `www-authenticate: ApiKey`. The manual step additionally observed the anonymous allowance being metered live — see API-TECH-07.                                                                                                           | —                    | Not needed               |
| API-TECH-07     | PASS (suite + live headers)                  | Per-minute limit, UTC daily quota, the `RateLimit-*`/`X-Quota-*`/`Retry-After` split and fail-closed `503 RATE_LIMIT_UNAVAILABLE` are asserted in `corrected-contract.contract.test.ts`. **Confirmed live** by the manual step: `ratelimit-limit: 30`, `ratelimit-remaining: 29`, `ratelimit-reset: 22` on an anonymous canonical read — the documented 30-per-source-per-minute default, deployed and decrementing. Shared/distributed behaviour remains the durable PostgreSQL counter asserted by the suites. | —                    | Not needed               |
| API-TECH-08     | PASS                                         | `GET /api/v1/statistics/leaderboards?scope=competition&competitionId=4&metric=most_runs&limit=3` → `200`, ranked entries with `tieBreakers` and `qualification`, validated against the deployed schema. `scope` without its identifier → `400`.                                                                                                                                                                                                                                                                  | —                    | Not needed               |
| API-TECH-09     | PASS                                         | `GET /api/v1/consumer/competitions` returned `deprecation: ?1` and `link: </api/v1/competitions>; rel="successor-version"`, with no `Sunset`. Matches `api-deprecation.ts` and `docs/api/versioning.md`. See F4 on the wording.                                                                                                                                                                                                                                                                                  | —                    | Not needed               |
| API-TECH-10     | PASS (by suite)                              | `GET /api/v1/consumer/usage` and the administrator usage view are covered by `test:api`; the live route correctly refused an anonymous request with `401`. Not exercised live because reading usage needs a key.                                                                                                                                                                                                                                                                                                 | —                    | Not needed               |
| API-TECH-11     | PASS (by existing evidence)                  | No call made, per the issue. Cited: the #868 runs (55/63 → 62/64 → 62/64), the #940 run of **70/70** (`issue-940-natural-language-evaluation-2026-10-09.md`), and the #940 live verification (`issue-940-live-verification-2026-10-10.md`) covering casual phrasing, a named competition and a follow-up.                                                                                                                                                                                                        | —                    | Not needed               |
| INT-TECH-01     | PASS                                         | `GET /api/v1/weather?latitude=-26.2&longitude=28.04&date=2026-10-01` → `200` with live Open-Meteo values (`temperatureMax: 15.7`, `temperatureMin: 5.2`, `precipitationSum: 0`, `windSpeedMax: 13`).                                                                                                                                                                                                                                                                                                             | —                    | Not needed               |
| INT-TECH-02     | PASS (mixed)                                 | Live: out-of-range latitude → `400 VALIDATION_FAILED` with a safe message and no provider detail. Timeout and upstream-error handling (`WeatherTimeoutError`, `WeatherUpstreamError`, geocoding equivalents) are covered by `test:api`, which exercises each failure path with a stubbed provider.                                                                                                                                                                                                               | —                    | Not needed               |
| SEC-TECH-01     | PASS                                         | Eight public collection and aggregate responses scanned for private-looking keys and address-shaped strings: 0 hits. Five protected routes (`auth/me`, `admin/users`, `batches`, `account/api-access`, `provenance/submissions`) each returned `401 UNAUTHORIZED` with a safe non-disclosing message.                                                                                                                                                                                                            | —                    | Not needed               |

## Commands / deterministic steps

```text
API=https://statsthegame-dev-api.calmground-aa50efe2.southafricanorth.azurecontainerapps.io

# Availability and specification
curl -sS -w 'status=%{http_code} ct=%{content_type} time=%{time_total}\n' "$API/api/v1/health"
curl -sS -D - -o /dev/null "$API/api/v1/health" | grep -i '^api-version'
curl -sS -w 'status=%{http_code} ct=%{content_type} bytes=%{size_download}\n' "$API/openapi.yaml"

# Representative reads, pagination, filters, aggregate query
curl -sS "$API/api/v1/competitions?limit=2"
curl -sS "$API/api/v1/competitions?limit=2&cursor=<nextCursor from the previous call>"
curl -sS "$API/api/v1/fixtures?limit=2"
curl -sS "$API/api/v1/participants?limit=2"
curl -sS "$API/api/v1/statistics/leaderboards?scope=competition&competitionId=4&metric=most_runs&limit=3"

# Error shapes
curl -sS "$API/api/v1/competitions/99999999"                                   # 404 NOT_FOUND
curl -sS "$API/api/v1/competitions?limit=0"                                    # 400 VALIDATION_FAILED
curl -sS "$API/api/v1/statistics/leaderboards?scope=competition&metric=most_runs"  # 400, names competitionId

# Deprecation headers
curl -sS -D - -o /dev/null "$API/api/v1/consumer/competitions" | grep -iE '^(deprecation|link|www-authenticate)'

# Unauthorised access
for p in auth/me admin/users batches account/api-access provenance/submissions; do
  curl -sS -o /dev/null -w "$p %{http_code}\n" "$API/api/v1/$p"; done

# External integration
curl -sS "$API/api/v1/weather?latitude=-26.2&longitude=28.04&date=2026-10-01"   # 200
curl -sS "$API/api/v1/weather?latitude=999&longitude=28.04&date=2026-10-01"     # 400

# Explorer route served
curl -sS -o /dev/null -w '%{http_code}\n' https://sport-analytics-tool-web.pages.dev/api

# Deployed responses validated against the deployed specification, and scanned
# for private fields: Ajv against each operation's documented 200 schema, and a
# key/address scan over eight captured public responses.

# Local suites
npm run test:contracts     # 20 files, 363 tests
npm run test:api-contract   # 6 files, 93 tests
npm run test:api            # 28 files, 298 tests
npm run test:unit           # 59 files, 583 tests
npm run test:deployment     # 105 tests
```

## Evidence

- Command output: the request/response pairs above, captured during this execution.
- API response identifiers: competitions `5`, `20`, `74`, `124`; participants `18904`, `123637`,
  `8452`; competition `4` leaderboard entries `8452` (9,336 runs), `8446`.
- Suite results: contracts 363, api-contract 93, api 298, unit 583, deployment 105 — all passing.
- Natural-language evidence, cited rather than re-run:
  `evidence/validation/issue-940-natural-language-evaluation-2026-10-09.md` (70/70),
  `evidence/validation/issue-940-live-verification-2026-10-10.md` (three live checks including a
  follow-up), and the three #868 runs summarised in
  `docs/validation/issue-817-natural-language-query-evidence.md`.
- API Explorer response text: the manual step below. No screenshot was retained; the response
  status, body identifiers, rate-limit headers and duration were recorded instead, and they
  corroborate the `curl` capture of the same operation earlier in this execution.

## Manual step for the tester

One step, to complete API-TECH-02. Perform it and paste the result into the placeholder.

1. Open <https://sport-analytics-tool-web.pages.dev/api> in a browser.
2. Expand `GET /api/v1/competitions`, choose **Try it out**, set `limit` to `2`, and **Execute**.
3. Confirm a `200` response with two competitions and a `nextCursor`.
4. Screenshot the response panel showing the `200` and the body, and save it beside this record.

| Field                  | Value                                                                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Performed by           | Ben Swartz, in a browser                                                                                                |
| Date/time              | 2026-10-10                                                                                                              |
| Explorer URL           | `https://sport-analytics-tool-web.pages.dev/api`                                                                        |
| Operation exercised    | `GET /api/v1/competitions?limit=2`                                                                                      |
| Request target         | The deployed Container Apps host, confirmed by the tester                                                               |
| Observed status        | `200`                                                                                                                   |
| Observed body          | Two competitions — `5` "ACC Eastern Region T20" and `20` "ACC Men's Premier Cup" — with `pagination.nextCursor` present |
| Observed headers       | `ratelimit-limit: 30`, `ratelimit-remaining: 29`, `ratelimit-reset: 22`                                                 |
| Request duration       | 3,248 ms                                                                                                                |
| Result (`PASS`/`FAIL`) | **PASS**                                                                                                                |
| Screenshot             | None retained; the response status, body, headers and duration above are the recorded evidence                          |

Two things this step established beyond the explorer rendering and working.

**It corroborates the earlier capture.** The same two competitions, with the same identifiers and
names, were returned to `curl` earlier in this execution. Two independent clients reaching the same
deployed data is stronger than either alone, and it confirms the explorer is calling the deployed
backend rather than a mock or a cached fixture.

**It is the first live observation of the anonymous allowance.** `ratelimit-limit: 30` is the
documented `ANONYMOUS_RATE_LIMIT_PER_MINUTE` default, and `ratelimit-remaining: 29` shows it
decrementing for the request just made, with `ratelimit-reset: 22` seconds left in the minute
window. API-TECH-06 and API-TECH-07 had rested on the suites, because confirming a limit live
otherwise means spending the allowance; this observed one request's worth of it as a side effect of
a check that had to be made anyway. It also confirms the limiter is active on the canonical reads in
the deployed environment, not only in process.

## Failures and disposition

### F1 — `GET /api/v1/participants` returns an undocumented `totalRecords` on every item · FAIL

**Observed.** Each item is `{"participantId":"18904","displayName":"A Adams","totalRecords":13520}`.
The `Participant` schema is `additionalProperties: false` with only `participantId` and
`displayName`, in both the repository and the deployed specification, and the Zod
`participantSchema` declares the same two fields. Ajv rejects the deployed response against the
deployed schema.

**Cause.** `participant.repository.ts` computes the page total with
`COUNT(*) OVER()::integer AS "totalRecords"` inside the row projection, and
`public-read.service.ts` returns `page.records` straight through to `data` while using the same
value for `pagination.totalPages`. The count is page metadata that is being carried on every record.

**Why CI did not catch it.** No contract test references `/api/v1/participants`: the collection has
zero coverage in `apps/backend/tests/contract/`, so the suite that validates real responses against
the specification never sees this one. `GET /api/v1/seasons`, `/fixtures` and `/competitors` use the
same window-count pattern in their repositories but passed validation, so the leak is specific to
the participants projection.

**Disposition.** **The code looks wrong, so no code was changed here** and the stray field was not
documented: the fix is to project the records before returning them, not to add `totalRecords` to a
public item schema. Recorded for a follow-up issue. **Not submission-blocking:** `totalRecords` is a
public row count of published players, not private data, and the field is additive so no documented
consumer field is missing. It is a contract-accuracy defect.

**Retest.** Re-run the Ajv validation of `GET /api/v1/participants?limit=5` against the deployed
specification, and add a contract test for the collection so the gap cannot reopen.

### F2 — WITHDRAWN · two "frontend hosts" were one frontend and one documentation site

**This finding was wrong and is withdrawn.** It is kept rather than deleted so the record shows what
was claimed and why it did not hold.

**What was claimed.** That two frontend hosts are documented and behave differently:
`sport-analytics-tool-web.pages.dev/api` returned `200` while `sports-analytics-tool.pages.dev/api`
returned `404`, which was read as a Cloudflare Pages project missing the `_redirects` SPA fallback,
with `README.md` and `docs/final-submission.md` pointing readers at the broken one.

**Why it does not hold.** The two hosts are two different deployments of two different things, and
the repository says so unambiguously:

- `.gitea/workflows/deploy-frontend.yml` and `ci.yml` set
  `FRONTEND_URL: https://sport-analytics-tool-web.pages.dev` — the application.
- `.gitea/workflows/deploy-docs.yml` and `ci.yml` set
  `DOCS_URL: https://sports-analytics-tool.pages.dev` — the MkDocs documentation site.

A `404` for `/api` on the documentation site is correct. MkDocs builds `docs/api/*.md` into
`/api/overview/`, `/api/openapi/` and so on, and there is no `docs/api/index.md`, so the bare
directory has no page. Confirmed by request: the documentation site returns `200` for `/` and for
`/api/overview/`, and `404` for `/api` and `/api/`. `/fixtures` `404`s there because the
documentation site has no such page at all — only the application does.

**Every label checked is correct.** No document calls the documentation site the application:

| Location                                                      | Label                                                                  |
| ------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `README.md` line 5                                            | "**Public documentation:** sports-analytics-tool.pages.dev"            |
| `README.md` line 6                                            | "**Web application:** sport-analytics-tool-web.pages.dev"              |
| `README.md` line 204 (Frontend)                               | `sport-analytics-tool-web.pages.dev`                                   |
| `README.md` line 242                                          | "The public documentation site is sports-analytics-tool.pages.dev"     |
| `docs/final-submission.md` line 16                            | "**Web application:** sport-analytics-tool-web.pages.dev"              |
| `docs/final-submission.md` line 17                            | "**Interactive API Explorer:** sport-analytics-tool-web.pages.dev/api" |
| `docs/final-submission.md` line 19                            | "**Public documentation:** sports-analytics-tool.pages.dev"            |
| `docs/deployment/cloudflare_pages.md` line 61                 | "Public documentation URL:"                                            |
| `docs/planning/sprint-1-requirements-traceability.md` line 47 | "Public documentation website ... MkDocs documentation"                |

**No documentation fix is required and none was made.** A marker following
`docs/final-submission.md` reaches the application at the `-web` host and the documentation site at
the other, each correctly labelled.

**How the mistake was made,** since it bears on how the rest of this record should be read: the
check grepped for occurrences of each host and compared the `/api` status of both, without reading
the labels beside the occurrences or establishing what each host serves. Two sites were treated as
two deployments of one site. Nothing else in this record depends on that confusion — the API checks
were all against the backend host, and the explorer route check was against the application host,
which is the correct one.

### F3 — First deployed request took 32.5 seconds · observation

The container scales to zero, so the first request after idle pays a cold start. Documented
behaviour rather than a defect, and subsequent requests in this execution were faster — the manual
step's request, made from a browser against a warm container, took 3,248 ms. Recorded
because a marker's first click will see it, and because #876 owns deployed response-time
acceptance.

### F4 — The deprecation documentation says "successful" responses carry the headers · minor

`docs/api/versioning.md` states that "each successful deprecated response includes `Deprecation: ?1`"
and the `Link` header. The middleware sets both before authentication runs, so a `401` on a
deprecated alias carries them too — as observed. The statement is not false of successful responses
but under-describes the behaviour. Left as recorded rather than edited, to keep this execution record
free of unrelated documentation changes.

## Untested / partial coverage

Recorded rather than pursued, within this lane's time box:

- **Limit and quota _enforcement_ live.** The anonymous allowance was observed being metered by
  the manual step (`ratelimit-limit: 30`, remaining `29`), but reaching `429`, exhausting a daily
  quota and reading consumer usage were not exercised against the deployed API: that means spending
  the allowance or issuing a key. Enforcement is covered by `test:api-contract` and `test:api`
  instead, as the issue directs.
- **Consumer key issue/revoke live.** Needs an administrator credential; covered by the suites.
- **Shared/distributed limiter across replicas.** The durable PostgreSQL counter is asserted by the
  suites; observing two replicas sharing one counter needs a deployed scale-out and is not reachable
  from free `GET`s.
- **Weather timeout and upstream failure live.** Cannot be induced from outside without breaking the
  provider; covered by `test:api` with a stubbed provider.
- **Natural-language behaviour.** No call made, per the issue. Cited evidence only.
- **Authenticated and privileged endpoint success paths.** Only the rejection side was verified
  live; the success paths need credentials and are covered by #871 and the suites.
- **Deployed responses validated: seven operations.** Representative rather than exhaustive; the
  remaining operations rely on `test:api-contract` against the same specification.

## AI Declaration

This execution record was prepared with the assistance of Claude-Code[Claude Opus 5 (1M context)]
under issue #874. The deployed requests were free `GET`s issued during the execution and their
responses are quoted as received; the schema validation was run with Ajv against the specification
the deployed API itself serves, which is how F1 was found. Finding F2 as first recorded was wrong:
the tool compared a documentation site against the application without establishing what each host
serves, and the finding is withdrawn above with the evidence that disproves it rather than deleted.
No `.env` file was read, no `LLM_API_KEY` was used and no natural-language or other paid provider
call was made. No application source code was changed.
