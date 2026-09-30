Stable IDs
──────────
API resource IDs are JSON strings.
They are stable, immutable, opaque and non-recycled.
Mutable names are never IDs.
External source_ref values are provenance, not primary API IDs.

Dates
─────
Calendar dates: YYYY-MM-DD

Timestamps
──────────
ISO 8601 / RFC 3339 UTC timestamps:
2026-08-09T12:30:00.000Z

Event order
───────────
innings.ordinal ASC
then
delivery.innings_sequence ASC

ball_number is display-only and MUST NOT determine event order.

Corrections retain the innings_sequence of the event
they supersede.

Pagination
──────────
Cursor pagination is the Basic API pagination strategy.

?limit=50
?limit=50&cursor=<opaque-cursor>

Default limit: 50
Maximum limit: 100

Consumers must treat cursors as opaque.

Collection response
───────────────────
{
"data": [],
"pagination": {
"nextCursor": null
}
}

Filtering
─────────
Filters use explicit camelCase query parameters.

Examples:
?competitionId=12
?season=2026
?startDateFrom=2026-01-01

Arbitrary SQL-style or database-generated filters are not exposed.

Sorting
───────
?sort=startDate&direction=asc

direction is either:
asc
desc

Every endpoint must whitelist supported sort fields.

A stable identifier must be used as the final tie-breaker
so pagination remains deterministic.

Event endpoints always use event occurrence order.

Administrator submitter access
------------------------------

`GET /api/v1/admin/users` and
`PATCH /api/v1/admin/users/{userId}/submitter-access` require the authoritative `admin` role. A
pending request is rejected through the separate administrator-only
`POST /api/v1/admin/users/{userId}/submitter-access/rejection` action.

New approval and rejection decisions require the target to be a `viewer` with a persisted `pending`
request. The pending request exposes its named requested competition in the current-user and
administrator responses. A `not_requested` or `rejected` viewer receives
`409 INVALID_SUBMITTER_ACCESS_TRANSITION` and must create a new request before approval. Existing
approved submitters may still be re-scoped or revoked through the PATCH endpoint.

Approval replaces the complete competition scope and requires exactly the competition identifier
stored on the pending request:

```json
{
  "approved": true,
  "competitionIds": ["12"]
}
```

Revocation always sends an empty scope:

```json
{
  "approved": false,
  "competitionIds": []
}
```

Approval is valid only for a `pending` viewer and fails closed when the request lacks a stored
competition or the body names a different scope. Scope replacement and revocation are valid only
for an existing `approved` submitter; scope replacement may still grant multiple competitions.
Revocation removes the `submitter` role and all scopes while retaining the historical `approved`
request decision. Rejection applies only to a `pending` viewer, keeps the `viewer` role, writes
`rejected`, and removes all scopes. Rejected and revoked viewers may each request access again;
pending requests and currently authorised submitters still receive `409`. Every request, approval,
rejection, and revocation is retained in immutable submitter-access history. Administrator user
responses expose `previouslyRevoked` so a pending re-request is visibly flagged for review.

The returned user includes the effective role, compatibility approval state, named requested
competition, named granted competition scopes, prior-revocation flag, and the latest
submitter-access change actor/time.
`403` means the caller is not an
administrator; malformed or nonexistent scopes return `422`; protected, self-targeted, or invalid
lifecycle changes return `409`. Invalid lifecycle changes use the stable
`INVALID_SUBMITTER_ACCESS_TRANSITION` code and do not change role, request state, scopes, or audit
fields.

Analytics query definitions
---------------------------

A question asked in natural language is answered by translating it into exactly one _query
definition_ and validating that definition against `analyticsQueryDefinitionSchema` in
`@sport-analytics/contracts`. A validated definition is then answered from the statistics the
platform already publishes.

This contract covers natural-language querying over published statistics only. It is not the
analyst-defined statistic engine: it defines no calculation, no expression language and no stored
definition, and every kind it admits names a result an existing endpoint already produces.

`QUERY_DEFINITION_VERSION` names the version of this contract, currently `1.0`.

The schema is the validation boundary a translated question must cross, and is therefore closed
rather than expressive:

- every object is strict, so a definition carrying an unrecognised property must be rejected rather
  than accepted with the property ignored;
- every value must be an enumerated choice, a whole number within a published bound, or a bounded
  name hint, so no part of a definition may be free text; and
- a name hint may only be resolved to an identifier by an ordinary server-side lookup, and may only
  ever reach the database as a bound query parameter.

A definition names what is being asked for in `kind`. Four kinds are defined.

| `kind`                   | Answers                                              | Properties                                      |
| ------------------------ | ---------------------------------------------------- | ----------------------------------------------- |
| `leaderboard`            | A ranking within one season or competition           | `metric`, `scope`, the scope reference, `limit` |
| `participant_statistics` | One player's published figures at one scope          | `participant`, `scope`, the scope reference     |
| `participant_comparison` | Two players' published figures at the same scope     | `participants`, `scope`, the scope reference    |
| `unsupported`            | That the published statistics do not hold the answer | `reason`                                        |

`metric` may only be one of the metrics the published leaderboard ranks, and `scope` may only be one
of the scopes the published participant aggregates expose. Both are taken from the existing schemas
rather than restated, so the vocabularies cannot drift apart. A `leaderboard` may only be scoped to a
season or a competition, because the published leaderboard ranks no career. `limit` is an optional
whole number from 1 to 50 and defaults to 10; a definition may not request an unbounded ranking.
`participants` must contain exactly two references.

`scope` and its reference are tied together. A `season` scope must carry a `season` reference, a
`competition` scope must carry a `competition` reference, and a `career` scope must carry neither. A
definition carrying a reference its scope would not use must be rejected, so a reference can never be
silently discarded.

A reference is a name hint, never an identifier. A participant or competition reference carries a
`name`; a season reference carries a `competitionName` and a `seasonLabel`, because a season has no
name of its own and is identified by its competition together with its label. Every name must be
between 1 and 100 characters once surrounding whitespace is removed, and must not contain control,
formatting, surrogate or private-use characters. Names are not restricted to ASCII: apostrophes,
hyphens, spaces and accented characters all appear in cricket names and must be accepted.

```json
{
  "kind": "leaderboard",
  "metric": "most_runs",
  "scope": "season",
  "season": { "competitionName": "Indian Premier League", "seasonLabel": "2026" },
  "limit": 10
}
```

```json
{
  "kind": "participant_comparison",
  "participants": [{ "name": "Quinton de Kock" }, { "name": "D'Arcy Short" }],
  "scope": "career"
}
```

A question the published statistics cannot answer must be represented by the `unsupported` kind
rather than by an approximation. Its `reason` names why: `bowler_type`, `batting_hand`,
`match_phase`, `venue` and `super_over` name dimensions the platform does not publish;
`outside_cricket_statistics` covers a question that is not about published cricket statistics at all;
`ambiguous` covers a question that does not say which player, competition or season it means; and
`other` covers any remaining case.

`ANALYTICS_QUERY_PROMPT_DESCRIPTION` states this contract in prose for a translation step. Its
metric, scope and reason lists are built from the schemas, so the description and the schema cannot
disagree.

Errors
──────
{
"error": {
"code": "VALIDATION_FAILED",
"message": "The request is invalid.",
"details": [
{
"code": "INVALID_EVENT",
"eventIndex": 3,
"field": "runsTotal",
"message": "runsTotal is inconsistent with the event."
}
]
}
}

## AI Declaration

The preceding document was planned, generated, reviewed and edited with the assistance of
ChatGPT-Web[GPT-5.6 Sol]. The competition-scoped submitter access contract and issue #256
re-request lifecycle were updated with the assistance of Codex[GPT-5]. The issue #811 analytics
query-definition contract was added with the assistance of Claude-Code[Claude Opus 5 (1M context)].
