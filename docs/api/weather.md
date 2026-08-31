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

Open-Meteo splits its data across two endpoints, and the backend selects between them based on the
requested date:

- **Forecast** (`api.open-meteo.com/v1/forecast`) — used for dates from 92 days in the past through
  16 days in the future.
- **Archive** (`archive-api.open-meteo.com/v1/archive`) — used for historical dates from
  `1940-01-01` up to the start of the forecast endpoint's supported window.

This selection happens entirely inside the backend's weather integration; callers of
`/api/v1/weather` and `/api/v1/fixtures/{fixtureId}/weather` do not need to know or specify which
provider endpoint served a given date.

## Request

```http
GET /api/v1/weather?latitude={latitude}&longitude={longitude}&date={date}
```

### Fixture weather

```http
GET /api/v1/fixtures/{fixtureId}/weather
```

This endpoint automatically uses the fixture's `start_date` and optional stored venue coordinates.
It is the appropriate endpoint for fixture pages: the frontend calls this backend endpoint only and
never calls Open-Meteo. Weather is contextual external information; it does not change or
authoritatively describe fixture, event, or statistic records.

When weather is available, the response includes fixture and venue context plus the same daily
temperature, precipitation, and wind fields returned by `/weather`:

```json
{
  "data": {
    "fixtureId": "17",
    "date": "2026-08-19",
    "availability": "available",
    "venue": { "name": "Wits Cricket Oval", "city": "Johannesburg" },
    "weather": {
      "date": "2026-08-19",
      "latitude": -26.1929,
      "longitude": 28.0305,
      "temperatureMax": 24,
      "temperatureMin": 11,
      "precipitationSum": 0,
      "windSpeedMax": 17
    }
  }
}
```

An existing fixture without a venue, complete coordinates, or supported coordinate values returns
`200 OK` with `availability: "unavailable"`, a machine-readable reason (`MISSING_VENUE`,
`MISSING_COORDINATES`, `UNSUPPORTED_LOCATION`, or `UNSUPPORTED_DATE`), and `weather: null`. This
does not call the provider or invent a location or date. `UNSUPPORTED_DATE` is returned when the
fixture's date falls outside both the forecast and archive endpoints' supported ranges (see
"External provider" above). An unknown fixture returns `404 NOT_FOUND`. Provider failures return
the same `502`, `503`, or `504` codes as the direct weather endpoint and affect only this weather
request, not ordinary fixture reads.

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
| `422`  | `DATE_UNSUPPORTED`            | `date` is validly formatted but falls outside both the forecast and archive endpoints' supported ranges. |
| `502`  | `UPSTREAM_ERROR`              | Open-Meteo returned a non-2xx response, invalid JSON, or an unexpected response shape.          |
| `503`  | `WEATHER_SERVICE_UNAVAILABLE` | An unclassified failure occurred while contacting Open-Meteo.                                   |
| `504`  | `UPSTREAM_TIMEOUT`            | Open-Meteo did not respond within the configured timeout (5000ms).                              |

A `502`/`503`/`504` means the external provider is unavailable or misbehaving; it does not indicate
a problem with the project's own API surface. The backend logs the underlying error before
responding, so failures remain observable without crashing the application or leaking upstream
error internals to the client.

## Known limitations

- Venue coordinates are optional stored data (`venue.latitude` and `venue.longitude`); imported
  Cricsheet venue names/cities are not geocoded. Fixtures without stored coordinates therefore
  return the documented unavailable state.
- Open-Meteo's archive endpoint only covers dates from `1940-01-01` onward, and the forecast
  endpoint only extends 16 days into the future. Dates outside this combined range return
  `422 DATE_UNSUPPORTED` from `/api/v1/weather`, or `availability: "unavailable"` with reason
  `UNSUPPORTED_DATE` from the fixture-weather endpoint, rather than an upstream error.
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
   npx vitest run tests/unit/fixture-weather.service.test.ts tests/api/fixture-weather.test.ts
   ```

   The unit tests mock `fetch` directly to cover a successful response, a non-2xx response,
   invalid JSON, and an unexpected response shape. Fixture-weather tests mock the existing
   `WeatherService` to confirm fixture dates and stored coordinates are passed through, unavailable
   locations avoid provider calls, and provider failures map to safe API responses.

## OpenAPI

The machine-readable specification is documented in the [OpenAPI specification](openapi.md), under
the `Weather` tag.

## AI Declaration

The preceding document was planned and generated with the assistance of Claude Sonnet 5.