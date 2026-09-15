# Sport Analytics Tool (Stat'sTheGame)

Stat'sTheGame is an event-driven analytics platform for **T20 cricket**, built on
[Cricsheet](https://cricsheet.org/)'s ball-by-ball match data. It provides validated event
submissions, statistics derived from those events rather than manually entered totals, and a
versioned hand-written HTTP API, in front of a PostgreSQL database of 13,953 matches and
3,193,996 deliveries.

## Current implementation status

> The Express API validates Supabase identities, synchronizes provider-neutral application
> accounts, exposes the current user profile, and enforces `viewer`, `submitter`, and `admin`
> roles with competition-scoped submissions. Administrators can review users and manage
> submitter access. Approved submitters use the staged batch workflow for season and
> back-catalogue packages, with asynchronous validation, reference resolution, reviewer
> decisions, correction resubmission, and publication; administrators retain privileged
> direct/import routes. Public competition, season, fixture, event, competitor, participant,
> derived fixture-statistics, and participant season/competition/career aggregate reads are
> available without authentication. Filtered fixture-event and calculation-trace exports are
> available as JSON and CSV, and immutable versioned dataset releases can be generated and
> downloaded. External consumers can use administrator-issued API keys with per-minute rate
> limits and UTC daily quotas. The backend also provides the required runtime external API
> integration through Open-Meteo via `GET /api/v1/weather`. Advanced analyst-defined
> statistics, live-feed and bitemporal processing, change feeds, and other Advanced-tier
> functionality remain future work.

This is copied from the [repository README](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool)
so the two cannot silently drift apart. As with every status statement on this site: a page
describing a planned or target component is not evidence that the component has been
implemented — see each page's own **Status** line for what is built versus intended.

## Foundational documentation

Setup, tooling, and boundary documentation, established largely before implementation began:

- [Architecture overview](architecture/overview.md) — the brief-derived component boundaries
- [Repository structure](architecture/repository-structure.md)
- [Local setup](development/setup.md)
- [Technology stack](development/technology-stack.md) — every dependency, motivated
- [Environment variables](environment.md)
- [Git methodology](git-methodology.md)
- [Project methodology](project_methodology.md)
- [AI usage](ai/usage.md)

## Documentation produced by building the project

This is the documentation that could not have been written before the sport was chosen and the
system was built — the event model, the authentication flow as actually implemented, and the
data and decisions behind them:

- [Sport domain definition](requirements/sport-domain-definition.md) — why T20 cricket, and how
  it was checked against the project's required criteria
- [Cricsheet data source](data/cricsheet.md) — the corpus the schema is derived from
- [Event model](database/schema.md) — the schema, driven by eight properties discovered by
  parsing the real Cricsheet corpus
- [Entity relationships](database/erd.md)
- [System architecture and roadmap](architecture/system-architecture.md) — current decisions,
  what is implemented versus planned, and why
- [Authentication and authorisation](security/authentication.md) and
  [roles and permissions](security/roles-and-permissions.md) — the Supabase Auth flow as built,
  not as originally scoped (see `ADR-004`, which supersedes the earlier Firebase decision)
- [API overview](api/overview.md) — the implemented handwritten HTTP API and current endpoint surface
- [OpenAPI specification](api/openapi.md) — the version-controlled API contract
- [Public read API](api/public-read.md) — anonymous cricket data reads, filters and pagination
- [Direct event submissions](api/submissions.md) — scoped validated event submission and immutable corrections
- [Batch ingestion and review](api/batches.md) — asynchronous receipt, validation, review, correction and publication
- [Participant aggregate calculations](statistics/participant-aggregates.md) — season, competition and career statistics
- [Dataset exports and releases](data/dataset-exports.md) — filtered exports and immutable checksum-backed releases
- [Consumer API keys and limits](api/consumer-keys.md) — key management, rate limits and quotas
- [Database overview](database/overview.md) — implemented PostgreSQL/Supabase architecture and migrations
- [Representative-scale performance baseline](development/performance-baseline.md)
- [Sprint evidence](process/sprint-evidence.md) and [testing & validation evidence](process/validation-and-user-testing.md)
- [Weather API](api/weather.md) — runtime Open-Meteo external API integration
- [Azure deployment recovery](deployment/azure-app-service-recovery.md) — the 10–13 August
  deployment incident and how it was resolved
- [Testing strategy](development/testing.md)
- [CI/CD and quality gates](development/ci-cd.md) — hosted runner routing, required checks and deployment relationship

## Sprint 2 marker quick links

The Sprint 2 evidence is indexed rather than duplicated across the site. For milestone review, the
fastest route through the evidence is:

- [Sprint 2 requirements & rubric traceability](planning/sprint-2-requirements-traceability.md) —
  requirement-by-requirement and rubric-by-rubric evidence map
- [Sprint evidence](process/sprint-evidence.md) — planning, stand-ups, stakeholder interactions and
  close-out/retrospective evidence
- [Testing & validation evidence](process/validation-and-user-testing.md) — automated/integrated
  verification and formal user-testing records
- [Automated testing strategy](development/testing.md) and [bug tracking](testing/bug-tracking.md) —
  testing procedure and continuous defect workflow
- [API overview](api/overview.md) — handwritten API surface and live development endpoint
- [Database overview](database/overview.md) — schema/deployment rationale and migration ownership
- [Technology stack](development/technology-stack.md) — third-party technologies, versions and
  motivations

## Core project boundary

The React frontend communicates with the Express backend through HTTP. The backend owns
validation, authorisation, business rules, database access, external API calls, and published
API behaviour. Shared contracts support consistency but do not replace backend validation.
Generated Supabase data endpoints are not used as the application API.

## AI Declaration

The preceding documentation homepage was reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
