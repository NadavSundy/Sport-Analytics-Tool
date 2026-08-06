# Security overview

## Authentication

The project uses Supabase Auth with Google as the initial OAuth provider. The React frontend will obtain a Supabase access token through a managed sign-in flow, and the handwritten Express API validates that identity using `@supabase/supabase-js`.

The frontend may use Supabase for authentication, but application data remains behind the handwritten backend API.

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
