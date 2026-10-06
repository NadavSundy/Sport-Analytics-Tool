# Getting started

Use this section when you are new to Stat'sTheGame or need to get a local checkout running. The
pages here deliberately stay focused on onboarding; deeper architecture, API, testing and deployment
material is linked from the relevant section hubs.

## First visit

Follow this order for the shortest reliable path into the project:

1. Read the [repository structure](architecture/repository-structure.md) to understand the monorepo
   boundaries.
2. Follow [Local setup](development/setup.md) for a clean install and local runtime.
3. Use [Technology stack](development/technology-stack.md) when you need to know why a dependency or
   service was selected.
4. Use [Environment variables](environment.md) before configuring frontend, backend or worker
   settings.
5. Open the component guide for the part of the system you are changing.

## Component guides

The component READMEs are the closest guide to each repository area. They remain in the repository
rather than being duplicated into MkDocs.

| Component           | Guide                                                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend            | [apps/frontend/README.md](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/apps/frontend/README.md)           |
| Backend API         | [apps/backend/README.md](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/apps/backend/README.md)             |
| Asynchronous worker | [apps/worker/README.md](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/apps/worker/README.md)               |
| Database            | [database/README.md](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/database/README.md)                     |
| Shared contracts    | [packages/contracts/README.md](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/packages/contracts/README.md) |
| Documentation       | [docs/README.md](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/docs/README.md)                             |
| Testing             | [tests/README.md](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/tests/README.md)                           |
| Infrastructure      | [infra/README.md](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/infra/README.md)                           |
| Repository scripts  | [scripts/README.md](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/scripts/README.md)                       |
| Project evidence    | [evidence/README.md](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/README.md)                     |

## Where to go next

- To use or inspect the public API, continue to [Product & API](product-and-api.md).
- To understand event derivation, persistence and security boundaries, continue to
  [Architecture & Data](architecture-and-data.md).
- To contribute code or documentation, continue to [Development](development/index.md).
- To understand hosted environments, continue to [Deployment & Operations](deployment/overview.md).
- To review quality gates, coverage, performance or user testing, continue to
  [Testing & Quality](testing/index.md).
- To inspect Sprint, stakeholder, decision and AI-use evidence, continue to
  [Project Records & Evidence](process/index.md).

## AI Declaration

The information-architecture and onboarding consolidation on this page was planned and drafted with
the assistance of ChatGPT-Web[GPT-5.6 Sol].
