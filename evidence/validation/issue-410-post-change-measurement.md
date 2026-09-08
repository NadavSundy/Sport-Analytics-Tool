# Issue #410 post-change measurement

Everything below the rule is the output of `scripts/measure-api-response-times.mjs`,
written by `npm run measure:performance:local` on 2026-09-08 with the issue #410
change applied. Its heading names issue #289 because the harness writes that
string for every run. Only Prettier's Markdown table alignment has been applied,
as it is for every committed file; no figure is altered.

This is the first of three post-change runs. All three are tabulated in
`issue-410-participant-history-plan.md` §6, and the pre-change run is retained in
`issue-410-reproduced-baseline.md`.

Every figure here is a **measured figure** under
`docs/development/reference-fixtures.md` §4.2.

---

# Issue #289 local representative-scale measurement

- Base URL: http://127.0.0.1:50294
- Fixture ID: 1; participant ID: 1
- Samples per operation: 10; sequential warm-cache requests
- Warm-up: one successful database-backed request discarded before sampling.

| Operation             | P50 (ms) | P95 (ms) | Target (ms) | Result |
| --------------------- | -------: | -------: | ----------: | ------ |
| public fixture page   |      8.9 |     24.0 |         500 | pass   |
| fixture event page    |     11.6 |     22.7 |         750 | pass   |
| fixture statistics    |     15.4 |     56.4 |        1500 | pass   |
| participant aggregate |    175.0 |    567.5 |        1500 | pass   |
| CSV event export      |     12.1 |     17.6 |        1000 | pass   |

This run uses no credentials, private data or production endpoint. See docs/development/performance-baseline.md for setup and cold-run procedure.
