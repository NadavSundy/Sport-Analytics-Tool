# ADR-004: Supabase Authentication Foundation

- **Status:** Accepted
- **Date:** 2026-08-06
- **Participants:** Gabriel Raz, Git Push Pray project team
- **Related issues:** #14, #44
- **Related pull requests:** #24 and #34
- **Supersedes:** ADR-002

## Context

The Sport Analytics Tool requires managed user sign-up, sign-in, password reset and account deletion. The team may not build a custom password, session, token or OAuth implementation.

The project already uses Supabase-hosted PostgreSQL. After ADR-002 and its Firebase proof were merged, the team clarified that authentication must use Supabase Auth from the shared Supabase project.

The project must preserve separate React frontend and Express backend applications. Application data remains accessible through the team’s handwritten API rather than generated database endpoints.

This foundation must prove authenticated identity only. It must not define final application roles, approved-submitter permissions or sport-specific authorisation rules.

## Decision

The project will use **Supabase Auth** as its managed authentication foundation.

Google is enabled as the initial OAuth identity provider in the shared development Supabase project.

The intended flow is:

1. The React frontend initiates a managed Google sign-in using `@supabase/supabase-js`.
2. Supabase Auth completes the Google OAuth flow.
3. Supabase issues an access token representing the authenticated user.
4. The frontend sends the token to the handwritten Express API using the `Authorization: Bearer` header.
5. The Express API validates the token using `supabase.auth.getUser(accessToken)`.
6. The API uses the returned Supabase user ID as the external identity subject.

The proof-of-concept protected endpoint remains:

```http
GET /api/v1/auth/me
```

A successful response contains only the verified identity subject:

```json
{
  "identity": {
    "subject": "<supabase-user-id>"
  }
}
```

Authentication establishes identity only. It does not grant roles, submission access or sport-specific permissions.

## Account lifecycle capabilities

Supabase Auth supports:

- managed email/password sign-up and sign-in;
- Google social sign-in;
- email verification;
- managed password-reset flows;
- session creation, refresh and revocation;
- server-side administrative user deletion.

Final account-management screens remain outside this decision.

Account deletion requires an elevated server-side administrative key and must never be performed from the browser. Its final application workflow will be designed separately.

## Frontend integration

The React frontend uses `@supabase/supabase-js` with:

- the Supabase project URL;
- a publishable key;
- a configured redirect allow list;
- managed session storage and refresh behaviour.

The frontend foundation obtains the existing managed session, subscribes to authentication-state
changes and supplies current access tokens to the handwritten API client. It does not implement the
final sign-in interface or infer application authorisation from Supabase identity data.

## Backend integration

The Express backend uses `@supabase/supabase-js` without browser session persistence.

For each protected request, the backend passes the bearer access token to:

```ts
supabase.auth.getUser(accessToken);
```

This performs an authenticated request to the Supabase Auth server and returns a verified user or an authentication error.

The backend does not decode an unverified token, implement custom cryptography or create a custom session system.

## Environment configuration

The backend uses:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

The frontend will use:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Committed environment examples contain placeholders only.

No Supabase secret key, legacy `service_role` key, database password, OAuth client secret or user access token may be committed.

The Google OAuth client secret is stored only in the Google and Supabase dashboards.

## Local development

Supabase provides a project-scoped CLI that can run the database, Auth service and supporting tools locally.

The initial proof may use the shared hosted development project. A future local Supabase stack can be initialized and managed with the Supabase CLI in coordination with the database workstream.

Local Supabase services must not be exposed as production services.

## Security consequences

- Bearer access tokens are treated as secrets.
- Authorization headers remain redacted from application logs.
- Invalid, missing or expired tokens receive `401 Unauthorized`.
- Safe error messages do not expose token-validation details.
- Secret and `service_role` keys must never appear in frontend code.
- Future database access must use Row Level Security or backend-enforced authorisation as appropriate.
- Authentication does not automatically grant application permissions.
- Final account deletion must be performed through a protected server-side workflow.

## Alternatives considered

### Firebase Authentication

Firebase was selected in ADR-002 and successfully proved the middleware and protected-endpoint design.

It was superseded because the team requires authentication to use the existing shared Supabase platform. Retaining Firebase would introduce a second identity platform and require an additional identity-mapping boundary between Firebase and Supabase.

### Auth0

Auth0 provides mature OAuth 2.0 and OpenID Connect support, account lifecycle features and maintained React and Express integrations.

It was not selected because it would introduce an additional platform while the project already depends on Supabase and requires Supabase Auth.

### Custom authentication

A custom password, token or session system was rejected because it is outside the project requirements and would introduce unnecessary security risk.

## Advantages

- Uses an established managed authentication provider.
- Aligns authentication with the existing Supabase project.
- Supports Google OAuth and managed account lifecycle features.
- Uses maintained frontend and backend libraries.
- Preserves the handwritten Express API boundary.
- Provides a stable Supabase user ID for future account mapping.
- Can integrate with Row Level Security after authorisation requirements are defined.
- Avoids storing or verifying passwords in application code.

## Disadvantages

- Couples authentication availability to Supabase.
- Backend `getUser()` verification performs a network request to Supabase Auth.
- Google OAuth configuration remains distributed between Google and Supabase dashboards.
- Local Supabase development requires the CLI and a Docker-compatible runtime.
- Account deletion requires carefully protected elevated server credentials.
- Future roles and data-access policies still require separate design.

## Verification

The decision is considered established when:

- Google is enabled in the shared development Supabase project;
- safe environment placeholders are committed;
- Firebase runtime dependencies and emulator configuration are removed;
- the Express backend validates a Supabase access token;
- `GET /api/v1/auth/me` rejects unauthenticated requests;
- the endpoint succeeds for a verified development identity;
- automated tests cover missing, rejected and accepted tokens;
- no credentials or user tokens are committed;
- setup and architecture documentation describe the Supabase flow.

## Deferred decisions

This ADR does not decide:

- final roles;
- approved-submitter permissions;
- competition, season or fixture scope;
- sport-specific authorisation;
- final sign-up or sign-in screens;
- final password-reset or account-deletion screens;
- application profile schema;
- production Row Level Security policies.

## Later implementation note — 12 August 2026

Issue #44 implements several items intentionally deferred by this foundation decision without
changing the selected authentication provider. The backend now maps each verified Supabase subject
to `app_user`, returns the synchronized application profile, and enforces reusable administrator,
approved-submitter, and competition-scope policies. Roles, approval, and grants remain server-owned
application data and are never inferred from Supabase user metadata or frontend state.

The historical identity-only examples above describe the scope and acceptance evidence of issue
#14 at the time this ADR was accepted. The current endpoint contract and authorization behavior are
documented in `docs/security/authentication.md` and `docs/api/openapi.yaml`.

## References

- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Auth architecture](https://supabase.com/docs/guides/auth/architecture)
- [Supabase Google login](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase `getUser`](https://supabase.com/docs/reference/javascript/auth-getuser)
- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase CLI local development](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Supabase administrative user deletion](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser)

## AI Declaration

The preceding document was planned and generated with the assistance of Codex[GPT-5]. The
frontend implementation status and the issue #44 implementation note were later updated with the
assistance of Codex[GPT-5.6 Sol].
