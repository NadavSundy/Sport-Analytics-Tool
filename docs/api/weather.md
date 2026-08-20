# Weather API

`GET /api/v1/weather` returns observed daily weather for a location and date. It backs the
project's course-required external API integration; see
[ADR-008](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-008-external-weather-api-integration.md)
for the decision and its context.

No sign-in or bearer token is required for this endpoint.

## Base path

```text
/api/v1
```

## External provider

Weather data is retrieved server-side from [Open-Meteo](https://open-meteo.com), a free weather
API that requires no API key. The frontend never calls Open-Meteo directly; it only calls this
project's own `/api/v1/weather` endpoint, and Open-Meteo is called exclusively from the backend
(`apps/backend/src/modules/weather/weather.service.ts`).

## Request

```http
GET /api/v1/weather?latitude={latitude}&longitude={longitude}&date={date}
```

| Parameter   | Required | Description                                |
| ----------- | -------- | ------------------------------------------ |
| `latitude`  | Yes      | Decimal degrees, between `-90` and `90`.   |
| `longitude` | Yes      | Decimal degrees, between `-180` and `180`. |
| `date`      | Yes      | `YYYY-MM-DD`.                              |

Example:

```http
GET /api/v1/weather?latitude=-26.2041&longitude=28.0473&date=2026-08-19
```

## Response

```http
HTTP/1.1 200 OK
```

```json
{
  "data": {
    "date": "2026-08-19",
    "latitude": -26.2041,
    "longitude": 28.0473,
    "temperatureMax": 23.4,
    "temperatureMin": 10.2,
    "precipitationSum": 0,
    "windSpeedMax": 18.5
  }
}
```

`temperatureMax`/`temperatureMin` are in degrees Celsius, `precipitationSum` is in millimetres and
`windSpeedMax` is in km/h. Any of these fields may be `null` if Open-Meteo did not return a value
for the requested date.

## Error responses

The endpoint uses the shared machine-readable API error format:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "latitude, longitude and date are required. Latitude and longitude must be numbers."
  }
}
```

| Status | Code                          | Cause                                                                                           |
| ------ | ----------------------------- | ----------------------------------------------------------------------------------------------- |
| `400`  | `VALIDATION_FAILED`           | Missing/non-numeric `latitude` or `longitude`, out-of-range coordinates, or a malformed `date`. |
| `502`  | `UPSTREAM_ERROR`              | Open-Meteo returned a non-2xx response, invalid JSON, or an unexpected response shape.          |
| `503`  | `WEATHER_SERVICE_UNAVAILABLE` | An unclassified failure occurred while contacting Open-Meteo.                                   |
| `504`  | `UPSTREAM_TIMEOUT`            | Open-Meteo did not respond within the configured timeout (5000ms).                              |

A `502`/`503`/`504` means the external provider is unavailable or misbehaving; it does not indicate
a problem with the project's own API surface. The backend logs the underlying error before
responding, so failures remain observable without crashing the application or leaking upstream
error internals to the client.

## Known limitations

- The endpoint currently takes raw `latitude`/`longitude` rather than a `fixtureId`. Resolving a
  fixture's venue to coordinates automatically is deferred (see ADR-008).
- Open-Meteo's forecast endpoint may not have data for dates far outside its supported historical
  window; requesting such a date currently surfaces as a `502 UPSTREAM_ERROR`.
- Responses are not cached; repeated requests for the same location and date each call Open-Meteo
  again.

## Testing locally

No API key or account is required.

1. Start the backend: `npm run dev:backend` (or `npm run dev` from the repository root).
2. Request the endpoint directly:

   ```bash
   curl "http://localhost:3000/api/v1/weather?latitude=-26.2041&longitude=28.0473&date=2026-08-19"
   ```

3. To exercise the failure paths without depending on network conditions, run the automated tests
   instead of manual requests:

   ```bash
   cd apps/backend
   npx vitest run tests/unit/weather.service.test.ts
   npx vitest run tests/api/weather.test.ts
   ```

   The unit tests mock `fetch` directly to cover a successful response, a non-2xx response,
   invalid JSON, and an unexpected response shape. The API-level tests mock `WeatherService` to
   confirm the controller maps each failure type to the correct HTTP status and error code.

## OpenAPI

The machine-readable specification is documented in the [OpenAPI specification](openapi.md), under
the `Weather` tag.

## AI Declaration

The preceding document was planned and generated with the assistance of Claude Sonnet 5.