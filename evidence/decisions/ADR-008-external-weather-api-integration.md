# ADR-008: External Weather API Integration

- **Status:** Accepted
- **Date:** 2026-08-20
- **Participants:** Git Push Pray project team
- **Related issues:** #174

## Context

COMS3011A requires every project to integrate with a relevant external API service, distinct from and in addition to the team's own handwritten HTTP API. This was recorded as a course-wide requirement in the 2026-08-18 stakeholder meeting notes, listed separately from "established authentication supporting the required account lifecycle."

The project already integrates with Supabase Auth for Google OAuth (ADR-004). That integration satisfies the authentication requirement but is not itself a call from the backend to a third-party data provider in the course of serving application functionality, so the team is treating it as a distinct requirement rather than assuming it covers both. Direct lecturer clarification on this specific point was considered but has been placed out of scope for this issue; the team's own interpretation, consistent with how the requirement is listed separately in the stakeholder meeting record, is the basis for this decision.

The integration must not replace or auto-generate any of the project's own API endpoints; the backend remains the sole owner of `GET /api/v1/*` and calls the external provider only as an internal implementation detail of one endpoint.

## Decision

The project integrates with **Open-Meteo** (`https://api.open-meteo.com`), a free weather API that requires no API key, no account, and no request signing.

The backend exposes this through a new handwritten endpoint:

```http
GET /api/v1/weather?latitude={latitude}&longitude={longitude}&date={date}
```

Request flow:

1. The Express backend receives a request for a location and date.
2. `WeatherService.getWeather()` (`apps/backend/src/modules/weather/weather.service.ts`) validates the input, then calls the Open-Meteo `/v1/forecast` endpoint with `start_date`/`end_date` both set to the requested date and `daily` set to the required fields.
3. The response is parsed into an internal `WeatherData` shape and returned to the controller.
4. `getWeather` in `weather.controller.ts` maps the result to `{ data: ... }`, or maps a caught error to a status code (see Failure handling).
5. `createWeatherRouter` mounts the handler at `/weather` under `/api/v1` in `app.ts`, alongside the project's other routers.

No credentials are required or stored. The frontend never calls Open-Meteo directly; it only calls the project's own `/api/v1/weather` endpoint, preserving the handwritten-API boundary.

## Why relevant to the Sport Analytics Tool

Most fixtures in the T20 corpus are historical matches with a known `start_date` and, once venues are geocoded, a known location. Weather is a genuine contextual factor in cricket (rain delays, Duckworth-Lewis-Stern-affected results, outfield conditions), making a per-fixture weather lookup a small, domain-relevant addition rather than an unrelated bolt-on.

## Failure handling

`WeatherService` distinguishes three failure modes with dedicated error types so the controller does not have to string-match error messages:

| Error type               | Cause                                                                                               | HTTP status |
| ------------------------ | --------------------------------------------------------------------------------------------------- | ----------- |
| `WeatherValidationError` | Missing/non-numeric latitude or longitude, out-of-range coordinates, or a malformed date            | `400`       |
| `WeatherTimeoutError`    | The Open-Meteo request does not complete within 5000ms (`AbortController`-based timeout)            | `504`       |
| `WeatherUpstreamError`   | Non-2xx response, unreachable host, invalid JSON, or a response missing the expected `daily` fields | `502`       |
| _(unclassified)_         | Any other unexpected error                                                                          | `503`       |

Every failure is logged through the request-scoped Pino logger (`req.log.error`) before the response is sent, so failures are observable without crashing the process or leaking upstream error internals to the client.

## Alternatives considered

### OpenWeatherMap

Widely used and well-documented, but requires account sign-up and an API key, meaning credential management (`.env` handling, key rotation, rate-limit tiers) for a Basic-tier requirement that does not need it.

### A cricket-specific API (e.g., a ball-by-ball or scorecard provider)

Rejected as duplicative: the project already owns its own cricket event and statistics data model (ADR-001 onward) built from the Cricsheet corpus. Pulling a second, competing source of cricket data risks conflicting with the project's own derived statistics and would not be "small" in the sense the issue's implementation notes ask for.

### No integration / relying on Supabase Auth alone

We have decided to implement a weather API integration for cricket fixtures regardless of whether the existing Google OAuth/Supabase Auth integration could satisfy the course requirement.

We therefore did not seek separate tutor/lecturer clarification on whether authentication alone counts as the external API integration. Weather was selected because it is directly relevant to cricket fixtures and gives the project a clear, demonstrable external API integration without changing the core scope of the Sport Analytics Tool

## Advantages

- No API key or secret to manage, rotate, or accidentally commit.
- No cost or rate-limit tier to plan around for a student project.
- Small, self-contained module (`apps/backend/src/modules/weather/`) that does not touch existing fixture, statistics, or submission logic.
- Clear separation of validation, timeout, and upstream-error handling, independently testable.
- Backend remains the sole caller of the external service; the frontend and any future consumers only ever see the project's own `/api/v1/weather` contract.

## Disadvantages

- Open-Meteo's `/v1/forecast` endpoint is oriented around forecast/recent-history windows rather than arbitrary historical dates years in the past; very old fixture dates may fall outside its supported range and return no data. This is currently surfaced as a `WeatherUpstreamError` rather than a distinct "date out of range" error.
- The endpoint currently takes raw `latitude`/`longitude`, not a `fixtureId` or venue name; fixture-to-coordinate resolution (via the existing `venue` table) is not yet wired up and is left as follow-up work.
- No caching: repeated requests for the same coordinates/date each hit Open-Meteo again. Acceptable at current usage levels; would need revisiting under load.
- Adds a third-party runtime dependency (network availability of `api.open-meteo.com`) to one endpoint's availability, mitigated by the timeout and explicit `502`/`504` handling so the rest of the application is unaffected by an outage.

## Verification

The decision is considered established now that:

- `WeatherService`, `getWeather` (controller), and `createWeatherRouter` are implemented and mounted at `/api/v1/weather` in `app.ts`;
- no API key or secret is required or present in `.env.example`;
- unit tests at the integration boundary (`apps/backend/tests/unit/weather.service.test.ts`) mock `fetch` directly and cover success, non-2xx, invalid JSON, invalid response shape, and input-validation paths;
- API-level tests (`apps/backend/tests/api/weather.test.ts`) cover `200`, `400` (missing params and rejected validation), `502`, and `504` through `supertest`;
- `npm run lint`, `npm run typecheck`, `npm run format:check`, and `npm run build` all pass with the new module included;
- the endpoint is documented on the public documentation site (`docs/api/weather.md`, `docs/api/openapi.yaml`, `mkdocs.yml`).

## Deferred decisions

This ADR does not decide:

- resolving `fixtureId` to venue coordinates automatically (currently the caller supplies raw `latitude`/`longitude`);
- caching or rate-limiting outbound requests to Open-Meteo;
- frontend UI for displaying weather alongside a fixture;
- behaviour for fixture dates outside Open-Meteo's supported historical range.

## AI Declaration

The preceding document was planned and generated with the assistance of Claude Sonnet 5.
