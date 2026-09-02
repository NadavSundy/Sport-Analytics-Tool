# End-to-end tests

The Playwright suite covers the critical public, authentication, submitter, administrator,
correction, statistics and browsing journeys against the production frontend bundle. Browser tests
complement the API and PostgreSQL integration suites; route mocks inside a browser test are not a
substitute for backend integration coverage.

## Hosted browser matrix

Hosted CI deliberately avoids replaying every browser journey at two viewport sizes:

- `desktop-chromium` runs the complete `tests/e2e/` suite;
- `mobile-chromium` runs only tests tagged `@mobile` using the Pixel 7 profile;
- `@mobile` is reserved for representative journeys where narrow-screen layout, overflow, keyboard,
  responsive interaction or accessibility behaviour materially changes; and
- CI defaults to two Playwright workers. Set `PLAYWRIGHT_WORKERS=1` only when reproducing a
  runner-resource or ordering problem.

The representative mobile set includes authentication, homepage, administrator rejection,
public-browsing/player/statistics journeys, direct submission, submitter-access and the dedicated
accessibility matrix. New responsive-critical journeys should add `@mobile`; ordinary business-flow
variants should remain desktop-only unless a second viewport adds meaningful coverage.

The dedicated accessibility specification keeps the broader three-route, Day Match/Night Match Axe
matrix on desktop. On mobile it runs a focused public/sign-in Day Match scan; the tagged responsive
journeys provide additional mobile Axe coverage, including both themes on the homepage.

## Production build reuse

Local `npm run test:e2e` builds the frontend before starting Vite preview. Hosted CI builds the
production bundle once in the browser job and sets `PLAYWRIGHT_REUSE_BUILD=1`, so Playwright starts
preview directly instead of rebuilding the same bundle.

Run the complete configured matrix locally from the repository root:

```text
npm run test:e2e
```

Run only the complete desktop suite with:

```text
npm run test:e2e -- --project=desktop-chromium
```

Run only the representative mobile suite with:

```text
npm run test:e2e -- --project=mobile-chromium
```

## Connected public-data journeys

The public browsing and player overview specifications jointly verify the approved public-data
redesign as connected tasks. They cover competition/season/fixture relationships, team and player
navigation, inline statistics and calculation trace. The complete connected journeys remain on
desktop; the player journey and representative public browsing path retain Pixel 7 coverage. The
matrix checks keyboard interactions, visible text, responsive overflow, Day Match/Night Match where
relevant and Axe findings.

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

The connected public-data and hosted browser-matrix guidance was documented with the assistance of
ChatGPT-Web[GPT-5.6 Sol].
