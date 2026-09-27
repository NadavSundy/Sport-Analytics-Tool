# Decisions Index

Every recorded project, architecture and technical decision is listed below. Each entry links to
the authoritative record under
[`evidence/decisions/`](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions)
rather than duplicating its content. New decisions should be added to this table using the
[ADR template](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-000-template.md).

| ADR                                                                                                                                                           | Title                                                                            | Status                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------- |
| [ADR-001](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-001-initial-repository-setup.md)                | Initial Repository Setup Before Governance Enforcement                           | See record                  |
| [ADR-002](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-002-firebase-authentication-foundation.md)      | Firebase Authentication Foundation                                               | Superseded by ADR-004       |
| [ADR-003](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-003-database-host-connection-and-migrations.md) | Hosted PostgreSQL provider, connection method and migration tooling              | Superseded by ADR-005       |
| [ADR-004](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-004-supabase-authentication-foundation.md)      | Supabase Authentication Foundation                                               | See record                  |
| [ADR-005](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-005-database-host-migration.md)                 | Move the database to a Supabase project with sufficient storage                  | See record                  |
| [ADR-006](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-006-account-deletion-retention.md)              | Account deletion retention and tombstoning                                       | See record                  |
| [ADR-007](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-007-public-information-architecture.md)         | Public cricket information architecture and interaction model                    | See record                  |
| [ADR-008](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-008-external-weather-api-integration.md)        | External Weather API Integration                                                 | See record                  |
| [ADR-009](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-009-cache-and-invalidation.md)                  | Measured cache-aside reads with versioned invalidation                           | See record                  |
| [ADR-010](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-010-background-jobs-and-workers.md)             | Transactional outbox, Azure Service Bus, and idempotent workers                  | Accepted under #356         |
| [ADR-011](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-011-file-and-object-storage.md)                 | Private Azure Blob Storage with PostgreSQL provenance                            | Accepted under #356         |
| [ADR-012](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-012-live-event-transport-and-replay.md)         | Adapter-based live ingestion with durable replay and server-sent events          | See record                  |
| [ADR-013](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-013-task-based-user-testing-evidence.md)        | Task-based formal user testing with repository-retained evidence                 | Accepted                    |
| [ADR-014](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-014-byes-and-leg-byes-on-a-wide.md)             | Byes and leg byes recorded on a wide are wide runs charged to the bowler         | Accepted, pending PR review |
| [ADR-015](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-015-stored-participant-aggregate-snapshots.md)  | Stored participant aggregates, served while current and refreshed on a read miss | Accepted, pending PR review |

## Supporting decisions

- [Lecturer ruling on Supabase, 5 Aug 2026](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/2026-08-05-lecturer-ruling-supabase.md) —
  external ruling motivating ADR-004/ADR-005
- [Azure hosting decision record](../adr/0003-azure-hosting.md) — deployment-platform decision,
  documented directly on the site alongside the deployment guides it informs

The preceding page was planned and drafted with the assistance of Claude[Claude Sonnet 5],
resolving issue #254.
The issue #356 ADR statuses were updated with the assistance of Codex[GPT-5].
ADR-013 and its index entry were added with the assistance of ChatGPT-Web[GPT-5.6 Sol].
ADR-014 and its index entry were added with the assistance of Claude-Code[Claude Opus 5].
ADR-015 and its index entry were added with the assistance of Claude-Code[Claude Opus 5].
