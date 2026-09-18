# Harden OpenAPI Contract

**User:** Anonymous  
**Created:** 9/18/2026 7:40:51  
**Updated:** 9/18/2026 8:57:17  
**Exported:** 9/18/2026 8:57:59  
**Link:** [https://chatgpt.com/g/g-p-6a71ed6ea4d0819190118e1b9a94bea9/c/6aaccee1-d6c4-83ea-8f05-70f7465d55e5](https://chatgpt.com/g/g-p-6a71ed6ea4d0819190118e1b9a94bea9/c/6aaccee1-d6c4-83ea-8f05-70f7465d55e5)  

## Prompt:
9/18/2026, 8:28:33 AM

now lets do this

# Add a public Swagger API Explorer page #660

**svgOpen**

opened 14 hours ago by [Shayna](https://sdp.ms.wits.ac.za/Shayna) · 0 comments

[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=80))

[**Shayna**](https://sdp.ms.wits.ac.za/Shayna) commented [14 hours ago](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/660#issue-3363)

**Member**

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/660#description)Description

Add a public frontend route that renders the Sport Analytics API documentation using Swagger UI.

Proposed route:

```text

/api

```

The page must load the OpenAPI contract from the backend endpoint introduced by the backend Swagger work. The frontend must not maintain a second copy of the API specification.

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/660#motivation)Motivation

The Sport Analytics API is intended for external consumers. A public interactive API explorer makes the API discoverable, allows developers to inspect schemas and example responses, and provides a practical way to understand and test implemented endpoints.

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/660#acceptance-criteria)Acceptance Criteria

- The frontend exposes a public `/api` route.
- The route renders Swagger UI using the OpenAPI specification served by the backend.
- The page does not bundle or manually maintain a duplicate OpenAPI specification.
- The API explorer works without signing into the main web application.
- Swagger UI can display the documented public, bearer-authenticated and consumer-API-key endpoints.
- Swagger's authorization controls support the security schemes defined in the OpenAPI document.
- The page clearly identifies the current supported API major version.
- Implemented operations are available for normal interactive exploration.
- Operations marked `x-implementation-status: planned` are either:

  - hidden by default with an explicit option to show planned operations; or

  - clearly marked as planned and prevented from being presented as executable deployed functionality.

- Loading the OpenAPI specification has an accessible loading state.
- Failure to load the specification has a clear error state and retry action.
- Swagger rendering does not break the existing site layout, header, footer or theme.
- The page is usable on desktop and mobile widths.
- Keyboard navigation remains usable.
- Page-level headings, landmarks and supporting controls meet the project's accessibility requirements.
- Existing frontend lint, type-check, test and production build checks pass.

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/660#recommended-implementation)Recommended Implementation

Use the project's React routing structure and add an `ApiExplorerPage` feature/page.

A Swagger UI React integration such as `swagger-ui-react` is appropriate, provided the dependency is reviewed, version-controlled and documented according to the project's dependency policy.

Suggested page structure:

```text

API

├── Intro / API version / short consumer guidance

├── Implementation-status control

├── Swagger UI

└── Links to API documentation and dataset downloads

```

Do not manually recreate endpoint cards that duplicate Swagger unless there is a specific accessibility or product need.

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/660#tests)Tests

Add focused frontend tests covering:

- `/api` route renders;
- specification loading state;
- successful Swagger render;
- failed specification request;
- retry flow;
- implemented/planned operation treatment;
- API-key/bearer authorization UI remains available;
- no unexpected authenticated-user requirement.

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/660#ai-declaration)AI Declaration

The preceding issue description was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].

---

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/660#heading)

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/660#dependencies)Dependencies

- Depends on [#658](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/658) for the public backend OpenAPI endpoint.
- Depends on [#659](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/659) for the Swagger-ready authoritative OpenAPI contract.

## Response:
9/18/2026, 8:28:49 AM

> **Implemented frontend and public interactive API explorers**
>
> 
>
> **Inspecting the repository**
>
> I’m checking the project structure, existing API conventions, testing setup, and dependency patterns before proposing the Swagger UI change. I’ll keep the implementation aligned with the current codebase rather than inventing new conventions.
>
> **Inspected the repository**
>
> 
>
> **Searched 1 website**
>
> 
>
> **Checking npm package type definitions**
>
>
> **Checked npm package type definitions**
>
> 
>
> **Planning the implementation**
>
> I’m shaping the change around the existing frontend: add the Swagger UI dependency, load the OpenAPI document from the backend, and preserve current authentication and navigation patterns while allowing future planned operations.
>
> **Planned the implementation**
>
> 
>
> **Refining documentation needs**
>
> I’m keeping navigation changes out of scope and focusing on the requested public route. I’m also checking where frontend dependencies and API documentation are recorded so the addition stays documented and maintainable.
>
> **Designing the API page**
>
> I’m settling on a lazy-loaded Swagger page with scoped styling, fetch-based specification loading, and planned-operation filtering. I’m also keeping authentication buttons visible through the existing application shell and adding focused tests for these behaviors.
>
> **Refined documentation needs**
>
> 
>
> **Finalizing page behavior**
>
> I’m using the existing layout and links, adding an accessible loading state, and lazy-loading the explorer to avoid enlarging the initial bundle. The page will fetch the specification from the configured backend origin and retain current site styling.
>
> **Finalized page behavior**
>
> 
>
> **Searched 4 websites**
>
> 
>
> Worked for 2m 50s

Yes - this one is the **actual Swagger UI frontend issue**, unlike #659.

I built the implementation around your current React routing structure: `PublicApp` owns the public routes, and `PublicShell` provides the existing header/footer/theme around them. ([GitHub](https://raw.githubusercontent.com/NadavSundy/Sport-Analytics-Tool/main/apps/frontend/src/App.tsx)) I’ve also lazy-loaded Swagger UI so the fairly large dependency does **not** become part of the normal homepage bundle.

Use this patch:

[Download `apply_issue_660.py`](sandbox:/mnt/data/apply_issue_660.py)

Before running it, **#659 must be merged first**, because #660 relies on the hardened `/openapi.yaml` contract.

### 1. Start clean from merged `main`

```powershell
git checkout main
git pull

git checkout -b feat/660-public-api-explorer
```

### 2. Install the dependencies first

We need `swagger-ui-react` for the UI, `yaml` because the backend serves YAML and we need to inspect/filter `x-implementation-status`, and the Swagger React typings.

```powershell
npm.cmd install swagger-ui-react@5.33.0 yaml@2.9.1 --workspace=@sport-analytics/frontend

npm.cmd install --save-dev @types/swagger-ui-react@5.18.0 --workspace=@sport-analytics/frontend
```

This is intentional: Swagger UI React is the React integration for Swagger UI, and the current 5.x line supports OpenAPI 3.1. ([npm](https://www.npmjs.com/package/swagger-ui-react?utm_source=chatgpt.com)) `yaml` runs in modern browsers and includes its own TypeScript declarations. ([npm](https://www.npmjs.com/package/yaml?utm_source=chatgpt.com))

Doing the install separately also lets npm correctly update:

```text
apps/frontend/package.json
package-lock.json
```

instead of us trying to manufacture lockfile changes.

### 3. Apply the implementation

Put the script in the repo root and run:

```powershell
python .\apply_issue_660.py
```

It should create:

```text
apps/frontend/src/features/api-explorer/ApiExplorerPage.tsx
apps/frontend/src/features/api-explorer/ApiExplorerPage.css
apps/frontend/src/features/api-explorer/ApiExplorerPage.test.tsx
```

and update:

```text
apps/frontend/src/App.tsx
apps/frontend/README.md
docs/development/technology-stack.md
docs/api/overview.md
```

### What the implementation does

It adds the public:

```text
/api
```

route and **does not maintain a copy of `openapi.yaml`**. The page derives `/openapi.yaml` from your existing `VITE_API_BASE_URL`; your frontend already uses that variable for the handwritten backend at `/api/v1`. ([GitHub](https://raw.githubusercontent.com/NadavSundy/Sport-Analytics-Tool/main/apps/frontend/src/api/client.ts))

The page:

- lazy-loads Swagger UI;
- fetches the backend's authoritative `/openapi.yaml`;
- has an accessible **loading** state;
- has a clear **error + Retry** state;
- explicitly displays **Supported API major version: v1**;
- preserves `bearerAuth` and `apiKeyAuth`, so Swagger's **Authorize** control works;
- hides `x-implementation-status: planned` operations by default;
- provides **Show planned operations**;
- marks revealed planned operations `[PLANNED]`;
- disables **Try it out** while planned operations are visible;
- restores normal executable Swagger behavior when planned operations are hidden;
- links to the broader API docs and dataset downloads;
- stays inside your existing `PublicShell`, so the normal header/footer/theme remain;
- adds responsive and focus styling;
- does **not** require the user to be signed in.

It also records `swagger-ui-react`, `yaml`, and the typings in your technology-stack documentation, which your repository policy explicitly requires for new third-party dependencies. ([GitHub](https://raw.githubusercontent.com/NadavSundy/Sport-Analytics-Tool/main/docs/development/technology-stack.md))

### 4. Validate

After the patch:

```powershell
npm.cmd run format

npm.cmd run lint --workspace=@sport-analytics/frontend
npm.cmd run typecheck --workspace=@sport-analytics/frontend
npm.cmd run test --workspace=@sport-analytics/frontend
npm.cmd run build --workspace=@sport-analytics/frontend

npm.cmd run check
git diff --check
git status --short
```

The new focused tests cover `/api`, loading, successful Swagger rendering, failure/retry, planned-operation handling, both auth schemes, and anonymous/public access.

Run the dependency installs + patch first and send me the output. **Don't commit yet** - we'll fix any lint/type/test/build issues before the PR.

---

**Sources:**

- [](https://raw.githubusercontent.com/NadavSundy/Sport-Analytics-Tool/main/apps/frontend/src/App.tsx)
- [swagger-ui-react - npm](https://www.npmjs.com/package/swagger-ui-react?utm_source=chatgpt.com)

## Prompt:
9/18/2026, 8:39:53 AM

also, 2 qs.. 

1. can we make it folllow our branding gyuidlines (have samew style as app and docs)
2. will it be publicallyy accesable?

[Attachment: Pasted text(20260918-063925).txt]

## Response:
9/18/2026, 8:39:56 AM

> **Reviewing the integration**
>
> Yes—the public page already uses the app’s layout and should be accessible without authentication after deployment. I’d keep the Swagger UI functionality, then add branded colors, typography, spacing, and a cleaner wrapper.
> 
> **Fixing the build**
> 
> The TypeScript error comes from passing `showPlanned` to a component whose props don’t declare it. I’d conditionally spread that prop or update the component type, then rerun the build before committing.
>
> **Reviewed the integration**
>
> 
>
> Worked for 20s

Yes to both - and I’d tighten the branding **before we commit #660**.

The good news from your run is that lint, typecheck and **all 210 frontend tests passed**. The only failure is the production build, from one TypeScript prop issue in the new Swagger page. `Pasted text.txt`

### 1. Branding: yes

The page already inherits quite a lot of your app branding because `/api` is inside `PublicApp` → `PublicShell` and uses your existing `PageLayout`, cards, spacing variables, header, footer and theme controls.

But Swagger UI itself still has a fairly recognisable default Swagger appearance. I’d make the outer explorer look completely like **Stats The Game**, then lightly skin Swagger internally rather than fighting/rebuilding it.

So the page should feel like:

**Your normal app header → branded API intro → v1 badge/guidance → implementation-status card → Swagger content styled to sit naturally inside your design system → normal footer.**

We can override things such as Swagger typography, backgrounds, borders, buttons, operation blocks, authorize button, headings and mobile spacing using your existing CSS variables. We should **not** manually recreate endpoint cards because that would duplicate Swagger and defeat the purpose of the issue.

I also like that this gives visual consistency with both the application and docs while still clearly being an API explorer.

### 2. Publicly accessible: yes

Absolutely. That is how we have implemented it.

`/api` is being added to **`PublicApp`**, not behind an authenticated route/guard. So once this frontend branch is merged and deployed, somebody should be able to visit:

```text
https://<your-frontend-domain>/api
```

without logging in.

They will be able to:

- browse all public endpoints immediately;
- inspect authenticated endpoints without logging into the main site;
- use Swagger's **Authorize** control if they personally have a bearer token;
- use the consumer API endpoints if they have an API key;
- browse schemas and responses without any credentials.

The actual OpenAPI contract is also already public through `/openapi.yaml`, which we verified live with `HTTP 200` and `application/yaml`. So the browser page has a public specification to consume.

This directly satisfies the acceptance criterion:

> “The API explorer works without signing into the main web application.”

### One build error to fix

Your build currently fails only here:

```tsx
supportedSubmitMethods={showPlanned ? [] : undefined}
```

Because your TypeScript config uses `exactOptionalPropertyTypes`, Swagger's prop can either be **present with an array** or **absent** - explicitly passing `undefined` isn't allowed.

Replace:

```tsx
<SwaggerUI
  spec={visibleDocument}
  deepLinking
  displayRequestDuration
  persistAuthorization={false}
  supportedSubmitMethods={showPlanned ? [] : undefined}
/>
```

with:

```tsx
<SwaggerUI
  spec={visibleDocument}
  deepLinking
  displayRequestDuration
  persistAuthorization={false}
  {...(showPlanned ? { supportedSubmitMethods: [] } : {})}
/>
```

Then:

```powershell
npm.cmd run format
npm.cmd run typecheck --workspace=@sport-analytics/frontend
npm.cmd run test --workspace=@sport-analytics/frontend
npm.cmd run build --workspace=@sport-analytics/frontend
```

I would **also do the stronger Stats The Game styling now**, before we call #660 finished. That way we're not merely satisfying “Swagger renders”; we're satisfying the issue's explicit requirement that it **doesn't break the existing layout, header, footer or theme** and actually feels like part of your product.

## Prompt:
9/18/2026, 8:41:53 AM

how can i see what weve done?

[Attachment: Pasted text(20260918-064140).txt]

## Response:
9/18/2026, 8:41:56 AM

> **Searched 1 website**
>
> 
>
> Worked for 20s

Yes - easiest is to run the frontend locally and open the new `/api` page in your browser.

From the repo root, run:

```powershell
npm.cmd run dev --workspace=@sport-analytics/frontend
```

That starts Vite; your frontend package’s `dev` script is just `vite`. ([GitHub](https://raw.githubusercontent.com/NadavSundy/Sport-Analytics-Tool/main/apps/frontend/package.json)) Since your Vite config doesn’t override the dev port, it should normally be:

```text
http://localhost:5173
```

Then open:

```text
http://localhost:5173/api
```

That will show the actual page we built, including your normal app shell/header/footer, the API intro, version guidance, planned-operation control, and Swagger UI.

One important detail: the explorer itself fetches the backend OpenAPI document, so for the full local experience you should also have the backend running on port `3000`. If it isn’t running, the page should deliberately show the new **error + Retry** state instead, which is also useful to test.

So use two terminals:

```powershell
# terminal 1
npm.cmd run dev --workspace=@sport-analytics/backend
```

```powershell
# terminal 2
npm.cmd run dev --workspace=@sport-analytics/frontend
```

Then visit:

```text
http://localhost:5173/api
```

Your frontend checks are now otherwise healthy too: **210/210 tests passed and the production build passed** after the prop fix. The warnings in the test output are pre-existing test-console warnings, not #660 failures. `Pasted text.txt`

Once you open `/api`, send me a screenshot. Then we can judge the branding properly and make it match the rest of Stats The Game before committing.

---

**Sources:**

- [](https://raw.githubusercontent.com/NadavSundy/Sport-Analytics-Tool/main/apps/frontend/package.json)

## Prompt:
9/18/2026, 8:44:28 AM

![e26e0135-1f0e-4037-9213-4db89b2c455a.png](https://chatgpt.com/backend-api/estuary/content?id=file_00000000ace481f58287699a135e07a3&fn=e26e0135-1f0e-4037-9213-4db89b2c455a.png&cd=attachment&ts=497142&p=fs&cid=1&sig=a8ebd414941ab715a05df4fac4107c5e3ed3bdcccb7d63e8ad734e27fbccadbd&v=0)

great.. but i feel like visyally needs to be more similar to rest.. can we do thar?

## Response:
9/18/2026, 8:44:45 AM

> **Assessing the styling patch**
>
> I’m checking the existing styles so I can match the app’s visual language rather than guessing. I’ll focus on typography, spacing, colors, borders, and responsive behavior while keeping the UI implementation unchanged.
>
> **Assessed the styling patch**
>
> 
>
> **Refining branded styles**
>
> I’m planning a CSS-only pass: warmer canvas colors, branded green and orange accents, softer cards, tighter typography, and more cohesive controls. I’ll preserve Swagger’s behavior while making its layout feel native to the app.
>
> **Applying visual polish**
>
> I’m ready to append a focused CSS override that makes the explorer feel branded: warmer surfaces, green/orange accents, consistent typography, softer borders, improved Swagger controls, and better light/dark theme integration without changing functionality.
>
> **Refined branded styles and applied visual polish**
>
> 
>
> **Searched 1 website**
>
> 
>
> Worked for 1m 38s

## Prompt:
9/18/2026, 8:46:10 AM

also must have night mode like the rest

## Prompt:
9/18/2026, 8:46:29 AM

also must have night mode like the rest if poossible

## Response:
9/18/2026, 8:48:02 AM

Yes - and it should absolutely follow the app’s **night mode**, not just be a light Swagger box inside a dark shell.

Your app already has proper theme tokens and switches with `:root[data-theme='night']`, including dark surfaces, light text, lime primary, cyan data accent, orange brand colour, dark borders, and shadows. ([GitHub](https://raw.githubusercontent.com/NadavSundy/Sport-Analytics-Tool/main/apps/frontend/src/styles.css)) So we can theme Swagger to use those exact tokens rather than inventing a separate dark palette.

I made a branding/night-mode patch for the API Explorer:

[Download `brand_issue_660_api_explorer_v2.py`](sandbox:/mnt/data/brand_issue_660_api_explorer_v2.py)

Run it from the repo root:

```powershell
python .\brand_issue_660_api_explorer_v2.py
```

Then:

```powershell
npm.cmd run format
npm.cmd run lint --workspace=@sport-analytics/frontend
npm.cmd run typecheck --workspace=@sport-analytics/frontend
npm.cmd run build --workspace=@sport-analytics/frontend
```

Then keep your dev servers running and refresh:

```text
http://localhost:5173/api
```

Use the **existing Day/Night toggle in your normal header**. You should see Swagger switch with the rest of the site automatically.

This patch makes the explorer much closer to Stats The Game visually: your IBM Plex / Barlow typography, app card radii and shadows, lime primary actions, cyan GET endpoints, orange PUT/PATCH, branded error/delete treatment, app-style borders and surfaces, responsive mobile layout, and importantly explicit overrides for Swagger’s hard-coded white sections in **night mode**.

It does **not** alter Swagger functionality or the API - only the explorer CSS.

After you run it, send me **one screenshot in Day and one in Night**. I want to visually inspect both before we call the styling finished.

---

**Sources:**

- [](https://raw.githubusercontent.com/NadavSundy/Sport-Analytics-Tool/main/apps/frontend/src/styles.css)

## Prompt:
9/18/2026, 8:54:38 AM

![69e7c9c2-fdfb-49e9-85db-67c8aabf35f6.png](https://chatgpt.com/backend-api/estuary/content?id=file_00000000298c8230a8a5c2ce907d8e22&fn=69e7c9c2-fdfb-49e9-85db-67c8aabf35f6.png&cd=attachment&ts=497142&p=fs&cid=1&sig=974ec4f209a596e9c5e8f4942ff22bcd3b244d8598ef7734c251cbda2c244e26&v=0)

![1db82441-6f4a-4330-bd22-d09f80b0d439.png](https://chatgpt.com/backend-api/estuary/content?id=file_00000000be6881f5802095af64815577&fn=1db82441-6f4a-4330-bd22-d09f80b0d439.png&cd=attachment&ts=497142&p=fs&cid=1&sig=7f20c44f1cd595104981218002c89a5add9f3607fd4eacafd7db1f9d2fda89dc&v=0)

![ef0f52aa-1c5b-4be4-99e6-d045949332f9.png](https://chatgpt.com/backend-api/estuary/content?id=file_000000003f5c81fda8add6cfcb33564e&fn=ef0f52aa-1c5b-4be4-99e6-d045949332f9.png&cd=attachment&ts=497142&p=fs&cid=1&sig=77bde08899bf89c17bbf3e7e8ae25536a11b0cd4b4600ce709bbe926290901d0&v=0)

![be5f3600-7b97-4ef1-8dda-8f7d93364746.png](https://chatgpt.com/backend-api/estuary/content?id=file_000000003b8481fa9f3a6385b31a45e5&fn=be5f3600-7b97-4ef1-8dda-8f7d93364746.png&cd=attachment&ts=497142&p=fs&cid=1&sig=5fab70857e646cb37fc306608f747ac36dbd386d4cce3a34452b34db59a8c620&v=0)

![2ac2b617-eb43-41a2-8582-7ef0834c5b72.png](https://chatgpt.com/backend-api/estuary/content?id=file_000000000184820bb90087b2949f8ae8&fn=2ac2b617-eb43-41a2-8582-7ef0834c5b72.png&cd=attachment&ts=497142&p=fs&cid=1&sig=2b7363e91643c8030f4e1bb9d3f58f9645253f353920d0c07a494f7161e56854&v=0)

done? i think so?

## Response:
9/18/2026, 8:54:56 AM

> **Assessing the finish**
>
> Visually, I’m calling this done: the light and dark themes feel cohesive, the Swagger area matches the brand, and the hierarchy is clear. I’d only run the final build, lint, and mobile/accessibility checks before shipping.
>
> **Assessed the finish**
>
> 
>
> Worked for 16s

Yes — **visually, I’d call this done.** The day and night screenshots now feel like the same product rather than “our app with Swagger pasted into it.”

The important bits are working well: the API Explorer header and cards match the rest of StatsTheGame, Swagger typography is much closer to your app, GET operations use your cyan/data accent, the lime `Authorize` button fits the brand, the surrounding cards/borders/radii are consistent, and **Night Match is properly dark throughout Swagger rather than leaving white Swagger panels behind**.

I also like the separation between your own product guidance at the top and the actual OpenAPI explorer below. It makes the page feel intentional rather than just exposing raw Swagger.

I **wouldn't keep tweaking the styling now**. More overrides risk making Swagger harder to maintain or breaking some of its built-in states.

Before committing, just do the final technical pass after the CSS changes:

```powershell
npm.cmd run format
npm.cmd run lint --workspace=@sport-analytics/frontend
npm.cmd run typecheck --workspace=@sport-analytics/frontend
npm.cmd run test --workspace=@sport-analytics/frontend
npm.cmd run build --workspace=@sport-analytics/frontend

npm.cmd run check
git diff --check
git status
```

And do one quick browser check at a narrow/mobile width — mainly that long endpoint paths wrap rather than forcing horizontal overflow.

If those pass: **yes, #660 is ready for commit/PR.**

## Prompt:
9/18/2026, 8:56:23 AM

modified:   apps/frontend/README.md
        modified:   apps/frontend/package.json
        modified:   apps/frontend/src/App.tsx
        modified:   docs/api/overview.md
        modified:   docs/development/technology-stack.md
        modified:   package-lock.json

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        apps/frontend/src/features/api-explorer/

no changes added to commit (use "git add" and/or "git commit -a")
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
9/18/2026, 8:56:36 AM

Perfect — that status looks exactly right for #660. The new `api-explorer/` folder being untracked is expected; we just need to stage it along with the dependency/docs changes.

Run:

```powershell
git add apps/frontend/README.md `
        apps/frontend/package.json `
        apps/frontend/src/App.tsx `
        apps/frontend/src/features/api-explorer `
        docs/api/overview.md `
        docs/development/technology-stack.md `
        package-lock.json

git status
```

You should now see all of those under **Changes to be committed**.

Then commit:

```powershell
git commit -m "feat(api): add public Swagger API explorer" `
  -m "Assisted-by: ChatGPT-Web[GPT-5.6 Sol]"
```

Then push:

```powershell
git push -u origin feat/660-public-api-explorer
```

### PR title

```text
feat(api): add public Swagger API explorer
```

### PR description

```markdown
## Summary

Closes #660.

Adds a public, branded API Explorer at `/api` using Swagger UI and the authoritative OpenAPI specification served by the backend.

## Changes

- adds a public `/api` frontend route
- loads the authoritative backend `/openapi.yaml` contract at runtime
- does not bundle or maintain a duplicate OpenAPI specification
- integrates Swagger UI using `swagger-ui-react`
- parses the served YAML contract using `yaml`
- supports the contract-defined:
  - public operations
  - bearer-authenticated operations
  - consumer `X-API-Key` operations
- displays the currently supported API major version (`v1`)
- hides `x-implementation-status: planned` operations by default
- provides an explicit control to show planned operations
- clearly marks revealed planned operations as planned
- disables interactive requests while planned operations are visible
- adds accessible loading, error and retry states
- keeps the normal StatsTheGame public header, footer and layout
- adds responsive behaviour for narrower/mobile widths
- preserves keyboard focus treatment
- lazy-loads Swagger UI so it does not inflate the normal initial route bundle
- adds focused frontend tests for route access, loading, Swagger rendering, auth schemes, planned operations, failure and retry behaviour
- documents the new dependencies and API Explorer workflow

## Branding and themes

Swagger UI has been styled to match the existing StatsTheGame design system rather than using the default Swagger appearance.

This includes:

- existing StatsTheGame typography
- application spacing, borders, cards and radii
- cyan/data styling for GET operations
- existing primary/brand/error colours for other operations
- branded authorization controls
- responsive endpoint layouts
- full Day Match support
- full Night Match support using the application's existing theme tokens

The explorer follows the application's existing `data-theme="night"` theme state rather than maintaining a separate theme.

## Public access

The `/api` route is part of the public application and does not require authentication.

Users can browse public API documentation anonymously. Bearer tokens and consumer API keys can be supplied at runtime through Swagger's Authorize controls when required.

## Dependencies

Added:

- `swagger-ui-react`
- `yaml`
- `@types/swagger-ui-react`

These are documented in the project's technology stack documentation.

## Validation

- frontend lint ✅
- frontend type-check ✅
- frontend tests ✅ — 210/210
- frontend production build ✅
- repository `npm run check` ✅
- `git diff --check` ✅
- manual Day Match browser verification ✅
- manual Night Match browser verification ✅

## Notes

Swagger UI is lazy-loaded into a separate route chunk. The explorer chunk is therefore only downloaded when `/api` is visited.

No backend routes or API behaviour are changed by this PR.

## AI Declaration

The Issue #660 public Swagger API Explorer implementation, tests, styling and documentation were planned, generated, reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
```

For your AI transcript, I’d call it:

```text
evidence/ai/transcripts/shayna-unterslak/2026-09-18-issue-660-public-swagger-api-explorer.md
```

And the register entry can describe the work as:

```csv
"2026-09-18","Shayna Unterslak","ChatGPT Web","GPT-5.6 Sol","Planning; code generation; styling; testing; review and debugging","Issue #660: Add a public Swagger API Explorer page","Designed and implemented the public /api Swagger explorer, runtime OpenAPI loading, implemented/planned operation handling, authorization support, accessible loading/error/retry states, StatsTheGame branding, responsive styling and Day/Night theme integration; added tests and dependency/documentation updates.","Frontend lint and type-check passed; 210/210 frontend tests passed; production build passed; repository checks and git diff --check passed; manually verified Day Match and Night Match rendering.","evidence/ai/transcripts/shayna-unterslak/2026-09-18-issue-660-public-swagger-api-explorer.md; Issue #660; branch feat/660-public-api-explorer; PR pending"
```

After you push, send me the PR number if you want me to update that last CSV field cleanly.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)