# Issue #289 local representative-scale measurement

- Base URL: http://127.0.0.1:3001
- Fixture ID: 8937; participant ID: 18904
- Samples per operation: 10; sequential warm-cache requests
- Warm-up: one successful database-backed request discarded before sampling.

| Operation             | P50 (ms) | P95 (ms) | Target (ms) | Result |
| --------------------- | -------: | -------: | ----------: | ------ |
| public fixture page   |   2395.9 |   3275.5 |         500 | fail   |
| fixture event page    |   2725.6 |   3688.0 |         750 | fail   |
| fixture statistics    |   4150.7 |   5703.2 |        1500 | fail   |
| participant aggregate |   1804.6 |   4356.7 |        1500 | fail   |
| CSV event export      |   4357.4 |   5168.2 |        1000 | fail   |

This run uses no credentials, private data or production endpoint. See docs/development/performance-baseline.md for setup and cold-run procedure.
