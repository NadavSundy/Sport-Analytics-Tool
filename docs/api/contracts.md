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
request. A `not_requested` or `rejected` viewer receives
`409 INVALID_SUBMITTER_ACCESS_TRANSITION` and must create a new request before approval. Existing
approved submitters may still be re-scoped or revoked through the PATCH endpoint.

Approval replaces the complete competition scope and requires one or more unique, existing
competition identifiers:

```json
{
  "approved": true,
  "competitionIds": ["12", "18"]
}
```

Revocation always sends an empty scope:

```json
{
  "approved": false,
  "competitionIds": []
}
```

Approval is valid only for a `pending` viewer. Scope replacement and revocation are valid only for
an existing `approved` submitter. Revocation removes the `submitter` role and all scopes while
retaining the historical `approved` request decision. Rejection applies only to a `pending` viewer,
keeps the `viewer` role, writes `rejected`, and removes all scopes. A rejected viewer may request
access again.

The returned user includes the effective role, compatibility approval state, named competition
scopes, and the latest submitter-access change actor/time. `403` means the caller is not an
administrator; malformed or nonexistent scopes return `422`; protected, self-targeted, or invalid
lifecycle changes return `409`. Invalid lifecycle changes use the stable
`INVALID_SUBMITTER_ACCESS_TRANSITION` code and do not change role, request state, scopes, or audit
fields.

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

The preceding document was planned, generated, reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
