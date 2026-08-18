# Sport Analytics Tool (Stat'sTheGame)

Stat'sTheGame is an event-driven analytics platform for **T20 cricket**, built on
[Cricsheet](https://cricsheet.org/)'s ball-by-ball match data. It provides validated event
submissions, statistics derived from those events rather than manually entered totals, and a
versioned hand-written HTTP API, in front of a PostgreSQL database of 13,953 matches and
3,193,996 deliveries.

## Current implementation status

> The Express API validates Supabase identities, synchronizes provider-neutral application
> accounts, exposes the current user profile, and enforces `viewer`, `submitter`, and `admin`
> roles with competition-scoped submissions. Administrators can review users and atomically
> approve, re-scope, or revoke submitters. Public reference data, accepted fixture events, and
> derived fixture statistics remain anonymous. Datasets and external API integration remain
> future work.

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
- [Azure deployment recovery](deployment/azure-app-service-recovery.md) — the 10–13 August
  deployment incident and how it was resolved
- [Testing strategy](development/testing.md)

## Core project boundary

The React frontend communicates with the Express backend through HTTP. The backend owns
validation, authorisation, business rules, database access, external API calls, and published
API behaviour. Shared contracts support consistency but do not replace backend validation.
Generated Supabase data endpoints are not used as the application API.
