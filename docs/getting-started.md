# Getting started

Use this section when you are new to Stat'sTheGame or need to get a local checkout running. The
pages here deliberately stay focused on onboarding; deeper architecture, API, testing and deployment
material is linked from the relevant section hubs.

## First visit

Follow this order for the shortest reliable path into the project:

1. Read the [repository structure](architecture/repository-structure.md) to understand the monorepo
   boundaries between the frontend, backend, worker and shared packages.
2. Follow [Local setup](development/setup.md) for a clean install and local runtime.
3. Use [Technology stack](development/technology-stack.md) when you need to know why a dependency or
   service was selected.
4. Use [Environment variables](environment.md) before configuring frontend, backend or worker
   settings.
5. Open the component guide for the part of the system you are changing.

## Component guides

The component READMEs are the closest guide to each repository area. They remain in the repository
rather than being duplicated into MkDocs.

| Component               | Guide                                                                                                                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend                | [apps/frontend/README.md](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/apps/frontend/README.md){ target="_blank" rel="noopener" }                         |
| Backend API             | [apps/backend/README.md](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/apps/backend/README.md){ target="_blank" rel="noopener" }                           |
| Asynchronous worker     | [apps/worker/README.md](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/apps/worker/README.md){ target="_blank" rel="noopener" }                             |
| Database                | [database/README.md](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/database/README.md){ target="_blank" rel="noopener" }                                   |
| Shared contracts        | [packages/contracts/README.md](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/packages/contracts/README.md){ target="_blank" rel="noopener" }               |
| Shared batch processing | [packages/batch-processing/README.md](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/packages/batch-processing/README.md){ target="_blank" rel="noopener" } |
| Shared object storage   | [packages/object-storage/README.md](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/packages/object-storage/README.md){ target="_blank" rel="noopener" }     |
| Documentation           | [docs/README.md](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/docs/README.md){ target="_blank" rel="noopener" }                                           |
| Testing                 | [tests/README.md](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/tests/README.md){ target="_blank" rel="noopener" }                                         |
| Infrastructure          | [infra/README.md](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/infra/README.md){ target="_blank" rel="noopener" }                                         |
| Repository scripts      | [scripts/README.md](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/scripts/README.md){ target="_blank" rel="noopener" }                                     |
| Project evidence        | [evidence/README.md](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/README.md){ target="_blank" rel="noopener" }                                   |

## Where to go next

- To use or inspect the public API, continue to [Product & API](product-and-api.md).
- To understand event derivation, persistence and security boundaries, continue to
  [Architecture, Data & Security](architecture-and-data.md).
- To contribute code or documentation, follow the [Local setup](development/setup.md) quality gate
  and the [Methodology](process/methodology-overview.md) branch and Pull Request workflow.
- To understand hosted environments and CI/CD, continue to
  [Deployment & CI/CD](deployment/overview.md).
- To review quality gates, coverage, performance or user testing, continue to
  [Testing & Quality](testing/index.md).
- To inspect Sprint, stakeholder, decision and AI-use evidence, continue to
  [Project Records & Evidence](process/index.md).

## AI Declaration

The information-architecture and onboarding consolidation on this page was planned and drafted with
the assistance of ChatGPT-Web[GPT-5.6 Sol].
The Issue #879 review added the shared-package guides and aligned the section links with the live
navigation with the assistance of Claude-Web[Claude Opus 5.5].
