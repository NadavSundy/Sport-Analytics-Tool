# Issue #410 reproduced pre-change baseline

Everything below the rule is the unmodified output of
`scripts/measure-api-response-times.mjs`, written by
`npm run measure:performance:local` on 2026-09-08 against the repository at
`5b750e5`, before any change for issue #410. Its heading names issue #289
because the harness writes that string for every run; the run is a #410
reproduction of the #290 baseline.

Every figure here is a **measured figure** under
`docs/development/reference-fixtures.md` §4.2. No published figure is involved.

The post-change run is recorded in `issue-410-participant-history-plan.md`.

---

# Issue #289 local representative-scale measurement

- Base URL: http://127.0.0.1:55686
- Fixture ID: 1; participant ID: 1
- Samples per operation: 10; sequential warm-cache requests
- Warm-up: one successful database-backed request discarded before sampling.

| Operation             | P50 (ms) | P95 (ms) | Target (ms) | Result |
| --------------------- | -------: | -------: | ----------: | ------ |
| public fixture page   |      9.7 |     21.9 |         500 | pass   |
| fixture event page    |     15.8 |     32.8 |         750 | pass   |
| fixture statistics    |     19.3 |     43.8 |        1500 | pass   |
| participant aggregate |    426.6 |   9978.5 |        1500 | fail   |
| CSV event export      |     20.9 |     26.7 |        1000 | pass   |

This run uses no credentials, private data or production endpoint. See docs/development/performance-baseline.md for setup and cold-run procedure.
