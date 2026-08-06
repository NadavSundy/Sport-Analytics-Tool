# Authentication provider comparison

## Purpose

This comparison evaluates established managed authentication providers for the Sport Analytics Tool.

It considers:

- sign-up and sign-in;
- password reset;
- account deletion;
- OAuth 2.0 and OpenID Connect;
- React and Express integration;
- pricing and free-tier limitations;
- student access;
- local development;
- security and secret management.

It does not define final application roles, approved-submitter permissions or sport-specific authorisation rules.

Pricing was checked on 2026-08-06 and must be reviewed before production deployment.

## Summary

| Criterion                  | Supabase Auth                        | Firebase Authentication | Auth0                |
| -------------------------- | ------------------------------------ | ----------------------- | -------------------- |
| Managed sign-up/sign-in    | Yes                                  | Yes                     | Yes                  |
| Password reset             | Yes                                  | Yes                     | Yes                  |
| Account deletion           | Server-side Admin API                | Client/Admin SDK        | Management API       |
| Google OAuth               | Yes                                  | Yes                     | Yes                  |
| OAuth/OIDC support         | Yes                                  | Yes                     | Yes                  |
| React integration          | `@supabase/supabase-js`              | Firebase Web SDK        | Auth0 React SDK      |
| Express validation         | `getUser(token)` or JWT verification | Firebase Admin SDK      | JWT/JWKS middleware  |
| Isolated local service     | Supabase CLI stack                   | Authentication Emulator | No full local tenant |
| Existing project alignment | Strong                               | Additional platform     | Additional platform  |
| Selected                   | **Yes**                              | No; superseded          | No                   |

## Supabase Auth

### Account lifecycle

Supabase Auth supports managed email/password registration, sign-in, email verification, password reset, session refresh and social identity providers.

Administrative deletion is available through the Auth Admin API. It requires an elevated server-side key and must never be exposed through the browser.

Final account-management screens remain outside the current task.

### OAuth 2.0 and OpenID Connect

Supabase Auth supports Google social login through a managed OAuth flow. The frontend receives a Supabase session containing an access token representing the authenticated user.

Supabase can also act as an OAuth 2.1 and OpenID Connect provider. That capability is not required by the current proof, but demonstrates standards support.

### Frontend and backend integration

The React frontend can use `@supabase/supabase-js` with a project URL and publishable key.

The Express backend can validate a submitted access token with:

```ts
supabase.auth.getUser(accessToken);
```

This performs a request to the Supabase Auth server and returns an authenticated user or an error.

The frontend may use Supabase for managed authentication, but application data must still be accessed through the handwritten Express API.

### Cost and student access

The Supabase Free plan currently includes:

- 50,000 monthly active users;
- social OAuth providers;
- two active projects;
- 500 MB database storage;
- community support.

Free projects may pause after one week of inactivity.

No student-only entitlement is required or assumed. The project relies on the publicly available free plan, so it remains usable if student-specific access changes.

### Local development

The Supabase CLI can run PostgreSQL, Auth, Storage and supporting services locally. It requires Node.js 20 or later when installed through npm and a Docker-compatible runtime.

The shared hosted development project can also be used where running the full local stack is impractical.

### Security

- Publishable keys identify a public application and do not provide elevated access.
- Secret and legacy `service_role` keys bypass Row Level Security and must never appear in frontend code.
- Google OAuth client secrets belong only in Google and Supabase dashboard configuration.
- User access tokens must not be logged or committed.
- Row Level Security and final backend authorisation remain separate future decisions.

## Firebase Authentication

### Account lifecycle

Firebase Authentication supports email/password and social registration, sign-in, password-reset emails and user deletion through client and Admin SDKs.

### OAuth 2.0 and OpenID Connect

Google Sign-In uses Google OAuth 2.0 and OpenID Connect. Firebase issues a signed Firebase ID token after authentication.

Identity Platform adds enterprise OIDC and SAML capabilities.

### Frontend and backend integration

The React frontend can use the Firebase Web SDK. The Express backend can validate ID tokens using the Firebase Admin SDK.

The implementation was successfully proved in PR #24 but was superseded after the team clarified that authentication must use the existing Supabase platform.

### Cost and student access

Firebase provides the no-cost Spark plan without requiring payment details. Most social authentication options are available without charge, subject to product quotas.

Firebase Authentication with Identity Platform has separate daily and monthly active-user limits.

No student-specific entitlement is assumed.

### Local development

The Firebase Authentication Emulator provides isolated local identities and tokens. It requires the Firebase tooling and Java.

### Security

Firebase web configuration contains public identifiers. Admin SDK credentials and service-account private keys are server secrets and must never be committed.

Firebase remains technically suitable, but retaining it would introduce a second managed identity platform and an additional identity-mapping boundary.

## Auth0

### Account lifecycle

Auth0 supports hosted sign-up and sign-in, social providers, password reset and administrative account deletion through its Management API.

### OAuth 2.0 and OpenID Connect

Auth0 provides mature OAuth 2.0 and OpenID Connect support, discovery metadata, hosted login and standards-based API access tokens.

### Frontend and backend integration

The React frontend can use the maintained Auth0 React SDK. The Express backend can validate JWTs using maintained JWT/JWKS middleware.

### Cost and student access

The Auth0 Free plan currently provides up to 25,000 monthly active users and does not require a credit card.

Paid tiers are required for higher limits and some production features.

No currently verified student-specific entitlement is assumed. The evaluation therefore relies only on the public free plan.

### Local development

Auth0 supports localhost callback and logout URLs, but authentication still depends on a hosted Auth0 tenant. It does not provide a complete local identity service equivalent to the Supabase CLI or Firebase Emulator.

### Security

Auth0 domain and client ID values are public application configuration. Client secrets, signing credentials and Management API tokens are private server credentials.

## Decision

The selected provider is **Supabase Auth**, with Google enabled as the initial OAuth provider.

The main reasons are:

- the project already uses a shared Supabase project and PostgreSQL database;
- it avoids introducing another identity platform;
- it supports the required account lifecycle;
- it provides maintained React and backend integration;
- it provides Google OAuth support;
- it offers suitable free-tier capacity for development;
- it supports local development through the Supabase CLI;
- it preserves the separate React frontend and handwritten Express API;
- the backend can validate identity without defining final roles.

Firebase remains a technically suitable alternative and provided a useful initial proof. Auth0 also remains suitable if the project later requires identity features not offered by Supabase.

The selected foundation validates identity only. It does not grant application roles, submission access or sport-specific permissions.

## References

### Supabase

- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Auth architecture](https://supabase.com/docs/guides/auth/architecture)
- [Google login](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [`getUser`](https://supabase.com/docs/reference/javascript/auth-getuser)
- [Administrative user deletion](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser)
- [API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Local development](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Supabase pricing](https://supabase.com/pricing)

### Firebase

- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Firebase pricing](https://firebase.google.com/pricing)
- [Authentication Emulator](https://firebase.google.com/docs/emulator-suite/connect_auth)

### Auth0

- [Auth0 pricing](https://auth0.com/pricing)
- [Auth0 React quickstart](https://auth0.com/docs/quickstart/spa/react)
- [Auth0 Express quickstart](https://auth0.com/docs/quickstart/backend/nodejs)
- [Auth0 user deletion](https://auth0.com/docs/api/management/v2/users/delete-users-by-id)

## AI Declaration

The preceding document was planned and generated with the assistance of Codex[GPT-5].
