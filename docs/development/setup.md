# Local development setup

## Prerequisites

- Node.js 20 or later
- npm 10 or later
- Python 3 for the documentation site
- Access to the selected PostgreSQL development environment

## Install

```bash
git clone https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool.git
cd Sport-Analytics-Tool
npm ci
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

Do not place real secrets in committed files.

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
