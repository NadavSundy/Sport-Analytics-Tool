# OpenAPI contract testing

The handwritten backend API is checked against its published contract, `docs/api/openapi.yaml`, by
automated contract tests. The specification is the single source of truth: the tests read it as-is
and never generate, copy or maintain a second contract.

## What the tests prove

For every exchange a contract test makes, the checker requires that:

- the request method and path match exactly one documented operation;
- the response status is documented for that operation (exactly, as a `4XX`/`5XX` range, or as
  `default`);
- the response content type is one the documented response lists, and a response documented without
  content has no body;
- a JSON response body satisfies the documented schema;
- every documented `required` response header is present, and every documented header that is
  present satisfies its schema;
- the request's path, query and header parameters, and any JSON request body the test supplies,
  satisfy the documented parameters and request body. A test that deliberately sends an invalid
  request must say so, and the checker then requires the request to be invalid, so an error response
  is only accepted for the reason the test claims.

In addition, a route inventory test builds the application and requires every implemented route to
be a documented operation, and every documented operation to be implemented. There is no allowlist.

Schemas are validated with Ajv's JSON Schema 2020-12 validator, the dialect OpenAPI 3.1 uses, and
Ajv resolves every `$ref` against the loaded document.

## What the tests do not prove

- **Behaviour and data correctness.** Services are stubbed. A response can match its schema and still
  contain the wrong figures; correctness is covered by unit, API and database tests.
- **Every operation and every response.** Representative public, consumer (API key) and
  authenticated operations are covered, together with the responses, headers and operations corrected
  in issue #609. An operation's untested responses are only checked by the route inventory and
  Redocly lint.
- **Production parity.** The tests run the real routing, authentication, validation and
  serialisation in-process with test identities, not against a deployed environment.
- **Keywords with no validation meaning.** `discriminator`, `readOnly`, `writeOnly`, `example` and
  `deprecated` are annotations and are not enforced by schema validation.
- **Behaviour the contract does not describe.** Known differences awaiting a team decision are not
  covered, so these tests neither prove nor disprove them:
  - the fixture event exports' documented 100-item maximum against the 5,000-event implementation
    limit;
  - direct submission and upload access, documented for submitters but implemented for
    administrators;
  - payload-too-large messages that state a 1 MB limit on 16 KB routes;
  - undocumented `500` server errors, the undeclared `API-Version` response header, and JSON body
    parsing before authentication;
  - administrator API key routes accepting the identifier `0`, which the documented identifier
    pattern forbids.

## Deliberate mismatches

The checker has its own tests (`apps/backend/tests/contract/openapi-contract.test.ts`). Each creates a
real mismatch and passes only when the checker rejects it with a readable message:

1. a response body missing a documented required property;
2. a response with a status the operation does not document;
3. a changed in-memory copy of the specification that requires a field the API does not send.

A failure names the exchange and every problem, for example:

```text
OpenAPI contract violation for GET /api/v1/competitions → 200:
  - response body /data/0 must have required property 'name'
Contract: docs/api/openapi.yaml
```

## Deprecation metadata

Where deprecation metadata exists today it is checked: the deprecated `approvalState` field must still
be returned by `GET /api/v1/auth/me` while the contract marks it deprecated, and any operation marked
`deprecated` must describe its replacement. The deprecation lifecycle itself is defined in
[Versioning and Deprecation](versioning.md).

## Running the tests

```bash
npm run test:api-contract
```

The tests need the shared packages to be built; `npm run prepare:contracts
--workspace=@sport-analytics/backend` builds them. The tests are also part of `npm test`.

## Continuous integration

The change planner sets an `apiContract` flag for changes to `docs/api/openapi.yaml` and the Redocly
configuration, so a specification-only change is still checked against the implementation, and for
every change that routes to the backend lane. The validation job then runs the dedicated step
"Verify the API implementation against the OpenAPI contract". `npm run ci:local` mirrors it.

## Adding a contract test

Call the application with supertest, then pass the response to the checker:

```ts
const response = await request(app).get('/api/v1/competitions?limit=5').expect(200);
contract.expectResponse(response);
```

Supply `requestBody` when the test sends a JSON body, and `requestIsInvalid: true` when it
deliberately sends a request the contract does not allow. When a test fails, correct the
specification only if the implementation is right; otherwise the implementation or the test is wrong.

## AI Declaration

The preceding document was generated with the assistance of Claude-Code[Claude Opus 5].
