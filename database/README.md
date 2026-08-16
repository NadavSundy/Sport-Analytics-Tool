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

## Application account authorization

`app_user.application_role` is server-owned, non-null, defaults to `viewer`, and accepts only
`viewer`, `submitter`, or `admin`. The role is authoritative for application-wide submission and
administrative capability. A `submitter` or `admin` must still have a matching row in
`submitter_competition_scope` for a scoped event submission.

The role-standardization migration converts the one known legacy privileged value,
`administrator`, to `admin` and converts legacy viewers with `submitter_approval_state = approved`
to `submitter`. Its preflight guard aborts rather than guessing when an unknown role or `NULL` is
present, preserves competition grants, and provides a practical down migration.

`submitter_approval_state` remains temporarily as deprecated request-workflow data. It is not an
authorization source after the role migration and should be removed in a later migration once the
administrative approval workflow no longer consumes it.
