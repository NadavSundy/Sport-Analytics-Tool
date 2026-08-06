# ADR-002: Firebase Authentication Foundation

- **Status:** Accepted
- **Date:** 2026-08-05
- **Participants:** Gabriel Raz, Git Push Pray project team
- **Related issues:** #14

## Context

The Sport Analytics Tool requires managed user sign-up, sign-in, password reset and account deletion. The project team may not build a custom password, session, token or OAuth implementation.

The project must preserve separate React frontend and Express backend applications. Application data must be accessed through the team's handwritten backend API rather than exposing generated database endpoints directly to the frontend.

The authentication foundation must prove that the backend can validate an authenticated identity without prematurely defining final product roles, approved submitter permissions or sport-specific authorisation rules.

Google Cloud Identity Platform using Firebase Authentication and Auth0 were compared. The comparison considered account lifecycle capabilities, OAuth 2.0 and OpenID Connect, frontend and backend integration, pricing, student access, local development and secret management.

## Decision

The project will use **Google Cloud Identity Platform through Firebase Authentication** as its managed authentication foundation.

Google is enabled as the initial federated identity provider in a development-only Firebase project. Firebase remains capable of supporting other managed sign-in methods if future product decisions require them.

The intended authentication flow is:

1. The React frontend completes a managed Firebase sign-in flow.
2. Firebase issues an ID token representing the authenticated application identity.
3. The frontend sends the token to the Express API in the `Authorization: Bearer <token>` header.
4. The backend validates the token using the maintained Firebase Admin SDK.
5. The backend trusts only the identity returned by successful token validation.
6. The backend accesses Supabase-hosted PostgreSQL through its server-side connection.

The proof-of-concept endpoint is:

```text
GET /api/v1/auth/me
```

A successful response contains only the stable Firebase user identifier:

```json
{
  "identity": {
    "subject": "<firebase-user-id>"
  }
}
```

The foundation deliberately does not define application roles, submitter permissions, competition scope or sport-specific authorisation rules.

The Firebase Authentication Emulator will be used for isolated local development and repeatable authentication testing. The emulator host is rejected by backend configuration when `NODE_ENV` is `production`.

Application Default Credentials will be used for deployed backend access where supported. Firebase service-account private keys must not be committed.

## Alternatives considered

### Auth0

Auth0 provides mature OAuth 2.0 and OpenID Connect support, Universal Login, managed password reset, a React SDK and Express JWT middleware.

It was not selected because Firebase provides a larger Tier 1 free allowance, an Authentication Emulator and direct alignment with the selected Google identity provider. Auth0 would also introduce another external platform alongside the project's existing Google and Supabase services.

Auth0 remains a suitable fallback if Firebase no longer satisfies the project's requirements.

### Direct Google Identity Services

Using Google Identity Services directly would provide Google OAuth 2.0 and OpenID Connect sign-in.

It was not selected because Firebase adds an application identity layer, managed account lifecycle capabilities, backend Admin SDK validation and local authentication emulation. Direct Google integration would require more lifecycle and identity-management work.

### Supabase Auth

Supabase Auth could provide authentication alongside the existing Supabase-hosted PostgreSQL database.

It was not selected because the project chose Google/Firebase authentication and must maintain a clear handwritten backend API boundary. Supabase remains the database host, not the application's trusted authentication boundary.

### Custom authentication

Building password storage, reset tokens, sessions or OAuth handling internally was rejected because it violates the project requirements and would introduce unnecessary security risk.

## Advantages

- Uses an established managed authentication provider.
- Supports Google OAuth 2.0 and OpenID Connect.
- Supports managed sign-up, sign-in, password reset and account deletion capabilities.
- Uses maintained Firebase frontend and backend SDKs.
- Allows the Express backend to validate identities independently.
- Preserves the separate frontend and backend architecture.
- Preserves the handwritten API as the application data boundary.
- Works with Supabase-hosted PostgreSQL through the backend.
- Provides isolated local testing through the Authentication Emulator.
- Provides sufficient free capacity for project development.
- Avoids implementing custom password, token or session security.
- Allows production credentials to use deployment-managed identity rather than committed key files.

## Disadvantages

- Introduces dependency on Google and Firebase availability and pricing.
- Requires separate development and production Firebase projects.
- Firebase configuration is distributed between Firebase and Google Cloud consoles.
- Emulator tokens differ from production-signed tokens.
- Revocation checking can require an additional provider lookup.
- The Firebase Admin dependency currently includes transitive `uuid` audit findings that must be monitored for an upstream fix.
- Migrating to another identity provider would require frontend, backend and account-mapping changes.

## Consequences

- The frontend will eventually use the Firebase Web SDK for managed sign-in.
- The backend uses `firebase-admin` to validate Firebase ID tokens.
- Protected API routes must use backend authentication middleware.
- Bearer tokens must not be logged or included in URLs.
- Missing, malformed, expired, revoked or invalid tokens must receive `401 Unauthorized`.
- The backend may use the Firebase `uid` as the external identity subject.
- Application user records may reference the provider subject later, but that account model is outside this task.
- Supabase database credentials remain backend-only.
- Direct frontend access to generated Supabase data endpoints is not introduced.
- The real backend `.env`, service-account files, private keys and tokens must remain outside source control.
- Firebase web configuration uses public-safe environment variables.
- The Authentication Emulator must never be enabled in production.
- Final roles and sport-specific permissions require a separate future decision.
- Final sign-up, sign-in, password-reset and account-deletion screens remain future work.
- Firebase and its transitive dependencies must be reviewed during dependency maintenance.

## Verification

The decision is considered established when:

- a development Firebase project exists;
- a Firebase web application is registered;
- Google authentication is enabled;
- localhost is authorised for development;
- safe environment placeholders are committed;
- the backend validates Firebase identities using `firebase-admin`;
- `GET /api/v1/auth/me` is protected;
- an unauthenticated request returns `401 Unauthorized`;
- an emulator-authenticated request returns `200 OK`;
- automated tests cover missing, invalid and accepted tokens;
- bearer tokens are redacted from request logs;
- no credentials or tokens are committed; and
- the complete architecture and local setup are documented.

## Review date

This decision will be reviewed:

- during the Sprint 1 close-out;
- before implementing final account-management screens;
- before defining roles or sport-specific permissions;
- before creating the production Firebase project; and
- when Firebase pricing, security guidance or SDK support changes.

## AI Declaration

The preceding document was planned and generated with the assistance of Codex[GPT-5].
