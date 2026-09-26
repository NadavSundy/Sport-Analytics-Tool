# Sprint 3 User-Testing Session — P09

## Session details

| Field               | Record                                                                                                                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User-feedback issue | #607 — API consumer keys, quotas and rate limits                                                                                                                                                   |
| Date                | 2026-09-26                                                                                                                                                                                         |
| Participant         | P09 (anonymous)                                                                                                                                                                                    |
| Role                | Technically competent API consumer                                                                                                                                                                 |
| Environment         | Deployed frontend, public documentation site and deployed development API                                                                                                                          |
| Frontend            | `https://sport-analytics-tool-web.pages.dev`                                                                                                                                                       |
| Documentation       | `https://sports-analytics-tool.pages.dev/api/overview/`                                                                                                                                            |
| API                 | `https://statsthegame-dev-api.calmground-aa50efe2.southafricanorth.azurecontainerapps.io/api/v1`                                                                                                   |
| Commit              | `eb106e4dada8b767635d90cf63a257b2ab28fbba`                                                                                                                                                         |
| Browser/device      | Google Chrome on Windows                                                                                                                                                                           |
| Facilitation        | No coaching was provided during PUB-05. A bearer token was supplied only after PUB-05 had already been completed, during later authenticated testing; no further coaching was recorded for API-01. |

The participant's identity, raw API key, bearer token and other credentials are not retained in this record.

## Prepared consumer state

The facilitator prepared a disposable API consumer before the session:

- consumer ID: `1`;
- key ID: `1`;
- configured short-term limit: `5` requests per minute;
- configured daily quota: `20` requests;
- raw API key supplied out-of-band and not retained in evidence.

Pre-session technical checks confirmed:

- `GET /api/v1/health` returned `200`;
- public `GET /api/v1/competitions?limit=1` returned `200`;
- `GET /api/v1/consumer/competitions?limit=1` without a key returned `401 API_KEY_UNAUTHORIZED`;
- the same consumer request with the prepared key returned `200` and exposed rate-limit/quota metadata over direct HTTP.

## Task outcomes

| Task ID | Outcome | Observation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PUB-05  | Success | The participant selected the API entry point, found the API documentation easily and understood how to begin using the API, including the distinction between public and consumer-controlled routes. The later bearer-token assistance occurred only after PUB-05 had already been completed, so it does not change the unassisted PUB-05 outcome.                                                                                                                                                                                                                                                                                                                                                                    |
| API-01  | Partial | The participant independently found the `apiKeyAuth` / `X-API-Key` instructions, used the Authorize control, successfully called `GET /api/v1/consumer/competitions`, and understood the short-term and daily quota concepts. The participant triggered `429 RATE_LIMIT_EXCEEDED` in the interactive OpenAPI client, but the browser client did not expose the response reset/retry headers during the original session, preventing the participant from determining the exact retry interval from Swagger alone. The defect was subsequently fixed in #743 and passed deployed facilitator retest; the original participant outcome remains Partial because no participant rerun on the corrected build is recorded. |

## API-01 observed response state

The successful consumer request exposed:

| Header                | Observed value |
| --------------------- | -------------- |
| `RateLimit-Limit`     | `5`            |
| `RateLimit-Remaining` | `4`            |
| `RateLimit-Reset`     | `13`           |
| `X-Quota-Limit`       | `20`           |
| `X-Quota-Remaining`   | `18`           |
| `X-Quota-Reset`       | `54612`        |

The participant understood the meaning of the short-term remaining/reset values and the daily quota before the limit-exceeded check.

When the short-term rate limit was exceeded in the interactive OpenAPI client, the participant observed:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Retry after the current rate-limit window."
  }
}
```

The exact reset/retry headers were not visible to the participant in the browser-based interactive client.

## Facilitator technical verification

After the participant observation, the facilitator reproduced the rate-limit boundary directly over HTTP without retaining or printing the API key.

Five requests were admitted and the sixth returned:

```text
HTTP/2 429
ratelimit-limit: 5
ratelimit-remaining: 0
ratelimit-reset: 32
retry-after: 32
```

Response body:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Retry after the current rate-limit window."
  }
}
```

While the same consumer was still rate-limited, the facilitator changed from the competitions route to:

```text
GET /api/v1/consumer/fixtures?limit=1
```

The second consumer route also returned:

```text
HTTP/2 429
ratelimit-limit: 5
ratelimit-remaining: 0
ratelimit-reset: 32
retry-after: 32
```

This confirms that changing consumer analytics routes did not bypass the shared per-consumer short-term limit.

## Findings and decisions

| Finding ID | Task ID | Observation                                                                                                                                                                                                                                                                                               | Severity | Decision | Decision reason                                                                                                                       | Gitea issue | Retest                                                                                                                      |
| ---------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| P09-F01    | API-01  | The interactive OpenAPI client showed `RATE_LIMIT_EXCEEDED` but did not expose `RateLimit-*` / `Retry-After` response headers to the browser participant, so exact retry timing could not be determined from Swagger alone. Direct HTTP verification confirmed that the backend did return those headers. | S3       | Accept   | Non-blocking API-consumer usability defect. Browser-based consumers needed the safe rate/quota response headers exposed through CORS. | #743        | Passed on the deployed fix: Swagger visibly exposed rate/quota headers on `200` and `RateLimit-*` / `Retry-After` on `429`. |

## Technical diagnosis and resolution

The repository's OpenAPI contract documents `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` and `Retry-After` on consumer `429` responses. Direct HTTP verification showed that the backend already returned those headers, but the original deployed browser client could not read them because the safe custom response headers were not exposed through CORS.

Finding `P09-F01` was tracked as bug #743. The deployed fix exposes the browser-safe consumer metadata headers required by interactive API clients:

- `RateLimit-Limit`
- `RateLimit-Remaining`
- `RateLimit-Reset`
- `X-Quota-Limit`
- `X-Quota-Remaining`
- `X-Quota-Reset`
- `Retry-After`

### Deployed #743 retest — 2026-09-26

A fresh disposable retest consumer was issued with consumer ID `2`, key ID `2`, a `5` requests/minute short-term limit and a `20` requests/day quota. The raw key is not retained in evidence.

The deployed Swagger/OpenAPI client visibly exposed the rate/quota response metadata on a successful request:

```text
HTTP 200
RateLimit-Limit: 5
RateLimit-Remaining: 4
RateLimit-Reset: 38
X-Quota-Limit: 20
X-Quota-Remaining: 13
X-Quota-Reset: 47198
```

Evidence screenshot:

`2026-09-26-P09-api-consumer-retest-200.png`

The deployed Swagger/OpenAPI client was then driven to the configured short-term limit. The browser-visible response showed:

```text
HTTP 429
RATE_LIMIT_EXCEEDED
RateLimit-Limit: 5
RateLimit-Remaining: 0
RateLimit-Reset: 50
Retry-After: 50
```

Evidence screenshot:

`2026-09-26-P09-api-consumer-retest-429.png`

A direct browser-origin HTTP verification also confirmed that the deployed API emits:

```text
Access-Control-Expose-Headers: RateLimit-Limit,RateLimit-Remaining,RateLimit-Reset,X-Quota-Limit,X-Quota-Remaining,X-Quota-Reset,Retry-After
```

The #743 remediation therefore passed deployed technical retest. No raw API key, bearer token or other credential is retained in the screenshots or this record.

## Positive observations

- The API documentation was easy for the participant to locate from the API entry point.
- The participant understood the distinction between public and consumer-controlled routes.
- The participant independently discovered `X-API-Key` usage.
- The prepared consumer key authenticated successfully.
- The participant understood the rate-limit and daily-quota concepts on successful responses.
- Direct HTTP verification confirmed that the short-term limit is shared across consumer routes and cannot be bypassed by switching from competitions to fixtures.

## Post-session assessment

**Final gate result: Accepted with documented limitations.**

`PUB-05` is recorded as Success. The facilitator clarified that the bearer-token assistance occurred only after the participant had already completed PUB-05, so no coaching was required to discover the API documentation or distinguish the public and consumer-controlled surfaces.

`API-01` remains Partial as the historical participant-session outcome because the participant could not determine the exact retry interval from Swagger during the original session. That limitation produced accepted S3 finding `P09-F01`. The defect was tracked in #743, fixed, deployed, and passed facilitator technical retest in the interactive OpenAPI client: successful responses visibly exposed rate/quota metadata and the `429 RATE_LIMIT_EXCEEDED` response visibly exposed `RateLimit-*` and `Retry-After`.

No S1 or S2 finding was observed, so the project's mandatory accepted-S1/S2 retest rule does not apply. No participant rerun on the corrected build is recorded; that is the documented limitation retained by this gate result.

## Evidence review

- [x] Participant identity is anonymised.
- [x] Raw API key, bearer token and personal information are absent.
- [x] Each attempted Task ID has an individual outcome.
- [x] The actionable finding is linked to its Task ID and severity-rated.
- [x] Direct HTTP/facilitator verification is clearly separated from participant observation.
- [x] The actionable S3 finding has an accepted decision.
- [x] The accepted finding is linked to follow-up bug #743.
- [x] The deployed #743 fix passed browser/OpenAPI technical retest.
- [x] PUB-05 is correctly recorded as unassisted because the bearer-token assistance occurred after that task had already completed.

## AI Declaration

This anonymised session record was organised from facilitator-provided notes with the assistance of ChatGPT-Web[GPT-5.6 Sol]. The facilitator remains responsible for the recorded observations, severity and decisions.
