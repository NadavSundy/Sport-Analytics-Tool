# Issue #578 — Repository-wide Code Coverage

**Date:** 2026-09-16
**Status:** VERIFIED LOCALLY — repository coverage baseline and enforcement validated
**Issue:** #578

## Purpose

Provide one accurate, reproducible and CI-enforced coverage workflow for the five Issue #578
workspaces without relying on an external coverage service. Untested production source must count as
uncovered, repository percentages must be calculated from real covered/coverable counters, and Gitea
CI must retain useful per-workspace and combined reports.

## Covered workspaces

The repository-wide command covers:

1. `apps/frontend`;
2. `apps/backend`;
3. `apps/worker`;
4. `packages/contracts`; and
5. `packages/batch-processing`.

Each workspace uses Vitest 4 with the V8 provider, an explicit production `src/**` include, exclusions
for tests/specs, test directories, fixtures/mocks, generated source and declarations, and the same
`text`, `html`, `lcov`, `json`, and `json-summary` reporters.

## Authoritative command and outputs

```text
npm run test:coverage
```

The root runner clears stale coverage output, executes the five workspace coverage commands, validates
that every required workspace emitted HTML/LCOV/JSON/JSON-summary artifacts, and then writes:

```text
coverage/frontend/
coverage/backend/
coverage/worker/
coverage/contracts/
coverage/batch-processing/
coverage/combined/coverage-summary.json
coverage/combined/summary.txt
coverage/combined/index.html
coverage/combined/lcov.info
```

## Accurate repository aggregation

The aggregator sums `covered`, `total`, and `skipped` counters for lines, statements, functions and
branches. Percentages are calculated only after those counters are summed. It therefore does not give a
small workspace the same weight as a large workspace by averaging percentages.

The regression test uses the deliberately uneven example 1/1 plus 1/9 and requires the combined result
to be 2/10 = 20%, not 55.55%.

Combined LCOV paths are qualified with each workspace directory so same-named relative source files do
not collide.

## Untested production source

Coverage configuration uses explicit `coverage.include` globs over production `src/**`. This makes
source files that no test imports visible as zero-coverage files instead of silently disappearing from
the denominator.

`packages/batch-processing` currently has no direct Vitest test suite. Its coverage command uses
`passWithNoTests` while retaining the explicit source include, so its production source remains part of
the repository baseline.

## Threshold policy

The aggregator supports central repository thresholds through:

```text
COVERAGE_THRESHOLD_LINES
COVERAGE_THRESHOLD_STATEMENTS
COVERAGE_THRESHOLD_FUNCTIONS
COVERAGE_THRESHOLD_BRANCHES
```

No final percentage is set in this change because the supplied Sprint 3 requirements do not specify a
numeric target. Unset metrics remain informational. Once an approved target is available, the matching
Gitea repository variables can be configured without changing the aggregation code. A configured
below-threshold result exits non-zero.

## Gitea CI integration

Coverage has its own job rather than being appended to the ordinary validation job, avoiding a second
coverage execution inside that lane. Change-aware routing requests coverage for coverage-infrastructure
Pull Requests, manual full validation, and every main push/merge. The job uploads the full
`coverage/` directory with `actions/upload-artifact@v4`, and the existing `quality` job requires the
coverage result whenever the plan marks coverage as required.

Local change-aware CI invokes the same root command when coverage is selected.

## Regression coverage

`tests/ci/coverage-strategy.test.mjs` verifies:

- the exact five-workspace scope;
- explicit untested-source inclusion and exclusions;
- required reporters and separate output directories;
- counter-based aggregation rather than percentage averaging;
- missing-report failure;
- optional threshold parsing/pass/fail behaviour; and
- dedicated CI routing, artifact upload and quality-gate wiring.

## Verification record
## Verification record

The following results were observed during local verification on 2026-09-16:

| Gate | Command | Result |
| --- | --- | --- |
| Coverage strategy regression | `node --test tests/ci/coverage-strategy.test.mjs` | PASS |
| Change-aware CI routing | `npm run test:ci-routing` | PASS |
| Repository coverage baseline | `npm run test:coverage` | PASS — lines 5466/8566 (63.81%); statements 5628/8999 (62.54%); functions 1385/2013 (68.80%); branches 3790/6627 (57.19%) |
| Below-threshold proof | temporary `COVERAGE_THRESHOLD_LINES=63.82` | PASS — command correctly rejected 63.81% line coverage and exited non-zero |
| Passing-threshold proof | temporary `COVERAGE_THRESHOLD_LINES=63.80` | PASS — command accepted 63.81% line coverage and exited zero |
| Repository quality | `npm run check` | PASS |
| Monorepo hygiene | `npm run hygiene` | PASS |
| Strict documentation | `python -m mkdocs build --strict` | PASS |
| Patch whitespace | `git diff --check` | PASS |
| Change-aware local CI | `npm run ci:local` | PASS |

The temporary 63.80% and 63.82% line-threshold values were used only to prove pass/fail enforcement.
They are not the Sprint 3 policy threshold; no repository policy threshold is configured by this change.
## AI Declaration

The coverage architecture, implementation scaffold, CI routing, aggregation/regression-test design,
documentation and this evidence record were produced with the assistance of
ChatGPT-Web[GPT-5.6 Sol]. The student must review the generated work and replace the pending entries
above with locally observed results before merge/closure.
