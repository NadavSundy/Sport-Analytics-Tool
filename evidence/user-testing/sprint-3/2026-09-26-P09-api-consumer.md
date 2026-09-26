# Sprint 3 User-Testing Session — P09

## Session details

| Field               | Record |
| ------------------- | ------ |
| User-feedback issue | #607 — API consumer keys, quotas and rate limits |
| Date                | 2026-09-26 |
| Participant         | P09 (anonymous) |
| Role                | Technically competent API consumer |
| Environment         | Deployed frontend, public documentation site and deployed development API |
| Frontend            | `https://sport-analytics-tool-web.pages.dev` |
| Documentation       | `https://sports-analytics-tool.pages.dev/api/overview/` |
| API                 | `https://statsthegame-dev-api.calmground-aa50efe2.southafricanorth.azurecontainerapps.io/api/v1` |
| Commit              | `eb106e4dada8b767635d90cf63a257b2ab28fbba` |
| Browser/device      | Google Chrome on Windows |
| Facilitation        | A bearer token was supplied after the participant requested one during PUB-05; no further coaching was recorded for API-01 |

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

| Task ID | Outcome | Observation |
| ------- | ------- | ----------- |
| PUB-05 | Partial | The participant selected the API entry point, found the API documentation easily and understood how to begin using the API, including the distinction between public and consumer-controlled routes. The participant requested a bearer token and the facilitator supplied one, so the task is retained as Partial under the project's no-coaching outcome rule. |
| API-01 | Partial | The participant independently found the `apiKeyAuth` / `X-API-Key` instructions, used the Authorize control, successfully called `GET /api/v1/consumer/competitions`, and understood the short-term and daily quota concepts. The participant triggered `429 RATE_LIMIT_EXCEEDED` in the interactive OpenAPI client, but the browser client did not expose the response reset/retry headers, preventing the participant from determining the exact retry interval from Swagger alone. |

## API-01 observed response state

The successful consumer request exposed:

| Header | Observed value |
| ------ | -------------- |
| `RateLimit-Limit` | `5` |
| `RateLimit-Remaining` | `4` |
| `RateLimit-Reset` | `13` |
| `X-Quota-Limit` | `20` |
| `X-Quota-Remaining` | `18` |
| `X-Quota-Reset` | `54612` |

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

| Finding ID | Task ID | Observation | Severity | Decision | Decision reason | Gitea issue | Retest |
| ---------- | ------- | ----------- | -------- | -------- | --------------- | ----------- | ------ |
| P09-F01 | API-01 | The interactive OpenAPI client showed `RATE_LIMIT_EXCEEDED` but did not expose `RateLimit-*` / `Retry-After` response headers to the browser participant, so exact retry timing could not be determined from Swagger alone. Direct HTTP verification confirmed that the backend did return those headers. | S3 | Accept | Non-blocking API-consumer usability defect. The backend behaviour is correct over direct HTTP, but browser-based consumers need the safe rate/quota headers exposed through CORS. Track separately as a bug. | Pending creation after evidence commit | Recommended after fix; not required for accepted S3 finding |

## Technical diagnosis for follow-up

The repository's OpenAPI contract documents `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` and `Retry-After` on consumer `429` responses. The backend also returns those headers over direct HTTP.

The deployed browser client cannot read them because the backend CORS configuration currently enables allowed origins and credentials but does not expose the custom safe response headers. The follow-up bug should consider exposing the consumer metadata headers required by browser-based API explorers:

- `RateLimit-Limit`
- `RateLimit-Remaining`
- `RateLimit-Reset`
- `X-Quota-Limit`
- `X-Quota-Remaining`
- `X-Quota-Reset`
- `Retry-After`

## Positive observations

- The API documentation was easy for the participant to locate from the API entry point.
- The participant understood the distinction between public and consumer-controlled routes.
- The participant independently discovered `X-API-Key` usage.
- The prepared consumer key authenticated successfully.
- The participant understood the rate-limit and daily-quota concepts on successful responses.
- Direct HTTP verification confirmed that the short-term limit is shared across consumer routes and cannot be bypassed by switching from competitions to fixtures.

## Post-session assessment

The #607 workflow is substantially exercised, but the gate should remain open at this evidence commit.

`API-01` produced one accepted S3 finding, `P09-F01`, which must be linked to a Gitea bug (or another explicit disposition) before #607 closes. No S1 or S2 finding was observed, so the project's mandatory accepted-S1/S2 retest rule does not apply to this finding.

`PUB-05` is retained as Partial because facilitator assistance was recorded. A short unassisted PUB-05 retest is required before the gate can truthfully satisfy the issue's no-coaching acceptance criterion. If the bearer token was actually supplied only after PUB-05 had already completed, the facilitator should correct that session note before changing the outcome.

## Evidence review

- [x] Participant identity is anonymised.
- [x] Raw API key, bearer token and personal information are absent.
- [x] Each attempted Task ID has an individual outcome.
- [x] The actionable finding is linked to its Task ID and severity-rated.
- [x] Direct HTTP verification is clearly separated from participant observation.
- [x] The actionable S3 finding has an accepted decision.
- [ ] The accepted finding is linked to its follow-up Gitea issue.
- [ ] PUB-05 has an unassisted retest, unless the recorded bearer-token assistance is corrected as having occurred after PUB-05 completion.

## AI Declaration

This anonymised session record was organised from facilitator-provided notes with the assistance of ChatGPT-Web[GPT-5.6 Sol]. The facilitator remains responsible for the recorded observations, severity and decisions.
