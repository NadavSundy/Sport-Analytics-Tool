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

| Variable                       | Required by current code                | Secret | Purpose                                                            |
| ------------------------------ | --------------------------------------- | ------ | ------------------------------------------------------------------ |
| `NODE_ENV`                     | No; defaults to `development`           | No     | Runtime mode: `development`, `test` or `production`.               |
| `PORT`                         | No; defaults to `3000`                  | No     | Backend HTTP port. Hosting platforms may provide it.               |
| `CORS_ORIGINS`                 | No; defaults to `http://localhost:5173` | No     | Comma-separated list of allowed browser origins.                   |
| `SUPABASE_URL`                 | Yes                                     | No     | Supabase Auth project URL used for token verification.             |
| `SUPABASE_PUBLISHABLE_KEY`     | Yes                                     | No     | Publishable key used for backend `getUser()` verification.         |
| `SUPABASE_SECRET_KEY`          | No; required to enable account deletion | Yes    | Server-only key used by Supabase Auth Admin deletion.              |
| `DATABASE_URL`                 | Required when database access is used   | Yes    | Hosted PostgreSQL session-pooler connection string.                |
| `AZURE_STORAGE_ACCOUNT_NAME`   | Required when `NODE_ENV=production`     | No     | Azure account used to derive the HTTPS Blob endpoint.              |
| `AZURE_STORAGE_CONTAINER_NAME` | Required when `NODE_ENV=production`     | No     | Private Blob container resolved by production storage composition. |

Production Blob authentication uses `DefaultAzureCredential` with the Azure App Service managed
identity. Azure Storage connection strings, account keys, SAS tokens, and shared-key credentials
are not supported application configuration.

## Asynchronous worker runtime

The independently deployed worker reads its complete validated configuration from
`apps/worker/.env.example`. Its required server-side settings are `DATABASE_URL`,
`SERVICE_BUS_FULLY_QUALIFIED_NAMESPACE`, `SERVICE_BUS_QUEUE_NAME`,
`AZURE_STORAGE_ACCOUNT_NAME` and `AZURE_STORAGE_CONTAINER_NAME`. Production also sets
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
