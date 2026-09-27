# Issue #661 — API Explorer navigation and production UX

Issue #661 turns the `/api` Swagger Explorer into a discoverable public product surface and adds
browser-level evidence for navigation, responsiveness, accessibility and deployed API integration.

## Navigation and public UX

- Primary public navigation exposes **API** → `/api`.
- The bottom-of-page API entry opens **API Explorer** → `/api`.
- The footer separately exposes **API Documentation** →
  `https://sports-analytics-tool.pages.dev/api/overview/`.
- The public navigation remains responsive with seven destinations.
- No application authentication is required to open `/api`.

## Swagger formatting refinement

Project styling remains responsible for the surrounding Explorer shell, typography, cards, Day/Night
theme, endpoint framing and custom controls. Swagger's own response/example syntax renderer is left
responsible for JSON/code token rendering. This avoids project-wide code styles fragmenting Swagger's
Microlight example output into boxed tokens.

## Credential handling

No bearer token or consumer API key is committed or injected by the application. Users enter their own
credentials in Swagger's runtime authorization dialog when required. The Explorer keeps
`persistAuthorization` disabled and adds no custom local-storage, telemetry or logging path for those
values.

## Automated coverage

`tests/e2e/api-explorer.spec.ts` runs in the normal production-preview Playwright environment on
desktop Chromium and the repository's Pixel 7 mobile project. It checks navigation, Swagger loading,
implemented/public visibility, planned-operation separation and treatment, page overflow, footer discoverability and
serious/critical axe regressions in the project-owned shell and custom controls.

## Production-style deployed API / CORS verification

```bash
npm run test:e2e:api-explorer-live
```

This builds/serves the frontend through the standard Playwright production-preview path with
`VITE_API_BASE_URL=https://statsthegame-api-dev-eecff5bbfjbyhbb2.southafricanorth-01.azurewebsites.net/api/v1`. Since `ApiExplorerPage` uses browser `fetch` to retrieve
`/openapi.yaml`, successful Swagger rendering verifies browser CORS for that production-style origin.

After frontend deployment:

```powershell
$env:PLAYWRIGHT_BASE_URL="https://<deployed-frontend-origin>"
npm.cmd run test:e2e:api-explorer-live
Remove-Item Env:PLAYWRIGHT_BASE_URL
```

That deployed-origin run is the final production CORS evidence.

AI Declaration: The preceding document was planned, generated, reviewed and edited with the
assistance of ChatGPT-Web[GPT-5.6 Sol].
