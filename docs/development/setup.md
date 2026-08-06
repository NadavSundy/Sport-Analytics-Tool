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

## Backend database setup

Configure the selected development database connection in the ignored `apps/backend/.env` file. Follow the database documentation for the approved connection string and TLS configuration.

Never commit the database password or a complete production connection string.

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
