# Issue #289 local representative-scale measurement

> **Issue #592 label: BEFORE the benchmark fix.** Run on 17 September 2026 at #592 PR 3 head (1ebed89),
> when `measure:performance` timed requests immediately after its bulk ingest and before any table had
> planner statistics. The participant aggregate P95 is one request that took minutes; the cause is
> recorded in `evidence/validation/issue-592-first-read-plans/`. The same failure occurred on `main`
> (49cb137, 1,874,734 ms) and at #592 PR 2 (4a3fa5f, 76,502 ms). See
> `issue-592-performance-benchmark-after-analyze.md` for the run after the fix.

- Base URL: http://127.0.0.1:56629
- Fixture ID: 1; participant ID: 1
- Samples per operation: 10; sequential warm-cache requests
- Warm-up: one successful database-backed request discarded before sampling.

| Operation             | P50 (ms) | P95 (ms) | Target (ms) | Result |
| --------------------- | -------: | -------: | ----------: | ------ |
| public fixture page   |      6.9 |     13.0 |         500 | pass   |
| fixture event page    |     14.8 |     18.9 |         750 | pass   |
| fixture statistics    |      2.5 |     40.9 |        1500 | pass   |
| participant aggregate |     10.3 | 147517.1 |        1500 | fail   |
| CSV event export      |    210.2 |    254.7 |        1000 | pass   |

This run uses no credentials, private data or production endpoint. See docs/development/performance-baseline.md for setup and cold-run procedure.
