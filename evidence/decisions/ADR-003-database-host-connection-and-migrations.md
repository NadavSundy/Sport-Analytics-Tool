# ADR-003: Hosted PostgreSQL provider, connection method and migration tooling

- **Status:** Accepted
- **Date:** 2026-08-06
- **Participants:** Ben Swartz, Shayna Unterslak, Brendan Griffiths (client, on the compliance question)
- **Related issues:** #13

## Context

The project requires a PostgreSQL database before any persistence work can begin.
Three questions had to be answered together, because each constrains the others:
which provider hosts the database, how the backend connects to it, and how schema
changes are applied.

The course key requirements prohibit using a system that generates API endpoints,
and name Firebase and Supabase as examples. Every HTTP endpoint in this project is
hand-written, so the question was whether the prohibition rules out Supabase
entirely or only its generated endpoints.

Written clarification was requested from the client on 4 August 2026. The question
asked whether Supabase could be used purely as a hosted PostgreSQL instance,
connected to from the team's own backend through a standard connection string,
with PostgREST never used. The client confirmed on 5 August 2026 that this is
acceptable, and added that accidental use of the generated API would be penalised.
The exchange is retained with this record.

## Decision

**Provider.** Supabase, used solely as a managed PostgreSQL instance. The Data API
was disabled at project creation, so no generated REST or GraphQL endpoint exists
on the instance. The region is Central EU (Frankfurt).

**Connection.** The backend connects through the Supavisor session-mode pooler on
port 5432, using `DATABASE_URL` and no other configuration source. TLS is enabled
and certificate verification is not disabled; the authority certificate is
committed at `apps/backend/certs/supabase-ca.crt`.

**Migrations.** `node-pg-migrate`, writing plain SQL files with explicit up and
down sections into `database/migrations`.

## Alternatives considered

**Direct connection instead of the pooler.** Rejected on evidence rather than
preference. The direct host `db.<ref>.supabase.co` publishes no A record; a DNS
query returns only an AAAA record, and `Test-NetConnection` fails name resolution
from a Windows client on the campus network. The direct connection therefore
requires IPv6, which cannot be assumed across six developer machines, the
continuous integration runner and the eventual deployment target.

**Transaction-mode pooler on port 6543.** Rejected because transaction mode does
not support prepared statements, which the PostgreSQL driver and most query layers
rely on. The connection check probes this explicitly so that a future change of
mode fails loudly rather than silently.

**Drizzle Kit for migrations.** Considered and rejected. Its natural mode generates
SQL from a TypeScript schema definition, which conflicts with the convention
already documented in `database/migrations/README.md` requiring ordered SQL files,
and would pull the project toward an ORM that has not been chosen. It remains a
reasonable option if the query-layer decision later favours it.

**Other hosting providers.** Neon and Azure Database for PostgreSQL were both
plausible, and Azure Database for PostgreSQL aligns with the decision to deploy on
Azure. Supabase was chosen for provisioning speed and existing team familiarity,
once the compliance question had been settled in writing.

## Advantages

- The compliance position is settled in writing by the client, not inferred.
- Disabling the Data API at creation means the prohibited endpoints do not exist,
  which is a stronger guarantee than agreeing not to call them.
- The connection method was selected by measurement, so it will work on every
  team member's machine rather than only on those with IPv6.
- Plain SQL migrations keep the schema legible and reviewable, and match the
  convention the team had already documented.
- No provider-specific interface is used anywhere, so changing host later requires
  only a new connection string.

## Disadvantages

- The database is approximately 150 ms from Johannesburg. If the backend is
  deployed to Azure South Africa North, that latency applies to every query.
- The free plan pauses a project after a period of inactivity and retains no
  backups.
- The free plan's storage limit is likely to be exceeded by the agreed competition
  scope. See consequence 4.
- The pooler adds a component between the application and the database that can
  fail independently of either.

## Consequences

1. The generated API must never be used. The Data API is disabled, and the team
   has agreed that the Supabase client library will not be added to any workspace.
2. The client's confirmation was scoped narrowly to hosted PostgreSQL over a
   connection string. It does not extend to Supabase Auth, Storage, Realtime or
   Edge Functions, all of which are excluded.
3. Every developer needs the pooler connection string and the committed authority
   certificate. Both are documented in `docs/development/setup.md`, because
   neither is discoverable from the Supabase dashboard alone.
4. The agreed competition scope covers eleven franchise competitions plus men's
   and women's T20 internationals. The T20 international corpus alone is 1,266,835
   deliveries, which is approximately 500 MB once normalised with indexes. The full
   scope is likely to exceed the free plan's limit. The team must decide between
   paying for additional storage, reducing scope, or moving provider.

   A partial measurement was taken on 7 August 2026 over four fixtures and 955
   deliveries: `delivery` occupied 120 kB of heap, or approximately 128 bytes per
   delivery. This figure is not sufficient to confirm the estimate above. Every
   other table sat at the minimum single-page allocation Postgres makes, and index
   sizes were at their floor rather than proportional to their contents, so neither
   index growth nor the dependent tables can be projected from this sample. The
   measured benchmark this record requires is therefore still outstanding.

   A larger sample was not taken because single-match ingestion runs at
   approximately 68 seconds per fixture, making a few hundred fixtures a multi-hour
   operation. The measurement should be repeated once batch ingestion exists.

   Fourteen fixtures have been loaded for schema validation, so ingestion has begun
   in a limited form before this decision was recorded. The storage decision remains
   outstanding and no bulk ingestion may proceed until it is taken.

   **Superseded on 12 August 2026 by ADR-005.** The database moved to a project
   in an organisation holding a paid plan, resolving the storage constraint. The
   measured benchmark this record requires remains outstanding, but is no longer
   blocked. The latency consequence recorded above stands unchanged: the new
   project is in `eu-west-2` and the median round trip is 173 ms.

   **Measured on 19 August 2026.** The benchmark this record required has been
   taken against the imported corpus of 3,207,109 deliveries across 14,011
   fixtures. Total database size is 798 MB, of which `delivery` accounts for
   705 MB: 385 MB of heap and 319 MB of indexes. That is approximately 249 bytes
   per delivery all-in, against the 414 bytes per delivery estimated here. Index
   size is 45 per cent of table heap on `delivery`, a proportion the earlier
   four-fixture sample could not have shown because every index sat at its
   minimum allocation.

   The estimate was therefore conservative by roughly 40 per cent, and the
   corpus occupies about a tenth of the 8 GB now available. Both the storage
   constraint and the benchmark requirement recorded here are closed.

5. Because the plan retains no backups and all six members hold owner access on
   the project, a tested dump and restore procedure is required rather than
   optional.
6. Schema changes are applied only through committed migrations. Using the
   provider's SQL editor would leave the database out of step with the migration
   history with no record of the change.

## Verification and review date

The connection is verified by `npm run db:check`, which fails non-zero if the
database is unreachable, if certificate verification fails, or if prepared
statements are unavailable. The migration mechanism was verified by applying the
baseline migration, rolling it back, and reapplying it against the hosted
development database.

This record should be reviewed when the competition scope is finalised, because
consequence 4 may force a change of provider or plan. It should be reviewed again
before any production deployment, when the backend's Azure region is known and the
latency in the first disadvantage becomes measurable.

## AI Declaration

The preceding document was planned and generated with the assistance of
Claude-Web[Claude Opus 5].
