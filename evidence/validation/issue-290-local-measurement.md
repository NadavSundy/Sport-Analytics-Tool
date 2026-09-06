# Issue #289 local representative-scale measurement

- Base URL: http://127.0.0.1:31970
- Fixture ID: 1; participant ID: 1
- Samples per operation: 10; sequential warm-cache requests
- Warm-up: one successful database-backed request discarded before sampling.

| Operation             | P50 (ms) | P95 (ms) | Target (ms) | Result |
| --------------------- | -------: | -------: | ----------: | ------ |
| public fixture page   |      5.3 |     23.0 |         500 | pass   |
| fixture event page    |      6.8 |     24.6 |         750 | pass   |
| fixture statistics    |      9.3 |     25.3 |        1500 | pass   |
| participant aggregate |   3454.0 |   3843.2 |        1500 | fail   |
| CSV event export      |      9.3 |     13.2 |        1000 | pass   |

This run uses no credentials, private data or production endpoint. See docs/development/performance-baseline.md for setup and cold-run procedure.
