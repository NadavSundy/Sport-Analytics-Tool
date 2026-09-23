# Issue #599 representative-scale API measurement, run 3 of 3

Everything below the rule is the unmodified output of
`scripts/measure-api-response-times.mjs`, written by
`npm run measure:performance:local -- --output evidence/validation/issue-599/api-response-times-run-3.md`
on 23 September 2026 against commit `c599939`. Its heading names issue #289
because the harness writes that string for every run, whatever the output path.
Only Prettier's Markdown table alignment has been applied, as it is to every
committed file in this repository; no figure is altered.

This is run 3 of 3. All three runs, and their comparison against the prior local
evidence, are tabulated in
`evidence/sprints/sprint-3/issue-599-performance-revalidation.md` section 8,
which is the record this measurement is reported against.

These are local loopback measurements against a disposable embedded
PostgreSQL server. They are **not** deployed response times; see section 1 of
that report.

Every figure here is a **measured figure** under
`docs/development/reference-fixtures.md` section 4.2.

---

# Issue #289 local representative-scale measurement

- Base URL: http://127.0.0.1:60373
- Fixture ID: 1; participant ID: 1
- Samples per operation: 10; sequential warm-cache requests
- Warm-up: one successful database-backed request discarded before sampling.

| Operation             | P50 (ms) | P95 (ms) | Target (ms) | Result |
| --------------------- | -------: | -------: | ----------: | ------ |
| public fixture page   |      8.1 |     15.3 |         500 | pass   |
| fixture event page    |     24.9 |     33.1 |         750 | pass   |
| fixture statistics    |      3.1 |     43.9 |        1500 | pass   |
| participant aggregate |      3.3 |    259.4 |        1500 | pass   |
| CSV event export      |     57.8 |     69.9 |        1000 | pass   |

This run uses no credentials, private data or production endpoint. See docs/development/performance-baseline.md for setup and cold-run procedure.
