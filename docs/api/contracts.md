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
