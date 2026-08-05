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

## Review requirements

Before each milestone:

- review direct and transitive vulnerabilities;
- remove unused packages;
- document newly added third-party services and code;
- verify licences and attribution needs;
- record significant dependency decisions in an ADR; and
- retest the application after upgrades.

Exact installed versions will be recorded by `package-lock.json` after the first verified installation.
