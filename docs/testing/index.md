# Testing & Quality

This section groups the project's testing strategy, automated checks, coverage, performance evidence,
formal user testing and defect workflow. The detailed evidence itself remains under `evidence/` and is
linked through [Project Process & Evidence](../process/index.md).

## What do you need to verify?

| Question                                             | Start here                                                                          |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------- |
| What test suites exist and how do I run them?        | [Automated testing strategy](../development/testing.md)                             |
| What does CI require before merge/deployment?        | [CI/CD & quality gates](../development/ci-cd.md)                                    |
| How is repository-wide coverage calculated?          | [Code coverage](code-coverage.md)                                                   |
| How is performance measured?                         | [Representative-scale performance baseline](../development/performance-baseline.md) |
| How is formal user testing run?                      | [User testing overview](user-testing-overview.md)                                   |
| What rules govern a user-testing session?            | [User testing protocol](user-testing-protocol.md)                                   |
| What tasks can participants be given?                | [User testing task bank](user-testing-task-bank.md)                                 |
| What proves Intermediate ingestion works end to end? | [Intermediate ingestion acceptance](intermediate-ingestion-acceptance.md)           |
| How are defects reported and tracked?                | [Bug tracking](bug-tracking.md)                                                     |
| Where are retained validation records?               | [Testing & validation evidence](../process/validation-and-user-testing.md)          |

## Fast local checks

The root package scripts remain authoritative. Common entry points are:

```bash
npm run hygiene
npm run check
npm run test
npm run test:coverage
```

Database, browser, deployment and feature-specific commands are documented in the
[automated testing strategy](../development/testing.md) rather than repeated here.

## User testing vs automated testing

Automated checks establish repeatable technical behaviour. Formal user testing evaluates whether
representative users can understand and complete product journeys. They are complementary evidence
streams and should not be collapsed into one result.

Use [User Testing Overview](user-testing-overview.md) for the process and
[Testing & Validation Evidence](../process/validation-and-user-testing.md) for retained evidence and
traceability.

## Performance and deployment acceptance

Local response-time measurements belong in the
[performance baseline](../development/performance-baseline.md). Hosted capacity, recovery and
production-scale deployment acceptance belong under [Deployment & Operations](../deployment/overview.md)
and its linked acceptance/recovery pages.

## AI Declaration

The testing/quality documentation hub and evidence separation were planned and drafted with the
assistance of ChatGPT-Web[GPT-5.6 Sol].
