# Local development setup

## Prerequisites

- Node.js 20 or later
- npm 10 or later
- Python 3 for the documentation site
- Access to the shared Supabase development project (ask Ben Swartz for an invitation)

## Install

```bash
git clone https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool.git
cd Sport-Analytics-Tool
npm ci
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
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

## Run

Backend:

```bash
npm run dev:backend
```

Frontend:

```bash
npm run dev:frontend
```

Documentation:

```bash
python -m pip install -r requirements-docs.txt
mkdocs serve
```

## Verify before a Pull Request

```bash
npm run check
```

The committed `package-lock.json` defines the exact dependency versions. Use `npm ci` for clean, reproducible installations locally and in CI.

The `npm run check` command runs the same structure, formatting, linting, type-checking, testing, and build checks used by the CI quality job.

## Configuration ownership

- Frontend variables must be public-safe and use the `VITE_` prefix.
- Database URLs, provider secrets, and external API keys belong only in backend/deployment secret stores.
- Environment variables must be validated at backend startup.
- Document each variable, its owner, and which deployment supplies it.

## Database rules

- `apps/backend/.env` holds a real credential and is ignored by Git. Never commit
  it, and never paste a connection string into an issue, a Pull Request or a group
  chat.
- Schema changes are applied only through a committed migration. Do not use the
  hosting provider's SQL editor to create, alter or drop anything. All six members
  hold owner access, so a manual change is possible and would leave the database
  out of step with the migrations with no record of what happened.
- Do not disable TLS certificate verification.
- The development project is paused after a period of inactivity on the current
  plan, and the plan retains no backups. If you find the project paused, restore
  it from the dashboard rather than creating a new one.

## AI Declaration

The preceding document was written with the assistance of Claude-Web[Claude Opus 5].
