# ADR-005: Move the database to a Supabase project with sufficient storage

- **Status:** Accepted
- **Date:** 2026-08-12
- **Participants:** Ben Swartz
- **Related issues:** #121, #105, #27, #13

## Context

ADR-003 consequence 4 records that the agreed competition scope covers eleven
franchise competitions plus men's and women's T20 internationals, that the T20
international corpus alone is 1,266,835 deliveries at an estimated 500 MB with
indexes, and that the full scope is likely to exceed the free plan's limit. It
requires the team to decide between paying for additional storage, reducing
scope, or moving provider, and states that the decision must be recorded before
ingestion begins.

The decision had no owner and no date from 5 August 2026. In the intervening
period it blocked bulk ingestion, the measured storage benchmark the same record
requires, and the automated reference-fixture test, which needs a separate
database whose name contains "test" and which could not be created against a
500 MB limit already carrying the development data.

A partial measurement taken on 7 August over four fixtures gave approximately
128 bytes per delivery of table heap. It could not confirm the 414 bytes per
delivery estimate, because every other table sat at the minimum page allocation
and index sizes were at their floor. The estimate therefore remains unverified,
which is itself a reason to prefer an option that removes the constraint over one
that fits it.

## Decision

The database moves to a new Supabase project created in an organisation holding a
paid plan, made available for this project with the permission of its owner.

The new project is in `eu-west-2`. The Data API was disabled at creation, so the
generated endpoints do not exist, consistent with the client ruling recorded at
`evidence/decisions/2026-08-05-lecturer-ruling-supabase.md` and with ADR-003
consequence 1. Connection is through the session pooler on port 5432, for the
reason established in ADR-003: the direct connection host publishes no A record
and fails name resolution.

## Alternatives considered

**Azure Database for PostgreSQL Flexible Server.** An Azure free account provides
this service free for twelve months with 750 hours of Burstable B1MS compute and
32 GB of storage. Placing it in South Africa North would also have removed the
latency floor recorded in #105, since the application is deployed to that region.
This was the strongest option on the merits. It was not taken because the team's
Azure subscription showed charges rather than the free allowance, and eligibility
for the free offer was not established.

**Supabase Pro.** $25 per month for 8 GB, approximately $50 to final submission.
Rejected because a free option was available and it required a recurring charge
owned by an individual member.

**Oracle Database Free.** Proposed and rejected. The offer is a download rather
than a hosted service, and the schema depends throughout on PostgreSQL features
with no Oracle equivalent: enumerated types, `text[]`, partial unique indexes,
`UNIQUE NULLS NOT DISTINCT`, `num_nonnulls`, `ON CONFLICT DO NOTHING` on which
idempotent ingestion depends, and `COUNT(*) FILTER` on which most derivation
depends. Migration tooling and the driver would also have been replaced. The cost
would have been a rewrite of every layer below the API, including work owned by
other members.

**DigitalOcean Managed PostgreSQL.** Real PostgreSQL, so no rewrite, and $200 of
credit for 60 days covers the project to approximately mid-October. Rejected
because it charges $15 per month thereafter, adds a further provider, and does
not reduce latency.

**Reducing scope.** The project brief requires the platform to be exercised at
hundreds of fixtures with hundreds of events each. At the measured heap figure
the previous 500 MB limit already accommodated on the order of a thousand
matches, so the constraint may have arisen from a scope decision larger than what
is assessed. This option remains open on its merits and is not foreclosed by this
record.

## Advantages

- Removes the storage constraint that has blocked three separate pieces of work
  since 5 August.
- Costs nothing.
- No change to any application code. The schema is defined entirely in committed
  migrations, the development seed is four match files committed to the
  repository, and no provider-specific interface is used anywhere.
- Preserves the compliance position exactly: the Data API is disabled at creation
  rather than merely unused.
- The previous project remains intact during the transition, so the move is
  reversible by changing one environment variable back.

## Disadvantages

- The hosting organisation belongs to a member's employer rather than to the
  team. Access depends on that member's continued employment and on permission
  that could be withdrawn.
- Latency is unchanged. `eu-west-2` is comparable in distance to the previous
  `eu-central-1`: 173 ms median round trip against 181 ms, both measured over
  twenty samples. The issue recorded in #105 is not addressed by this decision.
- The project now depends on two Supabase organisations, since authentication
  remains on the previous project under ADR-004. This coupling is accepted
  deliberately rather than by oversight and should be revisited.
- No backups exist. ADR-003 consequence 5 already requires a tested dump and
  restore procedure and none has been written. Hosting in another party's
  organisation raises rather than lowers the importance of this.

## Consequences

1. Every member must update `DATABASE_URL`. Until they do, members are working
   against two different databases, and counts will disagree.
2. The Azure App Service configuration must be updated, or the deployed backend
   will read the previous database once deployment is working.
3. The previous project must not be written to after the transition, and a date
   for deleting it must be agreed. Until it is deleted it remains a source of
   confusion and a second place where project data exists.
4. ADR-003 consequence 4 is superseded by this record on the storage question.
   The latency consequence in the same record stands unchanged.
5. The unverified 414 bytes per delivery estimate is no longer load-bearing for
   any decision, but the measured benchmark ADR-003 requires is still
   outstanding, and should now be taken because ingestion is no longer blocked by
   storage.
6. The permission obtained is informal. It should be confirmed in writing and
   stored alongside the client ruling in `evidence/decisions/`.

## Verification and review date

Verified on 12 August 2026 against the new database: both migrations applied from
empty; the development seed loaded 955 deliveries across four fixtures; reference
fixture 729307 passed all twenty-two assertions against the published scorecard,
including the complete ten-row fall of wickets and the exclusion of run outs from
bowler credit; and the committed certificate authority validated the connection
without change.

To be reviewed at the Sprint 2 close-out, or immediately if permission to use the
hosting organisation is withdrawn.

## AI Declaration

The preceding document was planned, generated, reviewed and edited with the
assistance of Claude-Web[Claude Opus 5].


