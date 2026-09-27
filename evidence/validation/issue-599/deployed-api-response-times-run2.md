# Issue #599 deployed API response times — run 2 of 2

> **All five operations fail their targets.** The first run is in
> `deployed-api-response-times.md`. The P50s of the two runs are near-identical, so
> these are steady-state figures rather than cold start; the P95s vary more, which is
> what a single shared instance under variable load would look like. Both runs are
> tabulated and discussed in
> `evidence/sprints/sprint-3/issue-599-performance-revalidation.md`, which is the
> record this measurement is reported against.

Everything below the rule is the output of `scripts/measure-api-response-times.mjs`.
Its heading names issue #289 because the harness writes that string for every run,
local or not. **These are deployed measurements, not local ones.** Only Prettier's
Markdown table alignment has been applied, as it is for every committed file; no
figure is altered.

## Environment

- **Deployed** Container Apps API:
  `https://statsthegame-dev-api.calmground-aa50efe2.southafricanorth.azurecontainerapps.io`
- Hosted Supabase database, not a local or embedded one.
- Fixture ID 8937; participant ID 56 (BB McCullum).
- Measured on 25 September 2026 from a laptop in South Africa, so the figures
  include client-to-region network time.
- Ten samples per operation, one warm-up request discarded.
- Repository at the time of the run: `d4b0a51`, on `feat/708-participant-onboarding-ui`.
  The revision of the deployed image itself was not captured.

Every figure here is a **measured figure** under
`docs/development/reference-fixtures.md` §4.2. No published figure is asserted
against.

---

# Issue #289 local representative-scale measurement

- Base URL: https://statsthegame-dev-api.calmground-aa50efe2.southafricanorth.azurecontainerapps.io
- Fixture ID: 8937; participant ID: 56
- Samples per operation: 10; sequential warm-cache requests
- Warm-up: one successful database-backed request discarded before sampling.

| Operation             | P50 (ms) | P95 (ms) | Target (ms) | Result |
| --------------------- | -------: | -------: | ----------: | ------ |
| public fixture page   |    668.1 |    941.2 |         500 | fail   |
| fixture event page    |    805.5 |   1228.0 |         750 | fail   |
| fixture statistics    |   2353.5 |   2441.9 |        1500 | fail   |
| participant aggregate |   1235.0 |   3181.2 |        1500 | fail   |
| CSV event export      |   1177.8 |   1398.4 |        1000 | fail   |

This run uses no credentials, private data or production endpoint. See docs/development/performance-baseline.md for setup and cold-run procedure.
