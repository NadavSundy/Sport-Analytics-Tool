# Database overview

The database is planned as PostgreSQL-compatible storage, potentially hosted by Supabase. Hosting does not change the application boundary: the backend remains the only application-data interface used by the frontend.

## Design priorities

- Event records are the source of truth for published statistics.
- Submissions, submitters, validation results, review decisions, and corrections remain traceable.
- Corrections do not destroy history.
- Stable identifiers survive across seasons and releases.
- Constraints prevent impossible relationships and duplicate ingestion.
- Indexes support the documented filter, pagination, and aggregate workload.
- Derived values identify the event inputs and statistic-definition version that produced them.
- Dataset releases are immutable, versioned, documented, and checksummed.

The schema is intentionally not final because the sport and event vocabulary require stakeholder confirmation. See [Event Model Direction](schema.md). The executable schema artefacts remain under `database/` in the repository.
