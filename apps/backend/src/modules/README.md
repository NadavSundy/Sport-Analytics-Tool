# Backend modules

Implement business capabilities as modules rather than placing all endpoints and logic in one file. A module should normally contain its routes, controller, service, repository, validation schemas, tests, and documentation links.

Current modules include authentication/accounts, public reference-data reads, and approved-submitter
event submissions. Expected future modules include:

- competition and season administration;
- competitors and teams;
- fixtures;
- review and correction history;
- derived statistics;
- dataset releases and exports;
- API consumers, keys, quotas, and usage; and
- external integrations.

HTTP controllers must remain thin. Business rules belong in services, and database access belongs behind repositories.

## AI Declaration

The current module status was updated with the assistance of Codex[GPT-5.6 Sol].
