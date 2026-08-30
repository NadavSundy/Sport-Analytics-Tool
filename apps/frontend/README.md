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

The explicit application form is also supported from the repository root:

```bash
npm run dev frontend
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

## Public homepage

The `/` route is a static, no-fetch introduction to the public T20 record. Its editorial sequence
moves from the approved tagline through the Explosive, Exact and Traceable principles, an
illustrative accepted-delivery example, the existing Fixtures, Competitions, Players and Teams
journeys, real public API paths, and a final Fixtures action. The explanatory values use implemented
delivery fields and fixture-statistic rules; they are labelled as an example and are not presented
as live match data.

The hero renders semantic copy, links and a lightweight SVG pitch immediately. A single procedural
Three.js canvas is then imported as a separate browser chunk only when WebGL is available and the
user has not requested reduced motion. The moving ball is a visual metaphor for an event entering
derived values. It is not an actual delivery trajectory, and the application does not have or
request ball-location, bounce-coordinate or shot-direction data.

The scene uses no models, textures, shadows or post-processing. It clamps device pixel ratio to
`1.5`, pauses outside the viewport and while the document is hidden, rests between short delivery
sequences, and disposes its frames, timers, observers, renderer, geometries and materials on
unmount. Day Match and Night Match colours are read from the existing semantic CSS tokens and
updated while the scene remains mounted. Reduced motion, unavailable WebGL, a delayed or failed
chunk, and pre-enhancement first paint all retain the complete static visual and page content.
Unexpected WebGL context loss stops the animation and immediately reveals the same fallback; a
restored context resumes the existing scene without replacing its canvas or renderer.

## Submitter access workflow

After authentication, `/account` loads the current application profile from the handwritten
backend. The page shows the persisted `not_requested`, `pending`, `approved`, or `rejected`
request state and the server-owned `viewer | submitter | admin` application role rather than
inferring permission from the Supabase identity.

Eligible users choose from public competitions and send that competition through
`POST /api/v1/submitter-access-requests`. Fixtures are not exposed as request scopes. The interface
disables the action while it is in progress, reloads `/api/v1/auth/me` after success or a stale
conflict, displays the named pending competition, and does not offer another request while the
persisted state is `pending` or `approved`.
Accounts with the `submitter` or `admin` role can continue to the event-submission interface. It
labels an ordinary submitter's assigned competition scope, while it labels administrator access as
unrestricted and lists eligible fixtures from every competition. The deprecated approval state alone
never exposes the submission interface. The backend remains the authorisation boundary for every
request and submission.

## Accepted event correction

After the backend accepts a direct submission, `/submissions/new` offers its events for correction
only to the already verified `submitter` or `admin`. The selected event is prefilled into labelled
delivery, player, run, extras, and wicket controls. Participating players use public display names;
the immutable event identity and backend-owned occurrence order remain read-only.

The form sends only event content to `PUT /api/v1/submissions/events/{eventId}`. Delivery extras and
the delivery total are calculated from the editable event values, while published match and player
statistics are never editable. After success, the current event display is updated and the embedded
fixture statistics are requested again. Validation and conflict feedback identifies the relevant control;
authentication or scope denial withdraws the correction action without changing the accepted event.

The Basic interface uses events accepted in the current direct-submission interaction because the
current API does not yet expose historical submission list/detail context. Historical correction
discovery belongs to that separate planned workflow.

## Administrator user management

An authenticated administrator can open `/admin/users` from the account page. The responsive user
cards expose each account's role, request state, requested competition, current competition scope,
account state, and most recent submitter-access audit. A pending request shows its competition as a
read-only approval scope; labelled checkboxes remain available for re-scoping an existing submitter.
Administrators can approve or reject a pending request, replace an existing submitter's scope, or
revoke access. `not_requested` and `rejected` viewers receive a clear
read-only state without approval or scope controls.

The page checks the current application role before requesting management data, but that check is
only a user-interface guard. The handwritten backend independently requires the `admin` role for
both list and update operations. Successful updates replace the displayed user immediately; loading,
empty, forbidden, validation, request-failure, and success states remain available to assistive
technology through status or alert regions.

## Public collection filters

Competition, season, fixture, team, and player filters use the same readable-name combobox. Opening
a control requests up to the API's documented maximum page size and displays options without
requiring typed text; typing fuzzy-ranks the returned readable names. Internal relationship
identifiers remain available only in routed query state and outgoing handwritten-API requests.

The controls preserve visible labels, keyboard focus, listbox navigation, selection, clearing,
dismissal, and screen-reader result announcements. Each option request has loading, no-match,
failure, and retry states. Changing or clearing a parent filter clears its dependent draft
selections before another filter request can be applied.

## Public related-record overviews

Competition overviews embed their published seasons, season-grouped fixtures, and teams. Season
overviews place fixtures first and also show participating teams, while team overviews show their
fixtures and players. Each section requests the handwritten API independently and keeps its own
loading, empty, error, retry, and cursor-pagination state, so one failed relationship does not
replace the successfully loaded overview or another section.

Visible headings, facts, messages, and links use competition, season, fixture, team, and player
names. Stable identifiers remain internal to routes, React keys, and API filters. Related fixture
rows link directly to the named fixture overview, and the embedded lists retain the existing
keyboard-accessible record-list and responsive layout patterns.

## Public match overviews

Opening a published fixture automatically requests its statistics and participating players. The
fixture identity and match metadata remain visible while those sections load or fail independently.
Published outcome and completeness information, innings totals, batting and bowling figures, and
named team and player links are displayed on the same responsive overview without a separate
statistics action.

Each published statistic retains a secondary calculation-trace link. The trace displays accepted
deliveries with readable player names and returns to the match overview; stable fixture, statistic,
team, player, and event identifiers remain confined to API requests, route values, and React keys.
When trace events are available, labelled CSV and JSON controls export the displayed innings/team or
player slice without exposing raw filter identifiers or pagination controls. Empty and failed exports
remain explicit to assistive technology.

## Public player overviews

Opening a published player immediately requests that player's paginated match history. Each match
uses its named teams as the fixture link and shows readable competition, season, date, match type,
player team, and squad role context. Available batting and bowling figures reuse the match-overview
metric presentation; partial source-data notices, unavailable disciplines, and matches with no
published figures remain explicit without calculating career aggregates in the browser.

The player heading remains usable while match history loads or fails. The embedded section keeps
its own loading, empty, error, retry, and cursor-pagination behavior, and its named fixture links
open the complete match overview.

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

### A valid API response is rejected after a shared-contract change

Build the contracts workspace, then restart the frontend development server:

```bash
npm run build --workspace=@sport-analytics/contracts
npm run dev:frontend
```

The development server rebuilds its optimized contracts dependency on startup. A running server
must still be restarted after the compiled contracts change.

### Tests behave differently after dependency changes

Return to the repository root and run `npm ci` so the install matches the committed `package-lock.json`.

### Rollup native module is missing in WSL

`node_modules` contains platform-specific optional packages. A dependency tree installed from
Windows may contain Rollup's Windows binary but not `@rollup/rollup-linux-x64-gnu`, which Vite needs
inside WSL. From a WSL login shell, repair the root workspace install with:

```bash
cd /mnt/c/Users/deanf/Downloads/Sport-Analytics-Tool
node --version
npm install --include=optional
```

Use the Node 20-or-newer login-shell installation that will also run Vite. If npm reports `ENOENT`
while creating the Linux `@esbuild` or `@rollup` target in a checkout under `/mnt/c`, close Windows
Node processes, create the exact missing directory reported by npm from Windows PowerShell, and run
the WSL install again. This works around stale NTFS/WSL directory state without deleting the
lockfile.

Install and run the project consistently from the same operating-system environment. If switching
between Windows and WSL regularly, keep a separate WSL checkout (for example under `~/src`) so the
two environments do not replace each other's native optional packages. Do not delete or regenerate
the committed lockfile to fix this error.

## AI Declaration

The preceding document was planned, generated, reviewed and edited with the assistance of
ChatGPT-Web[GPT-5.6 Sol]. The submitter access workflow section was updated with the assistance of
Codex[GPT-5].
The account-deletion interface behavior was documented with the assistance of Codex[GPT-5].
The shared-contract development troubleshooting guidance was updated with the assistance of
Codex[GPT-5.6 Sol].
The public collection filter behavior was documented with the assistance of Codex[GPT-5.6 Sol].
The public related-record overview behavior was documented with the assistance of
Codex[GPT-5.6 Sol].
The public match overview behavior was documented with the assistance of Codex[GPT-5.6 Sol].
The public player overview behavior was documented with the assistance of Codex[GPT-5.6 Sol].
The issue #255 competition selection and read-only approval scope were documented with the
assistance of Codex[GPT-5].
The accepted-event correction workflow was documented with the assistance of Codex[GPT-5.6 Sol].
The Issue #311 administrator submission interface was documented with the assistance of Codex[GPT-5].
The issue #314 static homepage, progressive Three.js enhancement, fallback, motion and performance
behavior were documented with the assistance of Codex[GPT-5.6 Sol].
