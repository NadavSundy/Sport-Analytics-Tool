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
npm install
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

The first `npm install` should create and commit `package-lock.json`. Once it exists, CI should be changed from `npm install` to `npm ci` for reproducible installs.

## Configuration ownership

- Frontend variables must be public-safe and use the `VITE_` prefix.
- Database URLs, provider secrets, and external API keys belong only in backend/deployment secret stores.
- Environment variables must be validated at backend startup.
- Document each variable, its owner, and which deployment supplies it.
