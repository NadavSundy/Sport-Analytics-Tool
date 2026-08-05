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
