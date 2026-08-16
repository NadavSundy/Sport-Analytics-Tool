# Frontend application

The frontend is the React/Vite web application for Stat'sTheGame. It is a separate application from the backend API and does not access application-domain data through generated Supabase endpoints.

## Responsibilities

- render public and authenticated user interfaces;
- manage browser navigation with React Router;
- initiate and maintain managed Supabase Auth sessions;
- send authenticated and anonymous requests to the handwritten backend API;
- provide responsive and accessible user experiences; and
- never treat frontend state as an authorisation control.

## Prerequisites

From the repository root:

- Node.js 20 or later;
- npm 10 or later; and
- access to the shared development Supabase Auth configuration.

Install all workspace dependencies with:

```bash
npm ci
```

## Environment

Copy the example file before starting the frontend.

### Windows PowerShell

```powershell
Copy-Item apps/frontend/.env.example apps/frontend/.env
```

### macOS / Linux / Git Bash

```bash
cp apps/frontend/.env.example apps/frontend/.env
```

Configure:

| Variable                        | Required    | Secret | Purpose                                                                                                        |
| ------------------------------- | ----------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`             | Recommended | No     | Base URL of the handwritten backend API. Defaults to `http://localhost:3000/api/v1` in the current API client. |
| `VITE_APP_NAME`                 | No          | No     | Display/configuration name reserved by the environment template.                                               |
| `VITE_APP_ENV`                  | No          | No     | Environment label reserved by the environment template.                                                        |
| `VITE_SUPABASE_URL`             | Yes         | No     | Public Supabase project URL used for managed authentication.                                                   |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes         | No     | Public Supabase publishable key used by the browser authentication client.                                     |

Only public-safe values may use the `VITE_` prefix. Never place a database password, OAuth client secret, Supabase secret/service-role key or other server credential in a frontend environment file.

The authenticated Account page includes a danger zone for permanent self-deletion. It explains
that personal identity and access are removed while cricket submissions and statistics are retained
without the former display name. The action requires an explicit checkbox, exact `DELETE` text and a
recent sign-in. After backend success, the frontend clears only its local Supabase session and
returns to the public home page.

## Run locally

From the repository root:

```bash
npm run dev:frontend
```

or from this workspace:

```bash
npm run dev --workspace=@sport-analytics/frontend
```

Default URL:

```text
http://localhost:5173
```

The backend should normally be running at the same time.

## Submitter access workflow

After authentication, `/account` loads the current application profile from the handwritten
backend. The page shows the persisted `not_requested`, `pending`, `approved`, or `rejected`
submitter state rather than inferring permission from the Supabase identity.

Eligible users can send a request through `POST /api/v1/submitter-access-requests`. The interface
disables the action while it is in progress, reloads `/api/v1/auth/me` after success or a stale
conflict, and does not offer another request while the persisted state is `pending` or `approved`.
Approved accounts can continue to the scoped event-submission interface. The backend remains the
authorisation boundary for every request and submission.

## Checks

From the repository root:

```bash
npm run lint --workspace=@sport-analytics/frontend
npm run typecheck --workspace=@sport-analytics/frontend
npm run test:frontend
npm run build --workspace=@sport-analytics/frontend
```

For the complete repository gate, run:

```bash
npm run check
```

Browser-level tests are configured at repository level and run with:

```bash
npm run test:e2e
```

## Build output

```bash
npm run build --workspace=@sport-analytics/frontend
```

creates `apps/frontend/dist/`. Generated build output must not be committed.

## Deployment

The frontend application is hosted on Azure App Service. Cloudflare Pages is used for the MkDocs documentation site, not for this frontend application.

See:

- `docs/deployment/azure-fronted.md`
- `docs/development/setup.md`
- `docs/development/technology-stack.md`
- `docs/security/authentication.md`

## Common problems

### Authentication configuration error

If the application reports that `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are required, copy the example environment file and populate both public values from the shared Supabase Auth project.

### Backend requests fail locally

Confirm that the backend is running and that `VITE_API_BASE_URL` points to its `/api/v1` base URL. Also confirm that the frontend origin is included in the backend `CORS_ORIGINS` value.

### Tests behave differently after dependency changes

Return to the repository root and run `npm ci` so the install matches the committed `package-lock.json`.

## AI Declaration

The preceding document was planned, generated, reviewed and edited with the assistance of
ChatGPT-Web[GPT-5.6 Sol]. The submitter access workflow section was updated with the assistance of
Codex[GPT-5].
The account-deletion interface behavior was documented with the assistance of Codex[GPT-5].
