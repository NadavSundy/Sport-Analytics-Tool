# Local development setup

## Prerequisites

- Node.js 20 or later
- npm 10 or later
- Python 3 for the documentation site
- Access to the selected PostgreSQL development environment
- Access to the shared development Supabase project
- A Docker-compatible runtime if using the optional local Supabase stack

## Install

Clone the repository and install the committed dependency versions:

```powershell
git clone https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool.git
Set-Location Sport-Analytics-Tool
npm.cmd ci
Copy-Item apps/backend/.env.example apps/backend/.env
Copy-Item apps/frontend/.env.example apps/frontend/.env
```

Do not place real secrets in committed files.

## Database connection

The development database is a hosted PostgreSQL instance. A few details are not
obvious and will cost you time if you skip them.

### Use the session pooler, not the direct connection

The Supabase dashboard offers several connection strings. Use the **session
pooler** on port 5432, whose host contains `pooler.supabase.com`.

Do not use the direct connection. Its host publishes no IPv4 address, so it fails
name resolution on most networks, including the campus network.

Copy the string into `apps/backend/.env`, replacing the placeholder:

```
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

If your password contains `@`, `:`, `/`, `?`, `#` or `%`, percent-encode it or the
URL will not parse.

### Certificate verification

The connection uses TLS and verifies the server certificate against the authority
certificate committed at `apps/backend/certs/supabase-ca.crt`. No setup is
required, but if you see `self-signed certificate in certificate chain`, the
certificate is not being found.

**Do not disable certificate verification to make the error go away.** Setting
`rejectUnauthorized` to `false` accepts any certificate from any server and
defeats the purpose of TLS.

### Verify

```bash
npm run db:check --workspace=@sport-analytics/backend
```

A successful run reports the database name, the server version and that prepared
statements are supported.

## Authentication setup

Set the development Supabase project URL and publishable key in the ignored `apps/backend/.env` file:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Obtain these values from the shared Supabase project's **Connect** or **API Keys** settings.

The backend does not require a secret key or legacy `service_role` key for token validation. Do not commit real environment files, OAuth client secrets, user access tokens, database passwords, or elevated Supabase keys.

Google OAuth is configured in the Supabase dashboard. Its client secret remains only in the Google and Supabase dashboards.

See the [Authentication Foundation](../security/authentication.md) for architecture, verification, and security guidance.

## Run

Start the backend:

```powershell
npm.cmd run dev:backend
```

In a separate terminal, start the frontend:

```powershell
npm.cmd run dev:frontend
```

Default local endpoints:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:3000/api/v1/health`
- Protected identity: `http://localhost:3000/api/v1/auth/me`

## Optional local Supabase stack

Supabase provides a CLI that can run PostgreSQL, Auth, Storage, and supporting services locally. This requires a Docker-compatible runtime.

Local Supabase initialization and database resets must be coordinated with the database workstream. Do not initialize or reset a shared environment without team agreement.

See the [Supabase CLI documentation](https://supabase.com/docs/guides/local-development/cli/getting-started) for the project-scoped workflow.

## Documentation

Create or activate a Python virtual environment, install the documentation dependencies, and serve the site:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-docs.txt
python -m mkdocs serve
```

The `.venv` directory must remain ignored by Git and Prettier.

## Verify before a Pull Request

Run the complete repository check:

```powershell
npm.cmd run check
```

This runs the repository structure, formatting, linting, type-checking, testing, and production-build checks used by CI.

For a clean, reproducible installation, use `npm.cmd ci`. The committed `package-lock.json` defines the exact dependency versions.

## Configuration ownership

- Frontend variables must be public-safe and use the `VITE_` prefix.
- The Supabase URL and publishable key may be used by public clients, but committed examples must contain placeholders.
- Supabase secret keys, legacy `service_role` keys, database URLs, OAuth client secrets, and external API credentials belong only in backend or deployment secret stores.
- Environment variables must be validated when the backend starts.
- Each variable must have a documented owner and deployment source.
- Development and production configuration must remain separate.

## Database rules

- `apps/backend/.env` holds real credentials and is ignored by Git. Never commit it, and never paste a connection string into an issue, Pull Request, or group chat.
- Schema changes are applied only through committed migrations. Do not use the hosting provider's SQL editor to create, alter, or drop database objects.
- Do not disable TLS certificate verification.
- The development project may pause after inactivity on the current plan. Restore the shared project instead of creating an uncoordinated replacement.

## AI Declaration

The preceding document was written with the assistance of Claude-Web[Claude Opus 5] and Codex[GPT-5].
