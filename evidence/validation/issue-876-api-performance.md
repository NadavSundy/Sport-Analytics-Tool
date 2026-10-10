# Issue #289 local representative-scale measurement

- Base URL: http://127.0.0.1:3001
- Fixture ID: 8937; participant ID: 18904
- Samples per operation: 10; sequential warm-cache requests
- Warm-up: one successful database-backed request discarded before sampling.

| Operation             | P50 (ms) | P95 (ms) | Target (ms) | Result |
| --------------------- | -------: | -------: | ----------: | ------ |
| public fixture page   |   2133.0 |   3295.0 |         500 | fail   |
| fixture event page    |   2592.1 |   3268.4 |         750 | fail   |
| fixture statistics    |   4010.9 |   4912.2 |        1500 | fail   |
| participant aggregate |   1805.4 |   4136.8 |        1500 | fail   |
| CSV event export      |   4370.7 |   4632.1 |        1000 | fail   |

This run uses no credentials, private data or production endpoint. See docs/development/performance-baseline.md for setup and cold-run procedure.
