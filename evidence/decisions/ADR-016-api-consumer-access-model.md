# ADR-016: One canonical read API with optional consumer identification

- **Status:** Accepted
- **Date:** 2026-09-30
- **Participants:** Nadav Sundy
- **Related issues:** [#820](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/820),
  [#821](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/821),
  [#822](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/822)

## Context

The API is a product for both the public Stat'sTheGame experience and external integrations. It
currently exposes anonymous cricket resources at `/api/v1/*` and repeats part of that resource
model below `/api/v1/consumer/*`. The repeated routes call the same public-read and statistics
controllers, but the consumer aliases additionally require an API key, apply per-consumer limits
and record usage. A caller can therefore obtain the same payload anonymously and avoid consumer
accounting. The key identifies a caller but, for the duplicated reads, provides little product
benefit.

This record separates verified current behaviour from the accepted future model. It changes no
route, middleware, OpenAPI operation, limit or database record. Issues #821 and #822 own those
implementation changes.

## Current behaviour

### Anonymous public-read surface

The following implemented operations accept no consumer credential:

| Resource                                    | Anonymous operations                                                                                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Competitions and seasons                    | `GET /competitions`, `GET /competitions/{competitionId}`, `GET /seasons`, `GET /seasons/{seasonId}`                                                           |
| Fixtures and accepted events                | `GET /fixtures`, `GET /fixtures/{fixtureId}`, `GET /fixtures/{fixtureId}/events`, `GET /fixtures/{fixtureId}/events/{eventId}`                                |
| Bounded event and calculation-trace exports | `GET /fixtures/{fixtureId}/events/export.{json,csv}`, `GET /fixtures/{fixtureId}/statistics/{statisticId}/events/export.{json,csv}`                           |
| Fixture statistics                          | `GET /fixtures/{fixtureId}/statistics`, `GET /fixtures/{fixtureId}/statistics/{statisticId}`                                                                  |
| Competitors and participants                | `GET /competitors`, `GET /competitors/{competitorId}`, `GET /participants`, `GET /participants/{participantId}`, `GET /participants/{participantId}/fixtures` |
| Participant statistics                      | `GET /participants/{participantId}/statistics`, `GET /participants/{participantId}/statistics/{statisticId}`                                                  |
| Ranked aggregates                           | `GET /statistics/leaderboards`                                                                                                                                |

Public health, authentication entry points, weather, OpenAPI and published dataset-release reads
also remain outside the consumer hierarchy, but they are not aliases of consumer cricket-resource
routes and are not candidates for consolidation in this decision.

Anonymous cricket reads currently have endpoint bounds such as pagination and export limits, but
they do not use the API-consumer minute limiter, daily quota or usage telemetry. There is no
equivalent application-level anonymous request-rate control.

### Consumer surface and comparison

Every current `/api/v1/consumer/*` operation requires a valid active `X-API-Key`. Authentication
then consumes the consumer's shared PostgreSQL minute limit and UTC daily quota and records safe
usage telemetry. Unknown, malformed and revoked keys receive the same generic `401` response.

Thirteen routes are aliases with the same controllers and response contracts as anonymous routes:

| Current consumer alias                                                                 | Anonymous equivalent                                                          | Classification       |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------- |
| `GET /consumer/competitions`                                                           | `GET /competitions`                                                           | Duplicate            |
| `GET /consumer/fixtures`                                                               | `GET /fixtures`                                                               | Duplicate            |
| `GET /consumer/fixtures/{fixtureId}`                                                   | `GET /fixtures/{fixtureId}`                                                   | Duplicate            |
| `GET /consumer/fixtures/{fixtureId}/events`                                            | `GET /fixtures/{fixtureId}/events`                                            | Duplicate            |
| `GET /consumer/fixtures/{fixtureId}/events/export.{json,csv}`                          | `GET /fixtures/{fixtureId}/events/export.{json,csv}`                          | Two duplicate routes |
| `GET /consumer/fixtures/{fixtureId}/events/{eventId}`                                  | `GET /fixtures/{fixtureId}/events/{eventId}`                                  | Duplicate            |
| `GET /consumer/fixtures/{fixtureId}/statistics`                                        | `GET /fixtures/{fixtureId}/statistics`                                        | Duplicate            |
| `GET /consumer/fixtures/{fixtureId}/statistics/{statisticId}`                          | `GET /fixtures/{fixtureId}/statistics/{statisticId}`                          | Duplicate            |
| `GET /consumer/fixtures/{fixtureId}/statistics/{statisticId}/events/export.{json,csv}` | `GET /fixtures/{fixtureId}/statistics/{statisticId}/events/export.{json,csv}` | Two duplicate routes |
| `GET /consumer/participants/{participantId}/statistics`                                | `GET /participants/{participantId}/statistics`                                | Duplicate            |
| `GET /consumer/participants/{participantId}/statistics/{statisticId}`                  | `GET /participants/{participantId}/statistics/{statisticId}`                  | Duplicate            |

`GET /api/v1/consumer/usage` is genuinely consumer-specific. It derives the subject from the key
and returns that consumer's bounded usage aggregate; it has no anonymous equivalent and must remain
key-protected.

The current ownership model stores the administrator who issued a consumer as
`owner_app_user_id`. Owner-scoped list, usage, rotation and revocation operations consequently
represent the issuing administrator rather than necessarily the external person or application
that uses the key. Creation and rotation return the raw secret once to that administrator.

## Accepted future model

### Responsibilities of a consumer key

A consumer key identifies an approved external application or user and selects its managed service
policy. It:

- authenticates a stable API-consumer identity, not a normal application user or administrator;
- selects that consumer's configured minute limit and UTC daily quota;
- attributes privacy-minimised usage telemetry to the consumer and key metadata;
- grants access to documented consumer-only or higher-cost capabilities; and
- supports independent rotation and revocation without changing a public resource URL.

A key does not make public cricket facts secret, grant bearer-authenticated application roles, or
create a second representation of the same resource.

### Canonical resource hierarchy

Public cricket resources use one canonical `/api/v1/*` hierarchy. An applicable canonical read
supports two request modes:

1. no `X-API-Key`: admit the request under the anonymous policy; or
2. a valid active `X-API-Key`: admit it under that consumer's limits and record consumer usage.

If the header is present but malformed, unknown or revoked, return the generic API-key `401`. Never
silently downgrade a failed credential to anonymous access. An admitted consumer request uses the
consumer policy only; it does not also consume the anonymous source allowance.

Issue [#821](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/821) implements this
request flow. Payloads, filters, pagination, identifiers and deterministic ordering remain the same
unless a separately approved contract change says otherwise.

### Anonymous access

All currently anonymous cricket reads listed above remain anonymously available when #821 first
implements this model. Their existing bounded page and synchronous export sizes remain in force.
This preserves the public website, exploratory use, teaching use and low-volume integrations.

Authentication, health, OpenAPI, weather and dataset-release access keep their separately
documented policies. This ADR does not convert them into consumer operations.

### Anonymous automated-use controls

Anonymous does not mean unbounded. #821 must add an application-enforced, configurable anonymous
minute limit to applicable canonical reads with these properties:

- a lower default allowance than the authenticated-consumer default;
- a durable shared counter across backend replicas, not process-local state;
- a privacy-preserving key derived with a server-held secret from the trusted client source address,
  after explicit reverse-proxy trust configuration, with neither raw addresses nor derived keys in
  usage telemetry;
- a global anonymous request budget so distributed sources cannot create unlimited aggregate load;
- `429` responses with documented limit and retry metadata; and
- fail-closed admission when the shared limiter is unavailable.

The implementation issue chooses and documents measured numeric defaults and the global budget; it
must not guess proxy trust or accept a caller-supplied forwarding header. Endpoint pagination,
filter, export-size, request-size, timeout and concurrency bounds remain a second protection layer.
Infrastructure controls may supplement, but not replace, the application policy.

Anonymous requests have no durable daily quota because an address is neither a stable consumer
identity nor a fair daily identity behind shared networks. A consumer that omits its key can use
only the lower, globally bounded anonymous service; it gains no telemetry, higher allowance or
consumer-only capability. Consumer quotas therefore cannot be replaced with unrestricted anonymous
requests, while genuinely public reads remain usable.

### Future consumer-only capabilities and higher-cost access

`GET /api/v1/consumer/usage` remains consumer-only and separate from cricket resources. Future
features may legitimately require a key when they reserve capacity, retain consumer state, need an
owner for results or create materially higher cost. Examples are:

- bulk exports larger than the anonymous synchronous export bounds;
- asynchronous analytical or export jobs and their result collection;
- change feeds, durable cursors, replay or long-lived streams; and
- higher page sizes, sustained request rates or service levels than anonymous use.

These features should use canonical resource or job URLs and require consumer authentication; they
must not recreate a parallel copy of ordinary cricket reads. Each still needs its own approved
contract, authorization, cost bounds and retention policy. Possessing a key does not automatically
authorize every future expensive operation.

### Compatibility and deprecation

The existing `/api/v1/consumer/*` cricket-resource aliases remain implemented until #821 applies the
project deprecation policy. That issue must:

1. make the canonical path accept optional consumer identification;
2. update OpenAPI, examples and the API Explorer to prefer that path;
3. retain each alias for a documented migration period with a standard `Deprecation` header and a
   successor link (`rel="successor-version"`) pointing to the canonical path while preserving its
   query;
4. publish a reviewed retirement milestone or date before sending `Sunset`; and
5. remove an alias only after its published retirement condition is met.

The currently active deprecation from the public fixture-event JSON export to its consumer alias is
inconsistent with the accepted direction. #821 must restore the public path as canonical, remove
that deprecation signal, and deprecate the consumer alias in the same compatibility change. This ADR
does not alter the currently deployed headers.

### Consumer ownership and access lifecycle

An API consumer belongs to the application user approved to operate the external integration, not
to the administrator who reviewed or issued it. Ownership, the access decision and the reviewing
administrator are separate records. Administrators retain policy and emergency-administration
authority without becoming the consumer owner.

Adopt the lifecycle specified by
[#822](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/822):

1. an authenticated eligible user requests consumer access with an application name and intended
   use;
2. an administrator approves or rejects the pending request and the decision is audited;
3. approval creates or activates a consumer owned by the requester and assigns administrator-set
   limits, but creates no secret;
4. the approved owner explicitly generates the first key while present; and
5. the owner manages their safe key metadata, rotation, revocation and usage, while administrators
   can change limits or revoke access.

This provides an auditable user-request → administrator-review → consumer-access flow without
delivering the owner's credential to the reviewer. Account disablement, deletion or withdrawal of
consumer access must prevent active keys from continuing to authorize requests; #822 owns the
database migration and exact lifecycle transitions.

### Key security lifecycle

- Generate secrets with a cryptographically secure random generator and enough entropy to resist
  online and offline guessing. Include only a non-secret prefix needed for identification.
- Return a raw key exactly once, only from an explicit owner-initiated generation or rotation
  response over HTTPS. Never generate or reveal it during administrator approval.
- Keep the one-time value only in transient frontend memory; dismissing or leaving the view removes
  it. Never put it in a URL, browser storage, logs, analytics or telemetry.
- Persist only the existing non-reversible key representation and safe metadata. Compare key
  material without exposing whether an unknown, revoked or malformed key was close to valid.
- Rotation atomically revokes prior active credentials according to the key policy before the
  replacement is usable. Revocation and access withdrawal take effect immediately across replicas.
- Usage records retain only stable consumer ID, safe key ID, normalized route, timestamp and status
  class; never headers, raw URLs, request bodies, secrets or hashes.

## Alternatives considered

### Keep separate anonymous and consumer hierarchies

Rejected. It duplicates routing, documentation and contract tests, while a caller can change paths
to avoid consumer accounting for the same data.

### Require a key for all cricket reads

Rejected. It would break the public product and turn non-sensitive, low-volume exploration into an
approval workflow without solving a data-confidentiality requirement.

### Keep anonymous access without application rate controls

Rejected. Pagination alone does not bound request frequency, and consumer quota exhaustion would
have an unrestricted anonymous substitute.

### Treat the administrator who creates a key as its owner

Rejected. Review authority and use of the external integration are different responsibilities; the
model exposes the credential to the wrong party and prevents meaningful owner self-service.

## Advantages

- One resource URL and response contract serves public and identified consumers.
- Keys have clear value through identity, managed capacity, telemetry and additional capabilities.
- Anonymous public value is retained while automated use is bounded at source and platform levels.
- Consumer ownership and secret delivery represent the party actually using the integration.
- Larger exports, asynchronous jobs and change feeds have a consistent authorization boundary.

## Disadvantages

- Canonical reads need optional-authentication middleware with explicit invalid-key behaviour.
- Source-address controls can affect users behind shared networks and remain weaker than identity;
  the lower allowance and global budget are deliberate trade-offs.
- Alias retirement requires a compatibility period and temporarily keeps both route registrations.
- The ownership correction requires a database and management-workflow migration under #822.

## Consequences

- No production API behaviour changes under #820.
- #821 owns optional consumer authentication on canonical reads, anonymous protection, telemetry
  routing, OpenAPI/API Explorer updates and `/consumer` alias migration.
- #822 owns access requests, administrator review, requester ownership, owner-generated secrets and
  owner/admin management boundaries.
- `GET /api/v1/consumer/usage` remains separate and key-protected.
- New high-cost API proposals must state whether they need consumer identity and why; a new
  `/consumer` resource copy is not the default.

## Verification and review date

- Verify the current route inventory against the Express routers and OpenAPI during #821.
- Review anonymous numeric defaults with measured load and proxy configuration before #821 merges.
- Review ownership migration, account-disablement behaviour and one-time secret handling before
  #822 merges.
- Revisit this decision if public reads must become confidential, a stronger anonymous identity is
  introduced, or a future service tier requires a different capacity model.

## AI Declaration

The preceding decision record was drafted with the assistance of Codex[GPT-5].
