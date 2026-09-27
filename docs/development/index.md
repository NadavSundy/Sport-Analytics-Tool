# Development

This section is for contributors changing code, configuration, tests or documentation. Start with
[Getting Started](../getting-started.md) if the repository is not running locally yet.

## Normal contribution path

1. Confirm the work is represented by a Gitea issue.
2. Update from `main` and create a short-lived issue branch using the
   [Git methodology](../git-methodology.md).
3. Use the component README closest to the code you are changing.
4. Run the relevant tests locally and keep the [CI/CD rules](ci-cd.md) in mind.
5. Update documentation and evidence where the change affects public behaviour, architecture,
   testing or project claims.
6. Open a Pull Request for review rather than developing directly on `main`.

## Contributor map

| Need                                | Page                                                            |
| ----------------------------------- | --------------------------------------------------------------- |
| Clean local setup                   | [Local setup](setup.md)                                         |
| Repository/component boundaries     | [Repository structure](../architecture/repository-structure.md) |
| Technology and dependency rationale | [Technology stack](technology-stack.md)                         |
| Environment configuration           | [Environment variables](../environment.md)                      |
| Dependency policy                   | [Dependencies](dependencies.md)                                 |
| Reference cricket fixtures          | [Reference fixtures](reference-fixtures.md)                     |
| Git/branch/commit/PR workflow       | [Git methodology](../git-methodology.md)                        |
| Hosted CI/CD and quality gates      | [CI/CD & quality gates](ci-cd.md)                               |
| Local reproduction of CI            | [Local CI](local-ci.md)                                         |
| Gitea issue export tooling          | [Gitea issue export](gitea-issue-export.md)                     |
| Automated and database testing      | [Testing & Quality](../testing/index.md)                        |

## Design & UX references

Design material remains available to contributors but is grouped here rather than competing with
architecture/API/database documentation at the top level:

- [Brand guidelines](../design/brand-guidelines.md)
- [Frontend component baseline](../design/frontend-component-baseline.md)
- [Information architecture and wireframes](../design/information-architecture-and-wireframes.md)

These pages document product presentation and interaction decisions. System component boundaries and
data flow belong under [Architecture & Data](../architecture-and-data.md).

## Component guides

Use the [Getting Started component-guide index](../getting-started.md#component-guides) to jump to the
frontend, backend, worker, database, contracts, test, infrastructure, script, documentation or
evidence README without duplicating those instructions here.

## AI Declaration

The contributor-oriented documentation hub and design/UX grouping were planned and drafted with the
assistance of ChatGPT-Web[GPT-5.6 Sol].
