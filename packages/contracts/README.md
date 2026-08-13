# Shared contracts

This package is the compile-time and runtime-validation boundary shared by the frontend, backend, tests and API documentation tooling.

It is **not** a deployable middle application and must not contain business logic, database access, secrets or authentication decisions. Place only stable request/response schemas, event schemas, identifiers, enums and generated-independent types here.

The backend remains authoritative. Every external request must still be validated and authorised by the backend even when the frontend already validated it.

## Prerequisites and install

Use the repository-level Node.js/npm requirements and install from the repository root:

```bash
npm ci
```

The package uses Zod for runtime schemas and TypeScript type derivation.

## Build

```bash
npm run build --workspace=@sport-analytics/contracts
```

The build writes JavaScript and declaration output to this package's `dist/` directory. Generated build output must not be committed.

The frontend and backend import this workspace package, so an isolated backend/frontend type-check may require contracts to be built first. The root `npm run check` handles this ordering automatically.

## Lint, type-check and test

```bash
npm run lint --workspace=@sport-analytics/contracts
npm run typecheck --workspace=@sport-analytics/contracts
npm run test:contracts
```

## Package boundary rules

Allowed here:

- Zod request/response schemas;
- stable API identifiers and enums;
- event schemas;
- shared TypeScript types derived from schemas.

Not allowed here:

- database queries or repositories;
- application services or business rules;
- secrets/environment configuration;
- authentication/authorisation decisions;
- UI components;
- Express routes.

See `docs/api/contracts.md` and `docs/development/technology-stack.md` for the wider architecture and dependency rationale.

## AI Declaration

The preceding document was reviewed and expanded with the assistance of ChatGPT-Web[GPT-5.6 Sol].
