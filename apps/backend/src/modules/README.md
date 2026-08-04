# Backend modules

Implement business capabilities as modules rather than placing all endpoints and logic in one file. A module should normally contain its routes, controller, service, repository, validation schemas, tests, and documentation links.

Expected future modules include:

- authentication and accounts;
- competitions and seasons;
- competitors and teams;
- fixtures;
- event submissions and validation;
- review and correction history;
- derived statistics;
- dataset releases and exports;
- API consumers, keys, quotas, and usage; and
- external integrations.

HTTP controllers must remain thin. Business rules belong in services, and database access belongs behind repositories.
