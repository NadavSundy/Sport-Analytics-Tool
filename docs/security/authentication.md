# Authentication foundation

## Overview

The Sport Analytics Tool uses **Supabase Auth** as its managed authentication provider.

Google is enabled as the initial OAuth identity provider in the shared development Supabase project.

The foundation proves that the handwritten Express API can validate an authenticated Supabase identity. It does not implement final account screens, roles, submission permissions or sport-specific authorisation.

See:

- [Authentication provider comparison](auth-provider-comparison.md)
- `evidence/decisions/ADR-004-supabase-authentication-foundation.md`
- superseded decision: `evidence/decisions/ADR-002-firebase-authentication-foundation.md`

## Architecture

```mermaid
sequenceDiagram
    participant User
    participant Frontend as React frontend
    participant Supabase as Supabase Auth
    participant API as Express API
    participant Database as Supabase PostgreSQL

    User->>Frontend: Start Google sign-in
    Frontend->>Supabase: Managed OAuth request
    Supabase->>Supabase: Complete Google OAuth flow
    Supabase-->>Frontend: Supabase session and access token
    Frontend->>API: Authorization: Bearer access-token
    API->>Supabase: getUser(access-token)
    Supabase-->>API: Verified Supabase user
    API-->>Frontend: Identity subject
    API->>Database: Future authorised application operation
```

Supabase manages authentication and identity.

The Express API remains the application’s trusted boundary. The frontend must access application data through the handwritten API rather than using generated Supabase data endpoints directly.

## Development project configuration

The shared development Supabase project contains:

- Supabase Auth;
- Google enabled as a social provider;
- the Google OAuth client ID and secret;
- the development Site URL;
- allowed development redirect URLs;
- development identities only.

The Google OAuth client is configured with:

```text
Authorized JavaScript origin:
http://localhost:5173

Authorized redirect URI:
https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback
```

The redirect URI must exactly match the callback shown in the Supabase Google provider settings.

The Google client secret is stored only in the Google and Supabase dashboards. It must not be placed in source control, frontend code, documentation or chat messages.

## Backend environment configuration

The backend requires:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

The committed `apps/backend/.env.example` contains placeholders only.

Real development values belong in:

```text
apps/backend/.env
```

That file is ignored by Git.

The backend does not require a Supabase secret key or legacy `service_role` key to validate an access token.

## Frontend environment configuration

The managed frontend authentication client uses:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

These values identify the public Supabase application. The frontend fails during application
initialisation when either value is absent so that authentication is never configured with an
invented fallback.

The frontend provides `/create-account` and `/sign-in` pages that both start the managed Google
OAuth flow. Successful authentication returns to `/`. No Supabase secret key, database password
or OAuth client secret may be added to a `VITE_` variable.

## Frontend session state

The React application creates one browser Supabase client and enables Supabase's managed session
persistence, token refresh and redirect-session detection. Application code does not store access
or refresh tokens separately.

`AuthProvider` exposes the shared frontend identity state:

- `isLoading` remains true while the existing Supabase session is requested;
- `session` contains the current managed session or `null`;
- `identity` contains the Supabase user from that session or `null`; and
- `isAuthenticated` describes whether a session is present.

The provider subscribes to Supabase authentication-state changes and unsubscribes when it is
unmounted. Supabase sign-in, sign-out and managed token-refresh events therefore replace the shared
session state. This identity state must not be interpreted as an application role, approved
submitter status, administrator permission or scoped grant.

Signed-out navigation exposes Create Account and Sign In. Signed-in navigation exposes Account and
Sign Out, and updates from the shared authentication state without a page reload. `/account`
displays only the email already present on the Supabase session identity when available. Sign-out
uses the managed Supabase operation and returns to `/`.

## Frontend authenticated API requests

`createAuthenticatedApiClient` sends application requests only to the configured handwritten API
base URL. When its token provider has a current access token, the client sets
`Authorization: Bearer <access-token>`. Without a token it removes the authorization header rather
than fabricating or retaining a credential. `useAuthenticatedApiClient` connects this request
client to the current session exposed by `AuthProvider`.

Failed responses are exposed as `ApiResponseError` values. A backend `401` has the
`unauthenticated` kind, while `403` has the distinct `forbidden` kind. The request client does not
sign users out, redirect them or infer permissions from either response; those user journeys remain
deferred to later route and interface work.

## Backend token validation

The backend creates a server-side Supabase client using `@supabase/supabase-js`.

Browser session behaviour is disabled:

```ts
auth: {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
}
```

For a protected request, the backend extracts the bearer token and calls:

```ts
supabase.auth.getUser(accessToken);
```

Supabase Auth validates the submitted access token and returns the authenticated user or an error.

The backend returns only the stable Supabase user ID:

```json
{
  "identity": {
    "subject": "<supabase-user-id>"
  }
}
```

The API does not trust an unverified, manually decoded token.

## Protected endpoint

### Request

```http
GET /api/v1/auth/me
Authorization: Bearer <supabase-access-token>
```

### Successful response

```http
HTTP/1.1 200 OK
```

```json
{
  "identity": {
    "subject": "<supabase-user-id>"
  }
}
```

### Missing or invalid token

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer
```

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "A valid authentication token is required."
  }
}
```

The error response deliberately does not reveal whether a token was malformed, expired, revoked or associated with a missing user.

## Running the backend

Install dependencies:

```powershell
npm.cmd install
```

Copy the environment example:

```powershell
Copy-Item apps/backend/.env.example apps/backend/.env
```

Replace only the placeholders in the ignored `.env` file.

Start the backend:

```powershell
npm.cmd run dev:backend
```

Verify the health endpoint:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/v1/health"
```

## Unauthenticated proof

Call the protected endpoint without a token:

```powershell
curl.exe -i http://127.0.0.1:3000/api/v1/auth/me
```

Expected result:

```text
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer
```

## Authenticated development proof

Use a disposable identity in the shared development Supabase project.

Obtain an access token through a managed Supabase Auth sign-in flow. Keep the token only in memory and do not print, save, screenshot or commit it.

Call the backend with:

```powershell
curl.exe -i `
  -H "Authorization: Bearer YOUR_TEMPORARY_ACCESS_TOKEN" `
  http://127.0.0.1:3000/api/v1/auth/me
```

Expected result:

```text
HTTP/1.1 200 OK
```

The response must contain the verified Supabase identity subject.

Replace the token immediately after use and clear it from shell history where practical. Never include the real token in test evidence.

## Automated tests

The backend tests cover:

1. a request without a bearer token returns `401`;
2. a rejected token returns `401`;
3. a verified token returns `200` with the identity subject.

The test application injects a mock verifier. Automated tests therefore do not require live Supabase credentials or contact the hosted Auth service.

The manual development proof separately exercises the real `supabase.auth.getUser()` validation path.

Run the backend checks with:

```powershell
npm.cmd run typecheck --workspace @sport-analytics/backend
npm.cmd run lint --workspace @sport-analytics/backend
npm.cmd test --workspace @sport-analytics/backend
npm.cmd run build --workspace @sport-analytics/backend
```

## Local Supabase support

Supabase provides a CLI that can run the database, Auth service and supporting services locally.

A project-scoped setup uses:

```powershell
npm.cmd install --save-dev supabase
npx.cmd supabase init
npx.cmd supabase start
```

The CLI requires a Docker-compatible runtime.

Local Supabase configuration must be coordinated with the database workstream. Do not initialize or reset a shared database without team agreement.

A local stack is for development only. It has development credentials and must never be exposed publicly.

## Password reset

Supabase Auth provides managed password-reset operations and email flows.

The final password-reset page, redirect handling, email templates and production SMTP configuration remain future work.

The hosted default email service has development rate limits. Production use requires appropriate SMTP configuration and monitoring.

## Account deletion

Supabase provides administrative account deletion through its Auth Admin API.

Deletion requires an elevated server-side key. Therefore:

- deletion must never run directly in the browser;
- a secret or legacy `service_role` key must never be exposed to the frontend;
- the final endpoint must reauthenticate the user where appropriate;
- associated application data retention and deletion must be defined;
- the final workflow requires separate authorisation and auditing.

Account deletion is not implemented by this foundation.

## Authentication versus authorisation

Authentication answers:

> Who is making this request?

Authorisation answers:

> What is this identity allowed to do?

A valid Supabase identity does not automatically grant:

- administrator access;
- approved-submitter status;
- competition access;
- season or fixture access;
- event submission rights;
- sport-specific permissions.

Those rules depend on future stakeholder and product-flow decisions.

## Security requirements

- Use HTTPS in deployed environments.
- Never log bearer access tokens.
- Redact the `Authorization` header from request logs.
- Keep Google OAuth client secrets in provider dashboards.
- Never expose Supabase secret or `service_role` keys in frontend code.
- Keep real environment files ignored.
- Commit placeholders only.
- Configure exact redirect URLs and CORS origins.
- Use separate development and production configuration.
- Return safe authentication errors.
- Apply rate limiting before exposing sensitive production endpoints.
- Define Row Level Security and backend authorisation separately.
- Rotate credentials immediately if exposure is suspected.

## Deferred scope

This foundation intentionally does not implement:

- final password-reset screens;
- final account-deletion screens;
- application profile persistence;
- final roles;
- approved-submitter permissions;
- competition, season or fixture permissions;
- sport-specific authorisation;
- production Row Level Security policies.

## References

- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Auth architecture](https://supabase.com/docs/guides/auth/architecture)
- [Google login](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [`getUser`](https://supabase.com/docs/reference/javascript/auth-getuser)
- [Password authentication](https://supabase.com/docs/guides/auth/passwords)
- [Administrative user deletion](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser)
- [API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)

## AI Declaration

The preceding document was planned and generated with the assistance of Codex[GPT-5]. The
frontend session-state and authenticated-request sections were later updated with the assistance of
Codex[GPT-5.6 Sol].
