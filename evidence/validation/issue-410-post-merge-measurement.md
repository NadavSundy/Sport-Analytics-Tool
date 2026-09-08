# Issue #410 post-merge measurement

Everything below the rule is the output of `scripts/measure-api-response-times.mjs`,
written by `npm run measure:performance:local` on 2026-09-08 with the issue #410
change applied and `origin/main` merged in — that merge brought issue #285 and its
`standardInningsPredicate` consolidation, the #286/#293 fixture-statistics cache,
the #292 API-consumer work and the #283/#425 batch changes. Its heading names issue
#289 because the harness writes that string for every run. Only Prettier's Markdown
table alignment has been applied, as it is for every committed file; no figure is
altered.

This is the first of three post-merge runs. All three are tabulated in
`issue-410-participant-history-plan.md` §6, which is the record this change is
reported against. The pre-change run is retained in
`issue-410-reproduced-baseline.md` and the pre-merge post-change run in
`issue-410-post-change-measurement.md`.

Every figure here is a **measured figure** under
`docs/development/reference-fixtures.md` §4.2.

---

# Issue #289 local representative-scale measurement

- Base URL: http://127.0.0.1:63779
- Fixture ID: 1; participant ID: 1
- Samples per operation: 10; sequential warm-cache requests
- Warm-up: one successful database-backed request discarded before sampling.

| Operation             | P50 (ms) | P95 (ms) | Target (ms) | Result |
| --------------------- | -------: | -------: | ----------: | ------ |
| public fixture page   |      9.5 |     20.7 |         500 | pass   |
| fixture event page    |     10.2 |     26.9 |         750 | pass   |
| fixture statistics    |      4.6 |     40.3 |        1500 | pass   |
| participant aggregate |     97.3 |    256.2 |        1500 | pass   |
| CSV event export      |      9.7 |     13.5 |        1000 | pass   |

This run uses no credentials, private data or production endpoint. See docs/development/performance-baseline.md for setup and cold-run procedure.
