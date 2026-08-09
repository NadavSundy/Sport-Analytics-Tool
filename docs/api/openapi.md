# OpenAPI specification

The Sport Analytics handwritten backend API is described by a version-controlled OpenAPI specification.

The source specification is:

```text
docs/api/openapi.yaml
```

[Open the raw OpenAPI specification](openapi.yaml)

## Validation

Validate the specification from the repository root with:

```bash
npm run openapi:lint
```

The normal project quality gate also includes OpenAPI validation through:

```bash
npm run check
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
