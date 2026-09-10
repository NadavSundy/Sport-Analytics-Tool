# Backend modules

Implement business capabilities as modules rather than placing all endpoints and logic in one file. A module should normally contain its routes, controller, service, repository, validation schemas, tests, and documentation links.

Current modules include authentication/accounts, public reference-data reads, competition/season/
fixture/participant queries, scoped direct/file submissions, batch ingestion and review, immutable
corrections, event-derived fixture and participant aggregates, provenance, API-consumer controls,
private object storage, dataset releases/exports and the weather integration.

Future modules should be added only for capabilities that are not already represented by these
boundaries, rather than duplicating batch, provenance, release or consumer-key behavior in a second
module.

HTTP controllers must remain thin. Business rules belong in services, and database access belongs behind repositories.

## AI Declaration

The current module status was updated with the assistance of Codex[GPT-5.6 Sol] and reconciled for Issue #364 with ChatGPT-Web[GPT-5.6 Sol].
