# Security overview

## Authentication

The project uses Supabase Auth with Google as the initial OAuth provider. The React frontend obtains
a Supabase access token through a managed sign-in flow, and the handwritten Express API validates
that identity using `@supabase/supabase-js`.

The frontend may use Supabase for authentication, but application data remains behind the handwritten backend API.

After verification, the backend creates or synchronizes a provider-neutral `app_user` record and
loads role, deprecated submitter-request state, disabled state, and granted competition scopes from
PostgreSQL. Authentication alone never grants or changes those values.

Reusable backend policies protect `admin` routes, `submitter`/`admin` routes, and target
competition scope. Missing or invalid credentials receive `401`; authenticated accounts that fail
a policy receive a consistent, non-disclosing `403`. Public read routes do not use authentication.

See:

- [Authentication, accounts and authorisation](authentication.md)
- [Roles and permissions](roles-and-permissions.md)
- [Authentication provider comparison](auth-provider-comparison.md)
- [Privacy and retention](privacy-retention.md)

## Account deletion and retention

Deleting an account removes the managed Supabase identity and personal application-account
identifiers, permissions, approval, and scopes. Accepted cricket data is not personal profile data
and remains necessary to reproduce published statistics and preserve submission provenance.

The application therefore retains a permanently disabled, non-identifying `app_user` tombstone and
its stable internal identifier. Submissions, fixtures, deliveries, statistics, corrections, source
metadata, and audit relationships do not cascade from `app_user`. See the privacy and retention
policy for failure handling and limitations.

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

## AI Declaration

The authentication and authorization status was updated with the assistance of
Codex[GPT-5.6 Sol].
