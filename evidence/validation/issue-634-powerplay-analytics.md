# Issue #634 public powerplay analytics

## Scope verified

The fixture overview now places a Powerplay section directly after the full-innings comparison. For
each innings, it displays only the backend's nullable `metrics.powerplay` aggregate: runs, wickets
lost, formatted overs and run rate. The team name and one-based innings number provide readable
context, while the help text distinguishes the phase from the full innings and states that the first
six overs are never assumed.

When the API returns `powerplay: null`, the interface names the affected team and innings and says
that authoritative powerplay information is unavailable. A real marked powerplay containing zeroes
continues to display `0/0`, `0.0` and an undefined-rate em dash, so absence is not conflated with a
zero result. Marker ranges, types, source identifiers and provenance are not rendered.

## Automated verification

- `StatisticsPresentation.test.tsx` covers multi-innings authoritative figures, zero values, null
  rate presentation, missing marker metadata, readable context and suppression of raw range/type
  details.
- `statistics.spec.ts` covers a mixed authoritative/missing fixture in desktop Chromium and Pixel 7
  Chromium, keyboard focus on the responsive table, page overflow, and serious/critical Axe findings.
- Existing statistics request error/retry, partial warning and broader fixture presentation coverage
  remains in the focused frontend statistics suites.
- `npm run ci:local` passed the complete change-aware local gate after two unrelated backend API
  tests that timed out under the first coverage run passed in isolation and on the required broad
  rerun.

## Responsive evidence

- [Desktop fixture overview](issue-634-powerplay-desktop.png)
- [Pixel 7 fixture overview](issue-634-powerplay-mobile.png)

Both captures use the deterministic Playwright fixture containing one authoritative powerplay and
one innings without authoritative marker metadata.

## User-feedback gate

Sprint 3 gate #602 covers public statistics and fixture analytics through `PUB-01`–`PUB-06`. The
repository's pre-test summary still records #602 and `PUB-01`, `PUB-02` and `PUB-03` as not started.
No participant sessions or findings were supplied for this implementation, so no outcomes, accepted
findings or retests have been invented. The feature must be deployed and exercised through #602;
accepted findings must then be fixed and retested before the feedback gate closes.

## AI Declaration

The implementation and this verification record were produced with the assistance of Codex[GPT-5].
