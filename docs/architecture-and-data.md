# Architecture & Data

Use this section when you need to understand how Stat'sTheGame is put together, where authority
lives, how cricket events are represented, how data moves through ingestion and publication, or how
security boundaries are enforced.

## Recommended reading order

1. [Architecture overview](architecture/overview.md) — component boundaries and responsibilities.
2. [System architecture and roadmap](architecture/system-architecture.md) — current architecture,
   decisions and later-tier direction.
3. [Database architecture guide](database/guide.md) — marker/developer route through persistence,
   migrations and trade-offs.
4. [Event model](database/schema.md) and [ERD](database/erd.md) — cricket identities, revisions and
   relationships.
5. [Batch ingestion pipeline](architecture/batch-ingestion-pipeline.md) — staged file processing,
   worker and publication architecture.
6. [Security overview](security/overview.md) — authentication, authorisation, data and API
   protection boundaries.

## Architecture map

| Question                                    | Authoritative starting point                                         | Go deeper                                                                                |
| ------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| What are the major components?              | [Architecture overview](architecture/overview.md)                    | [System architecture](architecture/system-architecture.md)                               |
| How is cricket represented?                 | [Sport domain definition](requirements/sport-domain-definition.md)   | [Event model](database/schema.md)                                                        |
| Why does the schema look this way?          | [Database architecture guide](database/guide.md)                     | [Cricsheet data source](data/cricsheet.md)                                               |
| What tables and relationships exist?        | [ERD](database/erd.md)                                               | [Database overview](database/overview.md)                                                |
| How are writes and transactions controlled? | [Database access](database/access.md)                                | [Batch persistence](database/batch-persistence.md)                                       |
| How do large uploads become published data? | [Batch ingestion pipeline](architecture/batch-ingestion-pipeline.md) | [Batch API](api/batches.md)                                                              |
| How are identity and permissions enforced?  | [Security overview](security/overview.md)                            | [Authentication](security/authentication.md), [roles](security/roles-and-permissions.md) |
| What happens when an account is deleted?    | [Privacy and retention](security/privacy-retention.md)               | [Password recovery ownership](security/password-recovery.md)                             |
| Why was the auth provider selected?         | [Provider comparison](security/auth-provider-comparison.md)          | [Decisions index](process/decisions.md)                                                  |

## Source data and derived data

The [Cricsheet data source](data/cricsheet.md) records the corpus used to validate cricket-specific
assumptions. The [event model](database/schema.md) records the resulting identity and persistence
choices. Calculation behaviour is documented separately under
[Fixture statistic calculations](statistics/fixture-statistics.md) and
[Participant aggregate calculations](statistics/participant-aggregates.md).

Keeping those concerns separate avoids turning a schema page into an API manual or a statistics page
into a database reference.

## Decisions and deployment

Architecture Decision Records and other project-level decisions are indexed in
[Decisions](process/decisions.md). Hosted topology, capacity, recovery and deployment commands belong
under [Deployment & Operations](deployment/overview.md), not on this architecture hub.

## AI Declaration

The architecture/data documentation hub and reading path were planned and drafted with the
assistance of ChatGPT-Web[GPT-5.6 Sol].
