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

| Variable                   | Required by current code                | Secret | Purpose                                                    |
| -------------------------- | --------------------------------------- | ------ | ---------------------------------------------------------- |
| `NODE_ENV`                 | No; defaults to `development`           | No     | Runtime mode: `development`, `test` or `production`.       |
| `PORT`                     | No; defaults to `3000`                  | No     | Backend HTTP port. Hosting platforms may provide it.       |
| `CORS_ORIGINS`             | No; defaults to `http://localhost:5173` | No     | Comma-separated list of allowed browser origins.           |
| `SUPABASE_URL`             | Yes                                     | No     | Supabase Auth project URL used for token verification.     |
| `SUPABASE_PUBLISHABLE_KEY` | Yes                                     | No     | Publishable key used for backend `getUser()` verification. |
| `DATABASE_URL`             | Required when database access is used   | Yes    | Hosted PostgreSQL session-pooler connection string.        |

## Test and support-script variables

| Variable            | Required                           | Secret | Purpose                                                                                          |
| ------------------- | ---------------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| `DATABASE_URL_TEST` | Yes for database integration tests | Yes    | Dedicated isolated test database. It must never identify the development or production database. |

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
- Cloudflare API tokens; or
- external API credentials.

Repository-hosted deployment secrets must be stored using the relevant platform secret mechanism.

## AI Declaration

The preceding document was reviewed and corrected with the assistance of ChatGPT-Web[GPT-5.6 Sol].
The publishable-only account-deletion limitation was documented with the assistance of
Codex[GPT-5].
