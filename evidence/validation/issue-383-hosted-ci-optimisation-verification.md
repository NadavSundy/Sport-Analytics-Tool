# Issue #383 � Hosted CI optimisation verification

**Issue:** #383 � Optimise hosted CI with fail-fast preflight validation and eliminate duplicate checks  
**Implementation PR:** #387 � `perf(ci): eliminate duplicate hosted validation`  
**Date:** 3 September 2026  
**Author:** Shayna Unterslak

## Objective

Issue #383 aimed to reduce hosted CI latency and duplicated runner work while preserving the required Pull Request quality gate, change-aware validation, deployment safety and branch-protection behaviour.

The work was measured against actual hosted Gitea Actions runs rather than relying only on local timings.

## Initial serial-preflight experiment

The first implementation introduced a serial `preflight` job before validation, browser and database work.

Hosted timings were:

| Job                | Duration |
| ------------------ | -------: |
| plan               |      44s |
| preflight          |    2m17s |
| validation         |    4m08s |
| browser            |    6m16s |
| database           |    2m08s |
| quality            |       4s |
| overall hosted run |    9m34s |

Although moving static checks into preflight reduced the validation lane, the mandatory 2m17s preflight delayed every expensive lane.

The successful-run critical path therefore became longer. The design was rejected rather than retained simply because it satisfied the original implementation approach.

## Revised CI architecture

The workflow was revised using the hosted timing evidence.

The final Pull Request flow is:

```text
plan
 |
 +---- validation
 |       |- formatting
 |       |- hygiene
 |       |- contracts
 |       |- backend
 |       |- worker
 |       |- frontend
 |       |- PostgreSQL integration
 |       |- deployment regression tests
 |       |- OpenAPI
 |       `- documentation
 |
 `---- browser
         |- production frontend build
         |- cached Playwright Chromium
         `- browser/accessibility suite

validation + browser
        |
     quality
```

The final design:

- removes the serial `preflight` job;
- keeps cheap whitespace, routing and frozen-lockfile checks in `plan`;
- restores validation and browser parallelism;
- removes the standalone database job;
- folds PostgreSQL integration tests into the existing validation workspace;
- avoids another checkout, Node setup and dependency installation solely for database testing;
- preserves the asynchronous worker validation added on current `main`;
- caches the Playwright Chromium payload between compatible runner executions;
- preserves the stable required `quality` Pull Request status;
- preserves change-aware routing;
- keeps deployment gated on successful validated Pull Requests.

## Database consolidation

The previous standalone database job took approximately 2m08s, while the database-specific work was comparatively small.

After consolidation, the final hosted validation run executed:

```text
Run PostgreSQL database integration tests � 34s
```

inside the already-prepared validation workspace.

The database suite remained fully exercised; only duplicated job setup was removed.

The embedded PostgreSQL runner was also updated to support hosted root/container execution while retaining the existing local disposable PostgreSQL behaviour.

## Final Pull Request verification

The final hosted Pull Request run passed with:

| Job        | Duration |
| ---------- | -------: |
| plan       |    1m04s |
| validation |    7m50s |
| browser    |    7m31s |
| quality    |       3s |

Validation and browser ran in parallel.

The calculated critical path was approximately:

```text
1m04s plan
+ 7m50s longest parallel lane
+ 3s quality
= approximately 8m57s
```

This was lower than the rejected 9m34s serial-preflight design despite current `main` also containing additional worker validation.

The final workflow contained no separate `preflight` or `database` hosted job.

## Browser validation

The final browser lane passed all required browser and accessibility validation.

The first hosted run using the new Playwright cache was a cache miss:

| Browser step                         | Duration |
| ------------------------------------ | -------: |
| restore Chromium cache               |       1s |
| install Chromium system dependencies |      44s |
| install Chromium on cache miss       |    1m13s |
| browser/accessibility tests          |    3m04s |

The cache mechanism is therefore implemented, but this verification does not claim a warm-cache timing improvement because the measured final run populated rather than reused the Chromium cache.

## Local verification

Before hosted verification, change-aware local CI passed with:

- CI routing regression tests: 31/31 passed;
- contracts tests: 83 passed;
- backend unit tests: 132 passed;
- backend API tests: 120 passed;
- frontend unit tests: 115 passed;
- browser/accessibility tests: 36 passed;
- database integration tests: 86 passed across 13 files;
- deployment-helper tests: 19 passed;
- formatting, hygiene, architecture, OpenAPI and strict MkDocs validation passed;
- final result: `LOCAL CI: PASS`.

The routing regression suite explicitly verifies that:

- browser validation runs in parallel with normal validation after planning;
- database integration is folded into validation;
- there is no separate hosted database job;
- Playwright Chromium caching remains configured;
- cheap lockfile validation is owned by planning;
- `main` pushes preserve deployment routing without repeating the application suites.

## Post-merge main verification

The implementation Pull Request was merged into protected `main`.

Branch protection was configured to require the Pull Request quality status and to block merging an outdated Pull Request before the deployment-only main behaviour was relied upon.

The resulting `main` workflow demonstrated the intended architecture:

| Job             | Result   |        Duration observed |
| --------------- | -------- | -----------------------: |
| plan            | success  |                      49s |
| validation      | skipped  |                       0s |
| browser         | skipped  |                       1s |
| quality         | success  |                       5s |
| deploy_frontend | skipped  |                       0s |
| deploy_backend  | skipped  |                       1s |
| deploy_docs     | selected | see final deployment run |

The merge changed published documentation, so only the documentation deployment was selected.

Most importantly, the successful Pull Request application, browser and database validation suites were **not repeated after merge**.

The main workflow therefore changed from:

```text
Pull Request full CI
        +
main full CI again
        +
deployment
```

to:

```text
Pull Request authoritative full CI
        +
main change planning
        +
affected deployment and smoke verification
```

This removes the largest source of duplicate hosted validation from the normal merge lifecycle.

## Branch protection

The protected `main` branch requires:

- `Sport Analytics CI / quality (pull_request)`;
- Pull Requests to be up to date with the base branch before merge; and
- administrators to follow branch-protection rules.

This ensures that the commit entering `main` has passed the authoritative Pull Request validation against current `main` before the post-merge workflow skips duplicate application suites.

## Result

Issue #383 is verified.

The final implementation:

- preserves the required quality gate;
- preserves change-aware behaviour;
- removes the unsuccessful serial preflight design;
- removes the standalone database job;
- prevents duplicated static checks across hosted lanes;
- keeps browser and validation work parallel;
- keeps full application validation authoritative on Pull Requests;
- eliminates the second full validation run after merge;
- retains affected-component deployment and live smoke verification on `main`;
- adds regression coverage for the revised CI architecture.

The hosted measurements were used to revise the implementation rather than assuming that an architectural change was an optimisation.

## AI declaration

This verification record was prepared with assistance from ChatGPT-Web[GPT-5.6 Sol].

AI assistance was used to analyse hosted CI timings, compare alternative workflow structures, diagnose hosted runner behaviour, revise the CI architecture, prepare regression-test strategy and structure this evidence record. The changes and reported results were reviewed and verified against local and hosted executions by the student.
