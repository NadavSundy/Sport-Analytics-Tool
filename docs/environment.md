# Environment variables

Real environment files are ignored by Git. Only placeholder examples may be committed.

## Frontend

| Variable                        | Required by current code               | Secret | Purpose                                                                       |
| ------------------------------- | -------------------------------------- | ------ | ----------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`             | No; API client has a localhost default | No     | Base URL of the handwritten backend API.                                      |
| `VITE_APP_NAME`                 | No; reserved                           | No     | Application display/configuration value retained in the environment template. |
| `VITE_APP_ENV`                  | No; reserved                           | No     | Environment label retained in the environment template.                       |
| `VITE_SUPABASE_URL`             | Yes                                    | No     | Public Supabase project URL for managed browser authentication.               |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes                                    | No     | Public Supabase publishable key for the browser authentication client.        |

Only public-safe values may use the `VITE_` prefix. Secret/service-role keys, database passwords and OAuth client secrets must never be exposed to the frontend.

## Backend application runtime

| Variable                                 | Required by current code                            | Secret | Purpose                                                                                      |
| ---------------------------------------- | --------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------- |
| `NODE_ENV`                               | No; defaults to `development`                       | No     | Runtime mode: `development`, `test` or `production`.                                         |
| `PORT`                                   | No; defaults to `3000`                              | No     | Backend HTTP port. Hosting platforms may provide it.                                         |
| `CORS_ORIGINS`                           | No; defaults to `http://localhost:5173`             | No     | Comma-separated list of allowed browser origins.                                             |
| `SUPABASE_URL`                           | Yes                                                 | No     | Supabase Auth project URL used for token verification.                                       |
| `SUPABASE_PUBLISHABLE_KEY`               | Yes                                                 | No     | Publishable key used for backend `getUser()` verification.                                   |
| `SUPABASE_SECRET_KEY`                    | No; required to enable account deletion             | Yes    | Server-only key used by Supabase Auth Admin deletion.                                        |
| `DATABASE_URL`                           | Required when database access is used               | Yes    | Hosted PostgreSQL session-pooler connection string.                                          |
| `OBJECT_STORAGE_PROVIDER`                | Required in production; explicit for local releases | No     | `filesystem` for local development or `azure` for deployed production.                       |
| `DEPLOYMENT_ENVIRONMENT`                 | Required as non-`local` in production               | No     | Release namespace such as `local` or `dev`; prevents cross-environment artifact references.  |
| `OBJECT_STORAGE_FILESYSTEM_ROOT`         | Required when provider is `filesystem`              | No     | Local private-object root; the example resolves to repository-local `.local/object-storage`. |
| `AZURE_STORAGE_ACCOUNT_NAME`             | Required when provider is `azure`                   | No     | Azure account used to derive the HTTPS Blob endpoint.                                        |
| `AZURE_STORAGE_CONTAINER_NAME`           | Compatibility alias for the ingestion container     | No     | Existing staged-ingestion setting; remains supported unchanged.                              |
| `AZURE_STORAGE_INGESTION_CONTAINER_NAME` | Preferred when provider is `azure`                  | No     | Private staged-ingestion container.                                                          |
| `AZURE_STORAGE_RELEASE_CONTAINER_NAME`   | Required when provider is `azure`                   | No     | Separate private immutable-release container.                                                |
| `AZURE_CLIENT_ID`                        | Required by the Container Apps runtime              | No     | Client ID of the API runtime user-assigned managed identity.                                |

The committed backend example selects `filesystem` and
`OBJECT_STORAGE_FILESYSTEM_ROOT=../../.local/object-storage` for development. npm workspace commands
run the backend from `apps/backend`, so this path resolves to `.local/object-storage` at the
repository root. Generated objects remain private application files, expose no provider URL and are
ignored by Git.

Local development should use a development database and `DEPLOYMENT_ENVIRONMENT=local`; deployed
services should use their deployment database and a shared non-local value such as `dev`. The
namespace prevents a local filesystem-backed release from shadowing a deployed Azure release if a
database is accidentally shared. It is a safety guard, not a recommendation to share production
data with local processes.

Production must explicitly set `OBJECT_STORAGE_PROVIDER=azure`, a non-local
`DEPLOYMENT_ENVIRONMENT`, both logical containers, and `AZURE_CLIENT_ID`; a missing provider or `filesystem`
selection fails configuration rather than falling back to the local disk. Blob authentication uses
`DefaultAzureCredential` with the Azure Container Apps runtime managed identity. Azure Storage connection
strings, account keys, SAS tokens, and shared-key credentials are not supported application
configuration.

## Backend Container Apps configuration boundaries

The normal deployed API uses the non-secret runtime variables in the preceding table. `NODE_ENV` is
`production`, `PORT` is `3000`, `OBJECT_STORAGE_PROVIDER` is `azure`, and Bicep derives
`AZURE_CLIENT_ID` from the runtime identity. `CORS_ORIGINS`, `SUPABASE_URL`, and
`SUPABASE_PUBLISHABLE_KEY` are ordinary runtime configuration values; they are not substituted for
server secrets.

`DATABASE_URL` and `SUPABASE_SECRET_KEY` are Key Vault secret values. Container Apps receives only
versionless Key Vault secret-reference URIs, creates Container Apps secrets, and supplies those two
variables through `secretRef`. The deployment CI receives only the URIs, never their values.
`SUPABASE_SECRET_KEY` is required to preserve authenticated account deletion; process startup and
unrelated routes remain available without it, but deletion returns `501`.

Gitea Actions secrets are separate again. The existing `AZURE_WORKER_CREDENTIALS` secret is the
shared Azure resource-group deployment-principal credential despite its worker-oriented legacy name.
Backend-specific secrets hold the resource group, two Key Vault secret-reference URIs, CORS origins,
Supabase URL, and Supabase publishable key used by backend deployment CI. Do not put real values in
`.env` examples, Docker build arguments, Bicep outputs, workflow logs, or repository documentation.

## Asynchronous worker runtime

The independently deployed worker reads its complete validated configuration from
`apps/worker/.env.example`. Local development selects `WORKER_TRANSPORT_PROVIDER=database` and the
filesystem provider, so it requires no Azure resources. Its required production settings are `DATABASE_URL`,
`SERVICE_BUS_FULLY_QUALIFIED_NAMESPACE`, `SERVICE_BUS_QUEUE_NAME`,
`AZURE_STORAGE_ACCOUNT_NAME`, `AZURE_STORAGE_INGESTION_CONTAINER_NAME` and
`AZURE_STORAGE_RELEASE_CONTAINER_NAME`. Production also sets
`DATABASE_SSL_MODE=verify-full` and `AZURE_CLIENT_ID` for its user-assigned managed identity.
Concurrency, health intervals, lock renewal and shutdown drain time are bounded by the worker
schema. `WORKER_PROBE_DELAY_MS` exists only for deliberate recovery testing and remains zero in the
deployment template.

The Container App obtains `DATABASE_URL` through a Key Vault reference. Service Bus and Blob access
use managed identity, so connection strings, account keys and SAS tokens are unsupported. See
[Azure asynchronous batch worker](deployment/azure-worker.md) for the exact table and procedures.

## Test and support-script variables

| Variable            | Required                            | Secret | Purpose                                                                                                                                                                                    |
| ------------------- | ----------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL_TEST` | No; optional database-test override | Yes    | Dedicated isolated test database. When absent, `npm run test:database` provisions a disposable local PostgreSQL 16 cluster. It must never identify the development or production database. |

The committed backend `.env.example` currently also contains the following placeholders that are **reserved for future/other tooling and are not read by the current backend application runtime**:

- `EXTERNAL_API_KEY`
- `API_VERSION`
- `CORS_ALLOWED_ORIGINS`
- `LOG_LEVEL`

Do not rely on a reserved placeholder merely because it appears in `.env.example`. In particular, current Express CORS middleware reads `CORS_ORIGINS`.

## Secret-handling rules

Never commit:

- real `.env` files;
- `DATABASE_URL` or `DATABASE_URL_TEST` credentials;
- Google OAuth client secrets;
- user bearer/access tokens;
- Supabase secret keys or legacy `service_role` keys;
- Azure publish profiles;
- Azure Storage account keys, connection strings, and SAS tokens;
- Azure Service Bus connection strings or shared-access keys;
- Cloudflare API tokens; or
- external API credentials.

Repository-hosted deployment secrets must be stored using the relevant platform secret mechanism.

## AI Declaration

The preceding document was reviewed and corrected with the assistance of ChatGPT-Web[GPT-5.6 Sol].
The optional server-only account-deletion configuration was documented with the assistance of
Codex[GPT-5].
The non-secret Azure Blob identifiers and managed-identity requirement were documented with the
assistance of Codex[GPT-5].
The asynchronous worker configuration and secret boundary were documented with the assistance of
Codex[GPT-5].
The explicit local-filesystem and production-Azure provider configuration was documented with the
assistance of Codex[GPT-5].
The Issue #563 Container Apps configuration and secret-reference boundary was documented with the
assistance of Codex[GPT-5].
