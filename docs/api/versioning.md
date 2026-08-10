# API versioning and deprecation

## Current API version

The Sport Analytics API uses major-version URL prefixes.

The initial API base path is:

```text
/api/v1
```

All initial handwritten application endpoints are published beneath this path.

The OpenAPI `info.version` value may identify revisions to the published contract, while the URL major version represents compatibility for API consumers.

## Compatible changes

Backward-compatible additions may remain within the current major API version.

Examples include:

- adding a new optional response field;
- adding a new optional query parameter;
- adding a new endpoint;
- adding a new documented error case without changing successful response meaning.

Compatible changes must still update the OpenAPI specification and relevant API documentation.

## Breaking changes

A change is considered breaking when an existing compliant consumer may need to change its code to continue working.

Examples include:

- removing or renaming a field;
- changing a field type;
- changing the meaning of an existing field;
- removing an endpoint;
- changing an existing optional field to required;
- changing pagination or identifier semantics incompatibly.

Breaking changes must not silently replace an active contract.

A future incompatible API will use a new major version, for example:

```text
/api/v2
```

## Deprecation process

Before an implemented endpoint, field or API major version is retired:

1. A replacement or migration path must be identified.
2. The affected contract must be marked as deprecated in OpenAPI where supported.
3. Public API documentation must identify the deprecated behaviour.
4. Migration guidance must identify the replacement.
5. A target retirement date or project milestone must be recorded.
6. Consumers must be given a documented migration period.
7. Retirement must be reviewed through the normal issue and Pull Request process.
8. The deprecated contract may only be removed once its published retirement condition has been met.

Deprecation does not itself remove functionality.

## OpenAPI status

The OpenAPI baseline may describe both implemented and agreed planned operations.

The vendor extension:

```text
x-implementation-status
```

is used with the values:

```text
implemented
planned
```

This prevents planned contracts from being mistaken for currently deployed functionality.

Once an operation is implemented and verified, its OpenAPI status must be updated in the same feature Pull Request.

## Contract ownership

The version-controlled OpenAPI document is:

```text
docs/api/openapi.yaml
```

Changes to API paths, request contracts, response contracts, authentication requirements, filtering, sorting, pagination or errors must update the OpenAPI specification in the same Pull Request.

The OpenAPI description documents the handwritten Express API. It is not generated from Supabase, PostgREST or another database API generator.

## AI Declaration

The preceding document was planned, generated, reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
