# Repository-wide Code Coverage

Issue #578 establishes one reproducible coverage workflow for the first-party application code that is
owned by the frontend, backend, asynchronous worker, shared contracts, and shared batch-processing
workspaces.

## Authoritative command

Run coverage from the repository root:

```bash
npm run test:coverage
```

The root command runs the five coverage-producing workspaces separately and then aggregates their
machine-readable counters. The required workspaces are:

- `apps/frontend`;
- `apps/backend`;
- `apps/worker`;
- `packages/contracts`; and
- `packages/batch-processing`.

`packages/object-storage` is not part of the Issue #578 repository-wide coverage scope.

## What counts as coverable production code

Each workspace uses Vitest's V8 provider with an explicit `coverage.include` over its `src/**` tree.
This is deliberate: production source that no test imports is still included and therefore contributes
zero covered counters rather than disappearing from the report.

Coverage excludes test/spec files, test directories, fixtures/mocks, generated source, TypeScript
declaration files, build output, dependencies, and coverage output. The batch-processing package has
no direct test suite at present; its coverage command uses `passWithNoTests` so its production source
still appears as uncovered rather than being omitted from the repository total.

## Reports

Each workspace writes to its own directory under `coverage/` and emits:

- terminal text;
- HTML;
- LCOV;
- JSON (`coverage-final.json`); and
- JSON summary (`coverage-summary.json`).

The root aggregator writes `coverage/combined/coverage-summary.json`, `summary.txt`, `index.html`, and
`lcov.info`. The combined LCOV qualifies source paths with their workspace directory so files with the
same relative name in different workspaces do not collide.

## Correct aggregation

Repository percentages are calculated from summed covered and coverable counters. Workspace
percentages are never averaged. For example, a 1/1 workspace and a 1/9 workspace produce 2/10 = 20%
repository line coverage, not `(100% + 11.11%) / 2 = 55.55%`.

The same covered/total calculation is applied independently to lines, statements, functions, and
branches.

## Threshold policy

Issue #578 centralises optional repository thresholds without inventing a Sprint 3 target that has not
been specified by the course rubric. The following environment variables are supported:

```text
COVERAGE_THRESHOLD_LINES
COVERAGE_THRESHOLD_STATEMENTS
COVERAGE_THRESHOLD_FUNCTIONS
COVERAGE_THRESHOLD_BRANCHES
```

When a variable is unset, that metric is informational and does not fail the command. When a value is
configured, `npm run test:coverage` exits non-zero if the combined repository percentage is below the
configured minimum. Repository variables of the same names can be configured in Gitea once the team
receives or adopts an approved threshold.

## CI routing and artifacts

Coverage has a dedicated late-stage Gitea Actions job. It is intentionally separated from the
blocking `quality` gate and from deployment ownership.

The coverage lane runs when:

- production source changes in a covered workspace;
- coverage infrastructure/configuration changes in a Pull Request;
- a deliberate `workflow_dispatch` full validation is requested; or
- a change reaches `main`, so the merged commit receives a repository-wide coverage record.

Hosted ordering is: normal validation/browser work -> `quality` -> routed deployment jobs -> coverage.
The coverage job waits for the deployment jobs to resolve, but its result is not a prerequisite for any
of them.

`npm run test:coverage` remains strict. In hosted CI the workflow captures its real exit code and records
`PASS` or `FAILED / INCOMPLETE` evidence without turning a coverage-only failure into a deployment gate.
The complete `coverage/` tree is still uploaded as an artifact. Badge publication occurs only after a
complete successful coverage run, so failed/partial runs retain the previous valid badge.

The frontend coverage script remains `vitest run --coverage`. Coverage-specific retries and worker limits were investigated and rejected because they would mask failures rather than improve the validity of the coverage result. The separate local frontend-test failures encountered during investigation were traced to stale shared-contract build output and addressed independently in #656. Ordinary frontend tests remain blocking in normal quality validation, while the late coverage job reports incomplete coverage without blocking deployment.

## Verification

The coverage strategy regression tests verify workspace scope, explicit untested-source inclusion,
reporter configuration, counter-based aggregation, missing-report failure, optional threshold
behaviour, CI routing, artifact publication, and quality-gate integration:

```bash
npm run test:ci-routing
```

A full implementation check should also run:

```bash
npm run test:coverage
npm run check
npm run hygiene
python -m mkdocs build --strict
git diff --check
```

## AI Declaration

The Issue #578 coverage architecture, aggregation logic, CI integration, regression-test design and
this documentation were produced with the assistance of ChatGPT-Web[GPT-5.6 Sol]. The student must
review the implementation and record the locally observed baseline and verification results before
closing the issue.
