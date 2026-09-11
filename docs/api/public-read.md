# Public read API

The public read API provides anonymous access to competition and fixture reference data.

No sign-in or bearer token is required for these endpoints.

All application data is served through the handwritten Express backend. Supabase-generated Data API or PostgREST endpoints are not used as the public Sport Analytics API.

## Base path

```text
/api/v1
```

## Resources

The public API exposes:

- competitions;
- seasons;
- fixtures;
- accepted fixture events;
- fixture statistics;
- competitors; and
- participants.

For cricket, competitors are teams and participants are people/players.

## Competition endpoints

```http
GET /api/v1/competitions
GET /api/v1/competitions/{competitionId}
```

Supported collection filter:

```text
name
```

Deterministic ordering:

```text
name ASC
competitionId ASC
```

## Season endpoints

```http
GET /api/v1/seasons
GET /api/v1/seasons/{seasonId}
```

Supported collection filter:

```text
competitionId
name
```

A season resource is derived from a competition and the season value recorded on its fixtures.
The `name` filter matches either the season label or its competition name.

Season resources include `competitionName` alongside `competitionId`, allowing consumers to present
the associated competition without making a separate name-resolution request. The stable identifier
remains available for routing and relationships.

`seasonId` is a stable opaque identifier derived by the backend. Consumers must not decode or derive meaning from its representation.

Deterministic ordering:

```text
competitionId ASC
season ASC
```

## Fixture endpoints

```http
GET /api/v1/fixtures
GET /api/v1/fixtures/{fixtureId}
```

Supported collection filters:

```text
competitionId
seasonId
competitorId
gender
startDateFrom
startDateTo
```

The date bounds are inclusive.

Example:

```http
GET /api/v1/fixtures?competitionId=12&competitorId=20&limit=25
```

Example response:

```json
{
  "data": [
    {
      "fixtureId": "481",
      "competitionId": "12",
      "competitionName": "Example Competition",
      "seasonId": "season_...",
      "season": "2026",
      "seasonLabel": "2026",
      "competitors": [
        {
          "competitorId": "20",
          "name": "Team One"
        },
        {
          "competitorId": "21",
          "name": "Team Two"
        }
      ],
      "matchType": "T20",
      "teamType": "international",
      "gender": "male",
      "ballsPerOver": 6,
      "scheduledOvers": 20,
      "startDate": "2026-08-09",
      "endDate": "2026-08-09"
    }
  ],
  "pagination": {
    "nextCursor": null
  }
}
```

`competitionName`, `seasonLabel` and the ordered `competitors` summaries provide the readable
relationship context required to construct a fixture title such as `Team One vs Team Two`. Existing
technical identifiers remain available for routing and machine consumers. `competitionName` is
`null` when the fixture has no associated competition.

Deterministic fixture ordering:

```text
startDate ASC
fixtureId ASC
```

## Fixture event endpoints

```http
GET /api/v1/fixtures/{fixtureId}/events
GET /api/v1/fixtures/{fixtureId}/events/{eventId}
GET /api/v1/fixtures/{fixtureId}/events/export.json
GET /api/v1/fixtures/{fixtureId}/events/export.csv
GET /api/v1/fixtures/{fixtureId}/statistics/{statisticId}/events/export.json
GET /api/v1/fixtures/{fixtureId}/statistics/{statisticId}/events/export.csv
```

These endpoints are public. They return only the current accepted revision of each cricket delivery
event. Events from pending or rejected submissions, superseded accepted revisions, submitter
accounts, submission identifiers, source event identifiers, revision numbers and audit timestamps
are not exposed.

The collection supports these filters:

```text
inningsId
competitorId
participantId
overNumber
wicketKind
```

`competitorId` selects innings in which that competitor bats. `participantId` matches any event in
which the participant is the striker, non-striker, bowler, dismissed player or an identified
fielder. `overNumber` is zero-based. `wicketKind` uses the cricket dismissal code stored by the
event model, such as `caught` or `run_out`.

Example request:

```http
GET /api/v1/fixtures/481/events?participantId=30&overNumber=4&limit=2
```

Example response:

```json
{
  "data": [
    {
      "eventId": "7021",
      "fixtureId": "481",
      "competitionId": "12",
      "competitionName": "World Twenty20",
      "inningsId": "900",
      "inningsOrdinal": 0,
      "sequenceNumber": 25,
      "overNumber": 4,
      "positionInOver": 0,
      "ballNumber": "4.1",
      "battingCompetitorId": "20",
      "battingCompetitorName": "India",
      "bowlingCompetitorId": "21",
      "bowlingCompetitorName": "Pakistan",
      "strikerParticipantId": "30",
      "strikerParticipantName": "Opening Batter",
      "nonStrikerParticipantId": "31",
      "nonStrikerParticipantName": "Non-striker",
      "bowlerParticipantId": "42",
      "bowlerParticipantName": "Opening Bowler",
      "runs": {
        "offBat": 4,
        "extras": 0,
        "total": 4,
        "nonBoundary": false
      },
      "extras": {
        "wides": null,
        "noBalls": null,
        "byes": null,
        "legByes": null,
        "penalty": null
      },
      "wickets": []
    }
  ],
  "pagination": {
    "nextCursor": "opaque-next-cursor"
  }
}
```

The occurrence order is fixed and cannot be overridden:

```text
inningsOrdinal ASC
sequenceNumber ASC
eventId ASC
```

The event identifier is the stable API identifier for that accepted delivery revision and can be
used with the detail endpoint. `ballNumber` is display-only and never controls identity or order.
An event cursor is bound to its fixture; using it for another fixture returns `INVALID_CURSOR`.
A known fixture with no accepted events returns an empty collection, while an unknown fixture or
event returns HTTP `404`.

## Fixture event exports

The two export endpoints provide the Basic-tier dataset slice for the tabular accepted fixture
event resource:

```http
GET /api/v1/fixtures/{fixtureId}/events/export.json
GET /api/v1/fixtures/{fixtureId}/events/export.csv
```

They are public and derive exclusively from the same accepted-event public-read model as the event
collection. Consequently, they preserve stable event, fixture, innings, competitor and participant
identifiers and add readable competition, team and participant names. They also retain delivery
fields such as `ballNumber`, runs, extras and wicket kinds, while never exposing account data,
submission administration fields, revision history, audit data or secrets.

Both formats accept the same filters as `GET /fixtures/{fixtureId}/events`:
`inningsId`, `competitorId`, `participantId`, `overNumber` and `wicketKind`. They do not accept
`cursor` or `limit`, and passing either is a validation error: an export is the **whole** filtered
result set in the collection's fixed occurrence order. The server reads it by following the event
collection's `nextCursor` at the maximum page size of 100 until the cursor is exhausted.

Issue #467 replaced an earlier design in which each export was capped at the first 100 events and
the cursor was discarded. That cap was silent: 23,832 of the 28,021 imported innings have more than
100 accepted events, so most innings exports were short with no indication, and the calculation
trace beside the export control displayed events the file did not contain.

A synchronous export is still bounded, at **5,000 events**. The largest fixture in the imported
corpus has 346 accepted events. An export that would exceed the bound fails as a whole with HTTP
`422` and error code `EXPORT_TOO_LARGE`, naming the filters that narrow it; a short file is never
returned. A failure while reading any page, including after earlier pages have been read, returns an
error response rather than the rows read so far. Versioned snapshots and background jobs remain
outside this scope.

The JSON endpoint returns `{ "data": [...] }` without pagination metadata. The CSV endpoint returns
`text/csv; charset=utf-8` with a trace-specific attachment name such as
`fixture-481-player-30-over-4-events.csv`. The filename includes every active innings, team, player,
over and wicket-kind filter; an unfiltered export uses `all`. Its columns and their order are stable:
event, fixture and competition identity; zero-based innings and delivery position; competitor and
participant identifiers paired with names; run and extras fields; then flattened wicket identifiers,
kinds, dismissed participants and fielders paired with names. Multiple wicket values use `|` within
their escaped CSV field. Both formats represent an absent extras category as numeric `0`.

Example:

```http
GET /api/v1/fixtures/481/events/export.csv?participantId=30&overNumber=4
```

### Calculation-trace exports

A calculation trace exports exactly the events it displays:

```http
GET /api/v1/fixtures/{fixtureId}/statistics/{statisticId}/events/export.json
GET /api/v1/fixtures/{fixtureId}/statistics/{statisticId}/events/export.csv
```

The event set is the statistic's own contributing events, taken from the same derivation as
`GET /fixtures/{fixtureId}/statistics/{statisticId}?includeContributors=true`, and read in full
through the same paging and bound as the filtered export. The rows, columns, escaping and filename
convention are identical to the filtered export. These endpoints accept no query parameters.

This is deliberately not the same set as the filtered export with `participantId`. That filter
matches every delivery involving the participant, including those where they were the non-striker,
were dismissed or fielded, and it does not exclude super-over innings. A player's calculation trace
contains only the standard-innings deliveries they faced or bowled, because those are the deliveries
their batting and bowling figures are calculated from. For participant 14255 in fixture 8936 the
trace holds 6 deliveries and the participant filter 11. The filtered export remains available for
that wider involvement.

Because the trace and the event rows are read separately, a correction accepted between the two
reads could make them differ. The export then returns HTTP `409` with `EXPORT_TRACE_CHANGED` instead
of a file that disagrees with the trace it is named after.

## Fixture statistics endpoints

```http
GET /api/v1/fixtures/{fixtureId}/statistics
GET /api/v1/fixtures/{fixtureId}/statistics/{statisticId}
```

Both endpoints are public. Only fixtures and delivery revisions belonging to accepted submissions
are eligible for publication. The collection returns stable, opaque statistic identifiers for each
innings team-total resource and each participant fixture-statistics resource. A resource identifier
can be used on the detail endpoint and remains stable when the same accepted event state is replayed.

The default response is compact: it gives `sourceEventCount` but omits the delivery records. Add the
following query only when a trace is required:

```text
includeContributors=true
```

When requested, `contributingEvents` contains the accepted delivery records in innings and
`inningsSequence` order. Superseded or pending/rejected delivery revisions are never exposed.

Example compact response:

```json
{
  "data": {
    "fixtureId": "481",
    "status": "complete",
    "scope": {
      "superOversIncluded": false
    },
    "outcome": {
      "kind": "won",
      "winnerCompetitorId": "20",
      "winnerCompetitorName": "Team One",
      "eliminatorCompetitorId": null,
      "eliminatorCompetitorName": null,
      "margin": {
        "type": "wickets",
        "value": 8
      },
      "method": null,
      "decidedByBowlOut": false
    },
    "warnings": [],
    "statistics": [
      {
        "statisticId": "stat_opaque-value",
        "fixtureId": "481",
        "scope": "innings",
        "statisticCode": "team_total",
        "inningsId": "900",
        "inningsOrdinal": 0,
        "competitorId": "20",
        "competitorName": "Team One",
        "sourceEventCount": 120,
        "metrics": {
          "deliveryRuns": 154,
          "penaltyRuns": 5,
          "totalRuns": 159
        }
      }
    ]
  }
}
```

Team and player statistic resources expose readable names alongside their stable identifiers.
Participant statistics include `participantName` and, where known, `competitorName`. Fixture outcomes
include the readable winning-team name where applicable.

When `includeContributors=true` is requested, each contributing event retains the striker and bowler
participant identifiers and also includes `strikerParticipantName` and `bowlerParticipantName`.
This allows user-facing calculation traces to identify the players without extra lookup requests.

`status` is `partial` rather than failing the request when accepted source data is incomplete. The
`warnings` array then gives stable warning codes, and rate metrics with a zero denominator are
`null`. See [Fixture statistic calculations](../statistics/fixture-statistics.md) for the complete
mapping and trace rules.

## Competitor endpoints

```http
GET /api/v1/competitors
GET /api/v1/competitors/{competitorId}
```

Supported filters:

```text
competitionId
seasonId
name
```

A competitor represents a cricket team.

Deterministic ordering:

```text
name ASC
competitorId ASC
```

## Participant endpoints

```http
GET /api/v1/participants
GET /api/v1/participants/{participantId}
GET /api/v1/participants/{participantId}/fixtures
```

Supported filters:

```text
fixtureId
competitorId
name
```

Only public participant fields are returned.

Internal source references, authentication data, submission records and audit information are not exposed.

The fixture-history endpoint returns the fixtures in which the player was selected, newest first.
Each entry includes the readable competition name, season, date, match type, both named teams, the
player's team and squad role, and that player's available fixture-level batting and bowling figures.
Selection is participation: a selected player remains in the history even when they did not bat or
bowl, in which case the corresponding figure is `null`.

Example:

```http
GET /api/v1/participants/30/fixtures?limit=25
```

```json
{
  "data": [
    {
      "fixture": {
        "fixtureId": "481",
        "competitionId": "12",
        "competitionName": "Example Competition",
        "seasonId": "season_...",
        "season": "2026",
        "seasonLabel": "2026",
        "competitors": [
          { "competitorId": "20", "name": "Team One" },
          { "competitorId": "21", "name": "Team Two" }
        ],
        "matchType": "T20",
        "teamType": "international",
        "gender": "male",
        "ballsPerOver": 6,
        "scheduledOvers": 20,
        "startDate": "2026-08-09",
        "endDate": "2026-08-09"
      },
      "competitionName": "Example Competition",
      "competitors": [
        { "competitorId": "20", "name": "Team One" },
        { "competitorId": "21", "name": "Team Two" }
      ],
      "competitor": { "competitorId": "20", "name": "Team One" },
      "role": "player",
      "statisticsStatus": "complete",
      "statisticsWarnings": [],
      "batting": {
        "runsScored": 55,
        "ballsFaced": 40,
        "fours": 4,
        "sixes": 2,
        "strikeRate": 137.5
      },
      "bowling": null
    }
  ],
  "pagination": {
    "nextCursor": null
  }
}
```

`statisticsStatus` and `statisticsWarnings` preserve the publication state used by the fixture
statistics API. A fixture with incomplete accepted source data or no accepted delivery events is
returned with `partial` status and stable warnings rather than silently omitted. The endpoint does
not calculate season or career aggregates.

Deterministic ordering:

```text
displayName ASC
participantId ASC
```

Deterministic participant fixture-history ordering:

```text
startDate DESC
fixtureId DESC
```

## Pagination

Collection endpoints use cursor pagination.

The default page size is:

```text
50
```

The maximum page size is:

```text
100
```

Example:

```http
GET /api/v1/competitions?limit=25
```

A response may contain:

```json
{
  "pagination": {
    "nextCursor": "opaque-next-cursor"
  }
}
```

The next request can use:

```http
GET /api/v1/competitions?limit=25&cursor=opaque-next-cursor
```

Cursors and resource identifiers are opaque. Consumers must not derive meaning from their representation.

## Not-found responses

Unknown resource identifiers return HTTP `404`.

Example:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Competition not found."
  }
}
```

## Invalid requests

Invalid filters, page sizes or cursors return HTTP `400` using the shared machine-readable API error format.

## OpenAPI

The machine-readable specification is documented in the [OpenAPI specification](openapi.md).

## AI Declaration

The preceding document was planned, generated, reviewed and edited with the assistance of
ChatGPT-Web[GPT-5.6 Sol] and Codex[GPT-5]. The complete export and calculation-trace export
documentation for issue #467 was updated with the assistance of Claude Code[Claude Opus 5].
