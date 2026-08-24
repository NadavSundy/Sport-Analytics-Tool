# Repository testing

The `tests/` directory contains cross-application and browser-level testing assets that do not belong inside one application workspace. Workspace-local unit, API and PostgreSQL integration tests remain beside the application they exercise.

## Testing areas

| Area                       | Location                                                 | Main command                                             | Purpose                                                                                                    |
| -------------------------- | -------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Complete backend suite     | `apps/backend/tests/`                                    | `npm run test:backend` or `npm run test:backend:local`   | Run backend unit, API, and database tests with the default or Docker PostgreSQL workflow.                  |
| Backend unit tests         | `apps/backend/tests/unit/`                               | `npm run test:unit`                                      | Verify backend services, derivation logic and helpers in isolation.                                        |
| Backend API tests          | `apps/backend/tests/api/` plus backend auth/health tests | `npm run test:api`                                       | Exercise handwritten HTTP API behaviour.                                                                   |
| Frontend tests             | `apps/frontend/src/**/*.test.tsx`                        | `npm run test:frontend`                                  | Verify React behaviour with Vitest, jsdom and Testing Library.                                             |
| Shared-contract tests      | `packages/contracts/`                                    | `npm run test:contracts`                                 | Verify shared Zod/API contract behaviour.                                                                  |
| Database integration tests | `apps/backend/tests/database/`                           | `npm run test:database` or `npm run test:database:local` | Exercise migrations, repositories and transactions against real PostgreSQL.                                |
| Deployment helper tests    | `tests/deployment/`                                      | `npm run test:deployment`                                | Verify deployment smoke-check/helper behaviour.                                                            |
| End-to-end tests           | `tests/e2e/`                                             | `npm run test:e2e`                                       | Exercise important user journeys in a real browser.                                                        |
| Accessibility tests        | `tests/e2e/` and `tests/accessibility/`                  | `npm run test:e2e`                                       | Combine browser interaction with automated Axe checks and manual evidence guidance.                        |
| Performance tests          | `tests/performance/`                                     | No single committed load-test command yet                | Store targets, datasets, procedures and results for performance work.                                      |
| Coverage                   | configured workspace suites                              | `npm run test:coverage`                                  | Generate configured coverage reports; the current root command runs coverage where a workspace exposes it. |

## Normal repository gate

From the repository root:

```bash
npm ci
npm run check
```

`npm run check` is the normal database-independent pre-Pull-Request quality gate. It includes structure, formatting, linting, contract build, type-checking, the normal unit/frontend/API/contract/deployment-helper suites, OpenAPI linting and production builds.

PostgreSQL integration tests and browser end-to-end tests are run explicitly rather than being hidden inside the normal local gate.

Run every backend test with the default disposable PostgreSQL runtime:

```bash
npm run test:backend
```

Use `npm run test:backend:local` for the equivalent complete backend workflow with Docker. The
backend workspace's plain `test` command builds the shared contracts, then runs only unit and API
tests; it does not discover database tests implicitly.

## PostgreSQL integration tests

The standard database test command provisions a disposable PostgreSQL 16 runtime automatically:

```bash
npm run test:database
```

Alternatively, use the repository-managed Docker Compose workflow:

```bash
npm run test:database:local
```

The Docker workflow uses an isolated test database on `127.0.0.1:55432`, resets and migrates it, loads deterministic test data and runs the database integration suite. It must never be redirected to the normal development or production database.

See the [Testing policy and database safety guide](../docs/development/testing.md) for the complete testing policy and database safety rules.

## Browser tests

Playwright requires its managed Chromium browser before the local end-to-end suite can run. On a
fresh development environment, or after a Playwright upgrade, install Chromium before the first
browser-test run:

```bash
npx playwright install chromium
npm run test:e2e
```

On Windows PowerShell, if script execution blocks `npx` or `npm`, use:

```powershell
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

CI installs Chromium and its Linux dependencies with:

```bash
npx playwright install --with-deps chromium
```

See:

- [End-to-end testing guide](e2e/README.md) for end-to-end scope;
- [Accessibility testing guide](accessibility/README.md) for accessibility evidence expectations; and
- [Performance testing guide](performance/README.md) for performance-testing guidance.

Install the configured Chromium browser when required:

```bash
npx playwright install chromium
npm run test:e2e
```

See:

- [End-to-end testing guide](e2e/README.md) for end-to-end scope;
- [Accessibility testing guide](accessibility/README.md) for accessibility evidence expectations; and
- [Performance testing guide](performance/README.md) for performance-testing guidance.

## Test evidence

Do not claim a suite passed unless it was actually run. Sanitized command-output summaries and verification records belong under `evidence/validation/`. User-testing evidence belongs under `evidence/user-testing/`.

## AI Declaration

The preceding document was planned, generated, reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
