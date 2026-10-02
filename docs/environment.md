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

For the deployed Cloudflare Pages frontend, `VITE_API_BASE_URL` is set at build time to:

```text
https://statsthegame-dev-api.calmground-aa50efe2.southafricanorth.azurecontainerapps.io/api/v1
```

## Backend application runtime

| Variable                                 | Required by current code                            | Secret | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------- | --------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                               | No; defaults to `development`                       | No     | Runtime mode: `development`, `test` or `production`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `PORT`                                   | No; defaults to `3000`                              | No     | Backend HTTP port. Hosting platforms may provide it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `CORS_ORIGINS`                           | No; defaults to `http://localhost:5173`             | No     | Comma-separated list of allowed browser origins.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `SUPABASE_URL`                           | Yes                                                 | No     | Supabase Auth project URL used for token verification.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `SUPABASE_PUBLISHABLE_KEY`               | Yes                                                 | No     | Publishable key used for backend `getUser()` verification.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `SUPABASE_SECRET_KEY`                    | No; required to enable account deletion             | Yes    | Server-only key used by Supabase Auth Admin deletion.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `DATABASE_URL`                           | Required when database access is used               | Yes    | Hosted PostgreSQL session-pooler connection string.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `DATABASE_STATEMENT_TIMEOUT_MS`          | No; defaults to `15000`                             | No     | PostgreSQL statement timeout in milliseconds; must be between 1000 and 120000.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `ANONYMOUS_RATE_LIMIT_SECRET`            | Required in production; optional local fallback     | Yes    | At least 32 characters used to HMAC anonymous client addresses before counter storage.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `ANONYMOUS_RATE_LIMIT_PER_MINUTE`        | No; defaults to `30`                                | No     | Per-pseudonymous-source canonical-read minute allowance.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `ANONYMOUS_GLOBAL_RATE_LIMIT_PER_MINUTE` | No; defaults to `600`                               | No     | Shared anonymous canonical-read minute budget.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `TRUST_PROXY_HOPS`                       | No; defaults to `0`                                 | No     | Exact trusted reverse-proxy hop count used when deriving the client address.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `OBJECT_STORAGE_PROVIDER`                | Required in production; explicit for local releases | No     | `filesystem` for local development or `azure` for deployed production.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `DEPLOYMENT_ENVIRONMENT`                 | Required as non-`local` in production               | No     | Release namespace such as `local` or `dev`; prevents cross-environment artifact references.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `OBJECT_STORAGE_FILESYSTEM_ROOT`         | Required when provider is `filesystem`              | No     | Local private-object root; the example resolves to repository-local `.local/object-storage`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `AZURE_STORAGE_ACCOUNT_NAME`             | Required when provider is `azure`                   | No     | Azure account used to derive the HTTPS Blob endpoint.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `AZURE_STORAGE_CONTAINER_NAME`           | Compatibility alias for the ingestion container     | No     | Existing staged-ingestion setting; remains supported unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `AZURE_STORAGE_INGESTION_CONTAINER_NAME` | Preferred when provider is `azure`                  | No     | Private staged-ingestion container.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `AZURE_STORAGE_RELEASE_CONTAINER_NAME`   | Required when provider is `azure`                   | No     | Separate private immutable-release container.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `AZURE_CLIENT_ID`                        | Required by the Container Apps runtime              | No     | Client ID of the API runtime user-assigned managed identity.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `LLM_API_KEY`                            | No, in every environment                            | Yes    | Server-only language-model key for natural-language query translation (ADR-017). It must only ever be read in the backend, and `scripts/check-frontend-bundle-secrets.mjs` rejects both this name and the provider key shape in a frontend bundle. When it is absent the backend starts normally, logs one startup warning naming the variable, and the translation adapter reports the feature as unconfigured; every other capability is unaffected.                                                                                                                                        |
| `LLM_MODEL`                              | No; defaults to `claude-haiku-4-5-20251001`         | No     | Model identifier used for translation. It may only contain lowercase alphanumerics, dots and hyphens, because it reaches the outbound request body. Switching models is a configuration change; ADR-017 names the fallback.                                                                                                                                                                                                                                                                                                                                                                   |
| `LLM_TIMEOUT_MS`                         | No; defaults to `15000`                             | No     | Millisecond bound on one translation request. It must be between 2000 and 60000. The adapter retries once, so the worst case is roughly twice this value.                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `TRUSTED_PROXY_HOP_COUNT`                | No; defaults to `0`                                 | No     | How many reverse-proxy hops in front of the application may be trusted, counted from the right of `X-Forwarded-For`, between 0 and 3. `0` trusts nothing and uses the socket address, which is right locally. Container Apps sets `1`, because its ingress appends the caller's address to anything the caller sent, so the rightmost entry is the one the platform added. It must never exceed the number of proxies actually in front of the application: the further entries are caller-supplied, and the natural-language per-client limits would then be bypassable by sending a header. |
| `NL_QUERY_RATE_LIMIT_PER_MINUTE`         | No; defaults to `10`                                | No     | Natural-language questions one client may ask per minute, between 1 and 120. Generous because many readers can share one address.                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `NL_QUERY_DAILY_QUOTA_PER_CLIENT`        | No; defaults to `100`                               | No     | Natural-language questions one client may ask per UTC day, between 1 and 10000.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `NL_QUERY_GLOBAL_DAILY_LIMIT`            | No; defaults to `300`                               | No     | Natural-language questions answered per UTC day across all clients, between 1 and 100000. It bounds what the endpoint can spend against the ADR-017 monthly limit, so one client can consume at most its own quota of it and a few busy clients can exhaust the day. All three limits count attempts rather than successes, so a failing request cannot be used to bypass them, and all three fail closed: if the counters cannot be read the endpoint answers `503`.                                                                                                                         |

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

`DATABASE_URL`, `SUPABASE_SECRET_KEY`, `ANONYMOUS_RATE_LIMIT_SECRET` and `LLM_API_KEY` are Key Vault
secret values. The database, Supabase and language-model values are held as `backend-database-url`,
`backend-supabase-secret-key` and `backend-llm-api-key`; the anonymous HMAC secret uses its documented
backend secret reference. Container Apps
receives only versionless Key Vault secret-reference URIs, creates Container Apps secrets, and
supplies those four variables through `secretRef`. The Container Apps secret names are local
aliases and do not repeat the vault's `backend-` prefix. The deployment CI receives only the URIs,
never their values. `SUPABASE_SECRET_KEY` is required to preserve authenticated account deletion;
process startup and unrelated routes remain available without it, but deletion returns `501`.
`LLM_API_KEY` is optional to the application in every environment, and without it only
natural-language query translation is disabled.

The deployed anonymous limits are `30` per source and `600` globally per UTC minute;
`TRUST_PROXY_HOPS=1` trusts only the Container Apps ingress hop.

`TRUSTED_PROXY_HOP_COUNT` and the three `NL_QUERY_*` limits are plain values the template sets, not
parameters the deployment has to supply. The limits are Bicep parameters with defaults, so they can be
raised for one environment without editing the template body, and `TRUSTED_PROXY_HOP_COUNT` is fixed
at `1` because the same template defines the ingress it describes. None of them is a required
parameter: a required parameter added without a matching argument in the deployment workflow fails
every backend deploy, which is what issue #831 records.

`TRUST_PROXY_HOPS` (issue #821) and `TRUSTED_PROXY_HOP_COUNT` (issue #815) both name the same hop
count, and the application applies it once: an explicit `TRUST_PROXY_HOPS` is honoured, otherwise
`TRUSTED_PROXY_HOP_COUNT`. Both are set to `1` in the deployed template. Setting them to different
values is a configuration error rather than two independent settings, because the anonymous read
limits and the natural-language limits both identify a client from the same derived address.

Gitea Actions secrets are separate again. The existing `AZURE_WORKER_CREDENTIALS` secret is the
shared Azure resource-group deployment-principal credential despite its worker-oriented legacy name.
Backend-specific secrets hold the resource group, four Key Vault secret-reference URIs, CORS
origins, Supabase URL, and Supabase publishable key used by backend deployment CI. Do not put real values in
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
The issue #821 anonymous-read limit configuration was documented with the assistance of
Codex[GPT-5].
The issue #815 natural-language query limits and trusted-proxy hop count were documented with the
assistance of Claude-Code[Claude Opus 5 (1M context)].
