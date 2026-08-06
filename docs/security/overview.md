# Security overview

## Authorisation

Authentication does not grant automatic submission access. The backend must enforce roles and competition, season and fixture scope for every protected operation. Final roles and sport-specific permissions remain subject to future stakeholder and product-flow decisions.

## Authentication

The project uses Google Cloud Identity Platform through Firebase Authentication. The React frontend will obtain a Firebase ID token through a managed sign-in flow, and the handwritten Express API validates that token using the Firebase Admin SDK.

Authentication confirms identity only. It does not grant submission access, application roles or sport-specific permissions.

See:

- [Authentication foundation](authentication.md)
- [Authentication provider comparison](auth-provider-comparison.md)

## Input and data protection

- Validate all request bodies, files, parameters, and query strings.
- Apply upload size/type limits and reject invalid files with actionable messages.
- Use transactions and uniqueness constraints for idempotent batch ingestion.
- Parameterise database queries.
- Store secrets in deployment secret stores, never source control.
- Minimise personal data and define deletion/retention behaviour.

## API protection

- Enforce HTTPS in deployed environments.
- Apply safe CORS rules rather than allowing arbitrary origins in production.
- Add rate limits and quotas before issuing public consumer keys.
- Use timeouts, retries with limits, and circuit-breaking/fallback behaviour for external APIs.
- Return safe error messages and structured internal logs.

## Verification

Security review must include automated dependency scanning, route-level authorisation tests, negative validation tests, secret scanning, deployment review, and manual threat-model updates for major features.

## Database credentials

- The hosted PostgreSQL connection string is a secret. It lives only in the
  ignored `apps/backend/.env` locally, and in the deployment secret store
  otherwise. It must never appear in an issue, a Pull Request, a commit or a group
  chat.
- The connection uses TLS with certificate verification enabled, against the
  authority certificate committed at `apps/backend/certs/supabase-ca.crt`.
  Certificate verification must not be disabled to resolve a connection error.
- All six team members hold owner access on the hosted project. Schema changes are
  therefore applied only through committed migrations, never through the
  provider's SQL editor, so that the database and the migration history cannot
  diverge without record.
- If the connection string is exposed, rotate the database password from the
  provider dashboard, update the deployment secret store, and notify the team. The
  exposed value must be treated as compromised even if the exposure appears
  contained.
- The generated Data API is disabled on the instance. It must not be enabled, and
  the Supabase client library must not be added to any workspace.
