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
a policy receive a consistent, non-disclosing `403`. Canonical cricket reads allow bounded
anonymous access or optional consumer-key identification. Once `X-API-Key` is supplied, invalid or
revoked credentials receive the same generic `401` and never fall back to anonymous access.

See:

- [Authentication, accounts and authorisation](authentication.md)
- [Password recovery ownership](password-recovery.md)
- [Roles and permissions](roles-and-permissions.md)
- [Authentication provider comparison](auth-provider-comparison.md)
- [Privacy and retention](privacy-retention.md)

## Account deletion and retention

Account deletion uses a dedicated server-only Supabase secret for the Auth Admin operation while
normal token verification continues to use the publishable key. If that optional secret is absent,
the endpoint returns `501 ACCOUNT_DELETION_UNAVAILABLE` before changing local state and unrelated
routes continue to start normally. A configured deletion removes the managed Supabase identity and
personal application-account identifiers, permissions, approval, and scopes. Accepted cricket data
is retained to reproduce published statistics and preserve submission provenance.

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
- Disclose, before the reader submits it, any input text that leaves this platform for a third
  party, and never write that text to a log.

## API protection

- Enforce HTTPS in deployed environments.
- Apply safe CORS rules rather than allowing arbitrary origins in production.
- Bound anonymous canonical reads with HMAC-pseudonymised per-source and global durable limits.
- Apply consumer-specific rate limits, UTC daily quotas and privacy-minimised telemetry to valid keys.
- Accept API keys only in `X-API-Key`; redact credentials and never persist raw keys or key hashes in telemetry.
- Use timeouts, retries with limits, and circuit-breaking/fallback behaviour for external APIs.
- Return safe error messages and structured internal logs.
- Meter any anonymous operation that spends money on every attempt rather than every success,
  in durable storage, failing closed when the counter cannot be read.

## Question text sent to a language-model provider

The natural-language query feature sends the reader's question to Anthropic. This is the only place
in the platform where text a user typed leaves our infrastructure, so it is stated here rather than
left to the API documentation.

- **What leaves.** The question text, and the earlier questions in a conversation, framed as data.
  Nothing else a user supplied. No cricket data, identifier, credential, account detail or
  information about who asked accompanies it, and a test asserts the absence of database content in
  the request.
- **It is disclosed before it is sent.** The chat assistant states, above the first question, that
  question text is sent to Anthropic for processing along with up to five earlier questions from the
  same conversation, and links the privacy notice. A reader is never asked to submit before being
  told.
- **It is not stored in logs.** One line per request records the outcome, definition kind, definition
  version, model, token counts, elapsed time, conversation-turn count and what was assumed. **The
  question text and the model's raw output are never written, at any level**, because the question is
  the reader's own words and a log is the one place it would be retained. The earlier turns are
  counted, never quoted. The client hash is not logged either.
- **The caller is not identified.** The per-client limits key on a salted SHA-256 digest of the
  address, with a database-generated salt rotated per UTC date, so no raw IP address is stored and a
  client cannot be followed from one day to the next.
- **The feature is optional.** `LLM_API_KEY` is optional in every environment. Absent, the feature
  returns `503` and the rest of the API is unaffected.

The provider decision, the full data-sent list and the $10 spend limit are recorded in
[ADR-017](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-017-llm-provider-integration.md){ target="_blank" rel="noopener" }
and summarised in the [technology stack](../development/technology-stack.md).

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
- The generated Supabase Data API is disabled on the hosted instance and must not be
  used for application-domain data. Supabase authentication clients remain permitted:
  the backend uses `@supabase/supabase-js` to verify managed identities and perform
  authorised Auth Admin operations, while the frontend uses a managed Auth client.
  Neither client bypasses the handwritten Express API for application-domain data.

## AI Declaration

The authentication and authorization status was updated with the assistance of
Codex[GPT-5.6 Sol].
The issue #821 API-key fallback and anonymous-protection guidance was documented with the assistance
of Codex[GPT-5]. The language-model question-text section was added with the assistance of
Claude-Code[Claude Opus 5 (1M context)] under issue #817, from ADR-017 and the implemented logging
behaviour.
