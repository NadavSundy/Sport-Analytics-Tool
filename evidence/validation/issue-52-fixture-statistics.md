# Issue #52 fixture-statistics validation

## Implemented evidence

- Accepted-event repository query selects the latest accepted revision for every delivery natural
  key and orders results by innings ordinal and `innings_sequence`.
- Pure derivation covers team totals, batting, bowling, credited wickets, typed outcomes,
  deterministic replay and predictable partial-data warnings.
- Anonymous list and stable-detail API routes expose contributor records only when requested.
- Shared Zod contracts and the OpenAPI source describe the implemented response shapes.
- `docs/statistics/fixture-statistics.md` records every calculation and an example public response is
  included in `docs/api/public-read.md`.

## Golden fixture

The manually verified fixture in
`apps/backend/tests/unit/fixture-statistics.derivation.test.ts` includes:

- a four and six off the bat;
- a wide and no-ball;
- byes excluded from bowler runs;
- a run four marked `non_boundary`;
- a bowler-credited wicket;
- five innings-level penalty runs; and
- participants with both batting and bowling contributions.

The expected first-innings total is 23: 18 delivery runs plus 5 penalty runs. The main bowler's
expected line is 16 runs conceded, 4 legal balls, an economy rate of 24 and 1 wicket. Reversing the
input event array produces an identical complete API projection.

## Verification results

The following checks passed on 13 August 2026 using the repository's existing WSL dependencies:

```text
contracts build                         passed
backend typecheck                       passed
backend lint                            passed
contracts lint                          passed
backend unit tests                      18 passed
backend API tests                       27 passed
shared contract tests                   19 passed
OpenAPI lint                            valid
changed-file Prettier check             passed
```

The WSL runtime was Node.js 18 and emitted the existing Supabase/Redocly engine-version warning; no
test or validation failed because of it. The repository declares Node.js 20 or newer for deployed
and CI environments.

## Pull Request evidence

The commit hash, Pull Request URL and reviewer decision are pending creation by the repository
maintainer. They must be added here before issue closure.

## AI Declaration

The implementation and this validation record were generated and verified with the assistance of
Codex[GPT-5.6 Sol].
