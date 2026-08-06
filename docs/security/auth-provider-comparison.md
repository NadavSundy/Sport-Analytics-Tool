# Authentication provider comparison

- **Date:** 2026-08-05
- **Related issue:** #14

## Purpose

The Sport Analytics Tool requires an established authentication provider that supports sign-up, sign-in, password reset and account deletion. The team must not build its own password, session or token system.

This comparison considers Google Cloud Identity Platform using Firebase Authentication and Auth0. It does not define final application roles, submitter permissions or sport-specific authorisation rules.

## Decision matrix

| Criterion              | Firebase Authentication           | Auth0                      |
| ---------------------- | --------------------------------- | -------------------------- |
| Sign-up and sign-in    | Strong: email/password and Google | Strong: Universal Login    |
| Password reset         | Managed reset emails              | Managed hosted reset flow  |
| Account deletion       | Client and Admin SDKs             | Management API required    |
| OAuth 2.0/OIDC         | Google OAuth/OIDC                 | OAuth/OIDC with PKCE       |
| React integration      | Firebase Web SDK                  | Auth0 React SDK            |
| Express validation     | Firebase Admin SDK                | Auth0 JWT middleware       |
| Local development      | Authentication Emulator           | Remote tenant required     |
| Free allowance         | 50,000 Tier 1 MAU                 | 25,000 MAU                 |
| Student access         | Free tier sufficient              | Free tier sufficient       |
| Supabase compatibility | Compatible through backend        | Compatible through backend |
| Secret management      | ADC or server credentials         | Server-side client secrets |
| Overall fit            | **Selected**                      | Suitable alternative       |

## Account lifecycle

### Firebase Authentication

Firebase Authentication supports email/password registration and federated registration through Google Sign-In. It provides managed password-reset emails and allows recently authenticated users to delete their own accounts. Administrative deletion is available through the Firebase Admin SDK.

### Auth0

Auth0 supports database, social, passwordless and federated authentication through Universal Login. It provides a hosted password-reset flow. Account deletion is available through the Dashboard or Management API, so an application-controlled deletion flow would require backend Management API integration.

## OAuth 2.0 and OpenID Connect

Google Sign-In uses Google OAuth 2.0 and OpenID Connect. After authentication, Firebase issues a signed Firebase ID token representing the application identity.

Auth0 implements OAuth 2.0 and OpenID Connect. Its React integration supports the Authorization Code Flow with PKCE.

In both designs, the frontend obtains a token and sends it to the handwritten Express API. The backend validates the token before trusting the identity.

## Frontend and backend integration

### Firebase Authentication

The React frontend can use the maintained Firebase Web SDK. The Express backend uses the maintained `firebase-admin` SDK and `verifyIdToken()` to validate the signature, issuer, audience, expiry and revocation state.

### Auth0

The React frontend can use `@auth0/auth0-react` and Universal Login. The Express backend can use Auth0 JWT middleware to validate the issuer, audience and public signing keys.

Neither approach requires direct frontend database access. The backend remains responsible for accessing Supabase-hosted PostgreSQL and enforcing application rules.

## Cost and student access

Google Identity Platform currently provides up to 50,000 monthly active users at no cost for Tier 1 methods, including email and social providers. External OIDC and SAML federation use a separate Tier 2 pricing model.

Auth0 currently provides up to 25,000 monthly active users on its Free plan.

Both free allowances are sufficient for development. The project does not depend on receiving an unconfirmed student, startup or institutional discount. Pricing must be reviewed again before production deployment.

## Local development

Firebase provides an Authentication Emulator that can create disposable local identities and issue emulator tokens. The Firebase Admin SDK can validate these tokens when `FIREBASE_AUTH_EMULATOR_HOST` is configured.

Auth0 supports localhost callback URLs, but normal integration testing still depends on a remote development tenant.

Firebase therefore provides stronger isolated local-development support.

## Security and secret management

For Firebase:

- Firebase web configuration contains public identifiers but remains environment-specific.
- Service-account files, private keys and administrative credentials must never be committed.
- Application Default Credentials should be used in supported deployments.
- The Authentication Emulator must never be enabled in production.
- Development and production must use separate Firebase projects.

For Auth0:

- SPA client IDs, domains and audiences are public configuration.
- Client secrets, Management API credentials and tokens must remain server-side.
- Development and production tenants must remain separate.

For both providers:

- Tokens must be sent through the `Authorization` header over HTTPS.
- Tokens must not appear in URLs or logs.
- Frontend authentication state must not be trusted by the backend.
- Exact CORS origins and authorised domains must be configured.
- Backend token validation is required on every protected endpoint.

## Selected provider

The selected foundation is **Google Cloud Identity Platform using Firebase Authentication**, with Google enabled as the initial federated identity provider.

The selection is motivated by:

- managed Google OAuth 2.0 and OpenID Connect support;
- complete managed account-lifecycle capabilities;
- maintained React and Node.js SDKs;
- backend verification through `firebase-admin`;
- isolated local testing through the Authentication Emulator;
- compatibility with Supabase-hosted PostgreSQL;
- sufficient free development capacity; and
- preservation of the separate frontend, backend and handwritten API.

The proof implementation validates Firebase identities in the Express backend and protects `GET /api/v1/auth/me`. It does not implement final login pages, roles or sport-specific permissions.

## Sources

### Google and Firebase

- [Firebase Authentication overview](https://firebase.google.com/docs/auth)
- [Google Sign-In for web](https://firebase.google.com/docs/auth/web/google-signin)
- [Manage Firebase users](https://firebase.google.com/docs/auth/web/manage-users)
- [Verify Firebase ID tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
- [Firebase Authentication Emulator](https://firebase.google.com/docs/emulator-suite/connect_auth)
- [Google Identity Platform pricing](https://cloud.google.com/identity-platform/pricing)
- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)
- [Supabase Firebase integration](https://supabase.com/docs/guides/auth/third-party/firebase-auth)

### Auth0

- [Auth0 pricing](https://auth0.com/pricing)
- [Auth0 React quickstart](https://auth0.com/docs/quickstart/spa/react)
- [Auth0 Express API quickstart](https://auth0.com/docs/quickstart/backend/nodejs)
- [Auth0 password change](https://auth0.com/docs/api/authentication/change-password/change-password)
- [Auth0 user deletion](https://auth0.com/docs/api/management/v2/users/delete-users-by-id)

## AI Declaration

The preceding document was planned and generated with the assistance of Codex[GPT-5].
