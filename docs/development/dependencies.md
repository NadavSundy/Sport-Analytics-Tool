# Dependencies

## Selection principles

A dependency must have a clear project purpose, an acceptable licence, active maintenance, security support, and a cost lower than implementing and maintaining the capability safely yourselves.

## Initial dependencies

| Area             | Dependency                         | Purpose                                           |
| ---------------- | ---------------------------------- | ------------------------------------------------- |
| Frontend         | React                              | Component-based web user interface                |
| Frontend tooling | Vite                               | Development server and production build           |
| Backend          | Express                            | Hand-written HTTP routing and middleware          |
| Validation       | Zod                                | Runtime validation and TypeScript type derivation |
| HTTP security    | Helmet                             | Secure response-header defaults                   |
| Logging          | Pino HTTP                          | Structured request logging foundation             |
| Testing          | Vitest, Testing Library, Supertest | Component, unit, and API integration tests        |
| Documentation    | MkDocs Material                    | Public static documentation website               |
| Authentication   | Firebase Admin SDK                 | Validate Firebase ID tokens in the backend        |
| Configuration    | dotenv                             | Load ignored local backend environment files      |

## Review requirements

Before each milestone:

- review direct and transitive vulnerabilities;
- remove unused packages;
- document newly added third-party services and code;
- verify licences and attribution needs;
- record significant dependency decisions in an ADR; and
- retest the application after upgrades.

Exact installed versions are recorded in the committed `package-lock.json`. Use `npm ci` rather than `npm install` when validating a clean checkout or running CI.

## Authentication dependency review

The current Firebase Admin dependency includes six moderate transitive `uuid` audit findings through Google Cloud dependencies. The affected buffer-based UUID methods are not called directly by the authentication implementation.

The project uses the latest compatible Firebase Admin release. A forced audit fix would downgrade Firebase Admin to an incompatible major version and must not be used. The team must monitor upstream releases and rerun `npm audit --omit=dev` during dependency reviews.

## TypeScript compatibility

TypeScript is pinned to version `5.5.4` because the current `@typescript-eslint` version supports TypeScript versions below `5.6.0`. TypeScript and `@typescript-eslint` should be reviewed and upgraded together.
