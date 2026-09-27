# Issue #648 — Coverage post-deployment ordering and stability

## Purpose

Record the evidence for moving repository coverage out of the blocking quality/deployment path and stabilising the hosted frontend coverage run.

## Baseline failure

A hosted repository coverage run failed in the frontend suite with timing-sensitive failures/timeouts in `BatchReviewWorkspacePage.test.tsx`, `SubmissionPage.test.tsx`, and `StatisticsPages.test.tsx`. The affected tests subsequently passed locally under V8 coverage, including 51/51 when the three affected files were run together.

## Implementation

- coverage waits for normal quality and deployment jobs;
- `quality` no longer consumes the coverage result;
- hosted coverage captures a real pass/fail exit code as late evidence instead of a deployment gate;
- failed/incomplete coverage cannot publish a new live badge;
- `--maxWorkers=2` and `--retry.count=1` were both tested and rejected because neither stabilised the frontend failures; the final implementation leaves `vitest run --coverage` unchanged and addresses the reliability risk through late, non-blocking CI orchestration;
- covered production-source changes route to the late coverage lane; and
- local change-aware CI runs strict coverage last when selected.

## Verification record

| Check                                  | Command / evidence                                                      | Result  |
| -------------------------------------- | ----------------------------------------------------------------------- | ------- |
| Coverage strategy regression           | `node --test tests/ci/coverage-strategy.test.mjs`                       | PENDING |
| Change routing regression              | `node --test tests/ci/change-plan.test.mjs`                             | PENDING |
| CI routing suite                       | `npm run test:ci-routing`                                               | PENDING |
| Patch whitespace                       | `git diff --check`                                                      | PENDING |
| Strict docs                            | `python -m mkdocs build --strict`                                       | PENDING |
| Hosted ordering                        | quality/deployment complete before coverage                             | PENDING |
| Hosted frontend coverage repeatability | repeated branch/main coverage runs                                      | PENDING |
| Coverage-failure proof                 | safe branch run shows failure does not gate quality/deployment or badge | PENDING |

## AI Declaration

Issue #648 CI/test design, implementation scaffold, regression tests, documentation and verification guidance were prepared with assistance from ChatGPT-Web[GPT-5.6 Sol]. Human review and hosted verification are required before closure.
