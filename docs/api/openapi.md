# OpenAPI specification

The Sport Analytics handwritten backend API is described by a version-controlled OpenAPI specification.

The source specification is:

```text
docs/api/openapi.yaml
```

[Open the raw OpenAPI specification](openapi.yaml)

## Public backend endpoint

The backend exposes this same specification as a public, read-only documentation resource:

```text
Local development: http://localhost:3000/openapi.yaml
Deployed Container Apps API: https://statsthegame-dev-api.calmground-aa50efe2.southafricanorth.azurecontainerapps.io/openapi.yaml
```

`GET /openapi.yaml` does not require application sign-in or an API consumer key. It sits outside
`/api/v1` because it is a documentation resource rather than a versioned business-data endpoint.

`docs/api/openapi.yaml` remains the only maintained source of truth. The backend build copies the exact
version-controlled file to `apps/backend/dist/openapi.yaml`. Source-mode local development resolves the
repository file directly, while the compiled runtime resolves the bundled copy. The Container Apps
deployment image includes the complete backend `dist` directory, so the deployed endpoint serves the
same specification that is validated by `npm run openapi:lint`.

## Validation

Validate the specification from the repository root with:

```bash
npm run openapi:lint
```

The normal project quality gate also includes OpenAPI validation through:

```bash
npm run check
```

## Contract tests

Automated contract tests check the implemented API against this specification. See
[OpenAPI contract testing](contract-testing.md) for what they prove and what they do not.

```bash
npm run test:api-contract
```

## Implementation status

The specification distinguishes current backend behaviour from agreed future contracts using:

```text
x-implementation-status: implemented
```

and:

```text
x-implementation-status: planned
```

Planned operations must not be treated as deployed functionality.

## Interactive OpenAPI consumers

The OpenAPI document includes the metadata needed by interactive API clients.

- The `servers` list contains both the deployed development API and the local
  backend used during development.
- Public operations declare `security: []`.
- Authenticated application operations use `bearerAuth`; the value supplied by
  a client is the raw Supabase access token.
- External consumer operations use `apiKeyAuth`, sent in the `X-API-Key`
  request header. In an interactive OpenAPI client, paste only the raw consumer
  API key into the `apiKeyAuth` **Value** field; the client adds the
  `X-API-Key` header automatically.
- Request parameters and response media types are documented on the operations
  that expose them, including JSON and CSV exports.

Approved browser origins can read the documented consumer rate-limit and quota
response metadata through CORS, including `RateLimit-*`, `X-Quota-*` and
`Retry-After`. This allows interactive API clients to show the same safe
consumer-state metadata that direct HTTP clients receive.

Real bearer tokens, API keys and credentials must never be committed to the
OpenAPI file as examples. Authentication values entered into an interactive
client are runtime input only.

`x-implementation-status` remains authoritative. Making a contract renderable
or executable in an API explorer does not change a planned operation into an
implemented operation.

## Handwritten API boundary

The specification documents the team's Express HTTP API.

It does not document or expose Supabase-generated database endpoints.

Application data continues to follow:

```text
API consumer
    ↓
handwritten Express API
    ↓
service / repository
    ↓
PostgreSQL
```

## AI Declaration

The preceding document was planned, generated, reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
The issue #609 contract-test section was added with the assistance of Claude-Code[Claude Opus 5].
The Issue #658 public-specification endpoint and deployment-packaging documentation was planned, generated, reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
The Issue #659 OpenAPI contract hardening and regression tests were planned, generated, reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
The Issue #743 browser-visible consumer response-header documentation was generated and reviewed with the assistance of ChatGPT-Web[GPT-5.6 Sol].
