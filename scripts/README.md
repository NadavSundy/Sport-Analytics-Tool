# Repository scripts

The `scripts/` directory contains developer-facing repository automation and data-support utilities. Run scripts from the repository root unless a script's specialist documentation says otherwise.

## Prerequisites

- Node.js 20 or later and npm 10 or later for `.mjs` scripts and root npm commands;
- Python 3.10 or later for `.py` data utilities;
- Docker Desktop or a compatible Docker Compose runtime only for `test-database-local.mjs`; and
- internet access for the Cricsheet downloader and deployed-service smoke checks where applicable.

Install the committed JavaScript dependency graph first:

```bash
npm ci
```

## Developer-facing Node.js scripts

| Script                             | Normal entry point                                           | Purpose / safe usage                                                                                                                            |
| ---------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `run-development-app.mjs`          | `npm run dev`, `npm run dev:frontend`, `npm run dev:backend` | Dispatches the selected workspace development server.                                                                                           |
| `check-required-files.mjs`         | `npm run structure:check`                                    | Verifies repository files required by the project structure and onboarding rules.                                                               |
| `test-database-local.mjs`          | `npm run test:database:local`                                | Starts the isolated Docker PostgreSQL 16 test environment and runs database integration tests. Never repoint it at development/production data. |
| `prepare-backend-deployment.mjs`   | `npm run deploy:prepare:backend`                             | Builds the backend deployment artifact used by the Azure workflow. Generated deployment output is not source code.                              |
| `smoke-check-backend-artifact.mjs` | deployment workflow/helper use                               | Checks the prepared backend artifact locally before deployment.                                                                                 |
| `smoke-check-deployment.mjs`       | deployment workflow/helper use                               | Performs retrying content-aware HTTP checks against deployed services. Use only against the intended documented target.                         |

## Cricsheet and data-support Python scripts

| Script                          | Purpose                                                                                  |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| `download_cricsheet_t20.py`     | Downloads the scoped Cricsheet T20/IT20 source corpus. Generated data is ignored by Git. |
| `catalogue_cricsheet_fields.py` | Catalogues fields observed in the downloaded Cricsheet source data.                      |
| `probe_cricsheet_edge_cases.py` | Investigates source-data edge cases used in schema/design work.                          |
| `probe_delivery_over_key.py`    | Probes delivery/over key behaviour in source data.                                       |
| `probe_match_metadata.py`       | Inspects match metadata patterns in source data.                                         |
| `find_miscounted.py`            | Investigates source/statistic counting anomalies.                                        |
| `find_super_overs.py`           | Locates and inspects super-over cases.                                                   |
| `make_invalid_seeds.py`         | Produces intentionally invalid seed fixtures for validation work.                        |
| `validate_source_totals.py`     | Cross-checks source totals used during data validation.                                  |

The main acquisition command is:

```bash
python scripts/download_cricsheet_t20.py
```

Use the probe/validation utilities only when their input data is present and you understand what they read or generate. Do not commit downloaded bulk datasets, temporary probe output or generated files unless a related issue explicitly requires a sanitized evidence artefact.

## Gitea export helper

The `scripts/gitea-export/` subdirectory has its own [Gitea export helper guide](gitea-export/README.md). Follow that guide for project-board and issue export work rather than duplicating its setup here.

## AI Declaration

The preceding document was planned, generated, reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
