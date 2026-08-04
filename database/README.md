# Database

This directory contains team-controlled database artefacts for the PostgreSQL-compatible database.

```text
migrations/  Ordered, immutable schema changes
seeds/       Deterministic development and test data
schema/      Human-readable schema and data-model documentation
```

## Boundary rule

Supabase may be used as a hosted PostgreSQL database and, if approved, as an established authentication provider. The application must not use generated Supabase data endpoints as its product API. Frontend application data must flow through the hand-written backend HTTP API.

## Migration rules

- Never edit a migration after it has been applied to a shared environment.
- Create a new migration for each schema change.
- Include rollback or recovery notes for risky migrations.
- Review indexes, constraints, ownership, and data-retention impact.
- Test migrations against realistic data before production deployment.
