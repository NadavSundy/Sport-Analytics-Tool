# Issue #289 local representative-scale measurement

> **Issue #592 label: AFTER the benchmark fix.** Run on 17 September 2026 at #592 PR 3 with commit
> 0ac4fe0, which runs `ANALYZE` after the bulk ingest and before any timed request. See
> `issue-592-performance-benchmark-before-analyze.md` for the failing run before the fix.

- Base URL: http://127.0.0.1:64885
- Fixture ID: 1; participant ID: 1
- Samples per operation: 10; sequential warm-cache requests
- Warm-up: one successful database-backed request discarded before sampling.

| Operation             | P50 (ms) | P95 (ms) | Target (ms) | Result |
| --------------------- | -------: | -------: | ----------: | ------ |
| public fixture page   |      6.6 |     14.8 |         500 | pass   |
| fixture event page    |     23.1 |     31.7 |         750 | pass   |
| fixture statistics    |      5.6 |     45.2 |        1500 | pass   |
| participant aggregate |      3.9 |    257.3 |        1500 | pass   |
| CSV event export      |     64.1 |     90.6 |        1000 | pass   |

This run uses no credentials, private data or production endpoint. See docs/development/performance-baseline.md for setup and cold-run procedure.
