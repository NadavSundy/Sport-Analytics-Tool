# Direct event submissions

`POST /api/v1/submissions` accepts JSON from an authenticated, approved submitter. The backend
looks up the fixture's competition and compares it with the account's server-owned competition
scope. Client-supplied roles or scope values are ignored.

The current schema version is `1.0`. A request contains one fixture and 1–1,000 ordered cricket
delivery events. Events for each innings must appear in ascending `sequenceNumber` order. Statistics
are not accepted: the platform derives them from accepted deliveries.

```http
POST /api/v1/submissions
Authorization: Bearer <supabase-access-token>
Content-Type: application/json
```

```json
{
  "fixtureId": "42",
  "schemaVersion": "1.0",
  "events": [
    {
      "eventId": "123e4567-e89b-42d3-a456-426614174000",
      "inningsId": "81",
      "sequenceNumber": 1,
      "overNumber": 0,
      "positionInOver": 0,
      "ballNumber": "0.1",
      "strikerId": "101",
      "nonStrikerId": "102",
      "bowlerId": "201",
      "runs": {
        "offBat": 4,
        "extras": 0,
        "total": 4,
        "nonBoundary": false
      },
      "extras": {},
      "wickets": []
    }
  ]
}
```

Successful validation and storage are synchronous and atomic:

```http
HTTP/1.1 201 Created
```

```json
{
  "data": {
    "submissionId": "300",
    "fixtureId": "42",
    "submitterId": "17",
    "status": "accepted",
    "receivedAt": "2026-08-13T16:00:00.000Z",
    "schemaVersion": "1.0",
    "eventCount": 1
  }
}
```

The backend records the submitter, fixture, received timestamp, schema version, original event ID,
and zero-based event-array position. A globally unique event UUID protects against accidental retry
or replay. If any event is invalid or conflicts, the transaction rolls back and stores neither the
submission nor any of its events.

Responses are `401` for missing or invalid authentication, `403` for unapproved or out-of-scope
accounts, `409` for event conflicts, `413` above the 1 MB JSON limit, `422` for contract or reference
validation, and `429` after 30 requests from one account in 60 seconds. Validation details include a
field path and `eventIndex` where applicable.

## AI Declaration

The direct submission API documentation was generated with the assistance of Codex[GPT-5.6 Sol].
