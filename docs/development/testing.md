# Testing strategy

## Test layers

| Layer           | Location                          | Purpose                                                                |
| --------------- | --------------------------------- | ---------------------------------------------------------------------- |
| Unit            | Near frontend/backend modules     | Verify isolated rules and components                                   |
| API integration | `apps/backend/tests`              | Verify routes, validation, errors, and persistence boundaries          |
| UI component    | `apps/frontend/src/**/*.test.tsx` | Verify user-visible behaviour and accessibility semantics              |
| End-to-end      | `tests/e2e`                       | Verify critical user journeys against deployed-like services           |
| Accessibility   | `tests/accessibility`             | Automate and record accessibility checks                               |
| Performance     | `tests/performance`               | Verify stated API response-time and load targets                       |
| User testing    | `evidence/user-testing`           | Record formal tasks, participants, observations, and evaluated changes |

## Required practice

- Add meaningful tests for every behavioural change.
- Test success, validation failure, unauthorised/forbidden access, conflict, not-found, dependency failure, and retry/idempotency behaviour where relevant.
- Compare derived statistics against independently prepared reference results.
- Use deterministic fixtures and isolate tests from production data.
- Do not rely only on generated/default tests.
- Record known gaps as Gitea issues with risk and planned resolution.

## Current scaffold tests

The scaffold contains:

- a backend health-endpoint integration test; and
- a frontend rendering/API-state component test.

These prove the test runners are wired, not that the product is adequately tested.

## Local CI verification

Before opening or updating a Pull Request, validate the repository from a reproducible installation:

```bash
npm ci
npm run check
```

## CI expectation

Pull Requests should fail when formatting, linting, type checking, tests, structure validation, or builds fail. Deployment jobs should run only from reviewed branches/tags and should use environment-specific secrets.


# Automated Testing

The project uses a layered automated testing strategy covering utility and
domain logic, frontend components, backend HTTP endpoints, shared API
contracts, database integration and browser-level workflows.

## Testing layers

| Layer | Location | Tool | Purpose |
|---|---|---|---|
| Unit | `apps/backend/tests/unit/` | Vitest | Test statistic calculations, utilities and safety rules in isolation |
| Frontend component | `apps/frontend/src/**/*.test.tsx` | Vitest and React Testing Library | Test accessible component behaviour from the user's perspective |
| Backend API | `apps/backend/tests/api/` and existing backend test files | Vitest and Supertest | Test handwritten HTTP endpoints and middleware |
| Database integration | `apps/backend/tests/database/` | Vitest and PostgreSQL | Test migrations, queries, transactions and rollback behaviour |
| Shared contracts | `packages/contracts/src/tests/` | Vitest and Zod | Confirm API payloads conform to shared schemas |
| End-to-end | `tests/e2e/` | Playwright | Test browser-level user journeys |
| Accessibility | Component tests and `tests/e2e/` | Testing Library and Axe | Detect automated accessibility violations |

Feature-specific tests remain part of their corresponding implementation issues.
Issue #72 establishes the common test infrastructure and approved testing
patterns.

## Root commands

Run commands from the repository root:

```bash
npm test
npm run test:unit
npm run test:frontend
npm run test:api
npm run test:contracts
npm run test:database
npm run test:e2e
npm run test:coverage
npm run test:ci
npm run check
```