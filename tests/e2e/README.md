# End-to-end tests

Add browser-driven tests for critical user journeys once authentication and routing exist. Prioritise registration/login/reset/deletion, approved submission, validation rejection, review/publication, correction propagation, filtered statistics, and dataset export.

## Connected public-data journeys

The public browsing and player overview specifications jointly verify the approved public-data
redesign as connected tasks. They cover competition to season to fixture, team to fixture, and
player to match to inline statistics and calculation trace. The journeys count keyboard
activations, audit visible text for technical references, exercise Day Match and Night Match
independently, check desktop and mobile overflow, and scan each representative view with Axe.

Run the focused suite from the repository root:

```text
npm run test:e2e -- tests/e2e/public-browsing.spec.ts tests/e2e/player-overview.spec.ts --workers=1
```

Capture the issue #199 representative screenshots from the same deterministic journeys with:

```powershell
$env:CAPTURE_ISSUE_199_EVIDENCE='1'
npm run test:e2e -- tests/e2e/public-browsing.spec.ts tests/e2e/player-overview.spec.ts --workers=1
```

## AI Declaration

The connected public-data journey guidance was documented with the assistance of
Codex[GPT-5.6 Sol].
