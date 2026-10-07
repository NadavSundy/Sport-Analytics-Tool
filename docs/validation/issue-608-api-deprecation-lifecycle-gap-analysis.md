# Issue #608 API deprecation lifecycle gap analysis

## Baseline

The versioned v1 API already had one authoritative policy in
`docs/api/versioning.md`. It required a replacement, OpenAPI deprecation
metadata, public migration guidance, a retirement condition, and a documented
migration period before removal. The backend already added `API-Version: v1`
to all v1 responses, and `docs/api/openapi.yaml` already described the public
and consumer fixture-event JSON exports.

The remaining gap was demonstrable lifecycle behaviour: no implemented
operation produced a standards-aligned deprecation signal, identified a
concrete successor in the response, or showed the complete consumer path in
the policy and OpenAPI.

## Smallest safe mechanism

The implementation deprecates only:

```text
GET /api/v1/fixtures/{fixtureId}/events/export.json
```

It remains fully available and returns the unchanged JSON export. The existing
consumer-key equivalent is its successor:

```text
GET /api/v1/consumer/fixtures/{fixtureId}/events/export.json
```

Both use the same controller, response representation and filtering model. The
successor therefore provides a real, already-implemented migration target,
without duplicating a route or fabricating a removal.

The route-specific middleware emits `Deprecation: ?1` (RFC 9745) and an RFC
8288 `Link` header using `rel="successor-version"`. It substitutes the
fixture identifier and preserves the request query string, allowing a client
to follow the exact replacement URL. It validates the mapping on application
startup, rejecting missing/non-absolute replacement paths, duplicate entries,
or replacement templates that lose path parameters. Browser clients can read
the lifecycle headers through CORS.

No retirement date has been approved. `Sunset` is omitted rather than inventing
a production promise; the policy specifies the coordinated update required if
a date is later approved.

## Acceptance-criteria traceability

| Issue #608 criterion                          | Evidence                                                                                                                                                                      |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One policy and a concrete lifecycle example   | `docs/api/versioning.md` remains the policy and now contains the complete response example.                                                                                   |
| OpenAPI marks the deprecated surface          | `deprecated: true`, successor guidance and documented response headers on the public JSON export.                                                                             |
| Response metadata and replacement information | Middleware emits `Deprecation` and a concrete `successor-version` Link. No `Sunset` is applicable without an approved retirement date.                                        |
| Compatibility and no fake removal             | The existing public route/controller remains unchanged; health and other v1 routes receive no lifecycle metadata.                                                             |
| Automated verification                        | `deprecation-lifecycle.contract.test.ts` covers compatibility, headers, query preservation, unaffected v1 behaviour, OpenAPI, and invalid replacement configuration.          |
| Advanced API user-feedback                    | Completed. P13 successfully completed `API-03` on the deployed build under #612. #612 subsequently closed with an **Accepted with documented limitations** final gate result. |

## Scope and privacy review

The change is HTTP middleware and documentation only. It adds no database
behaviour, credentials, secrets, internal data, new route, or retirement date.

## AI Declaration

The preceding document was generated and edited with the assistance of
Codex[GPT-5], and later reviewed, reconciled and edited for final-state accuracy
with the assistance of ChatGPT-Web[GPT-5.6 Sol].
