# Issue #869: Previous page for the fixture Players list

## Summary

`RelatedCollection` kept only the current cursor and rendered a single Next page button, so the
fixture Players list (and every other related list built on it) could move forward but never back.
The public API's cursor pagination is forward-only, so the component now keeps the cursor that
produced each visited page. Previous page pops that history and re-requests the exact cursor of the
preceding slice; the first page is always requested without a cursor.

- Branch: `fix/869-related-collection-previous-page`
- Changed: `apps/frontend/src/features/browse/RelatedCollection.tsx`
- Tests: `apps/frontend/src/features/browse/RelatedCollection.test.tsx` (new) and a route-level
  regression in `apps/frontend/src/pages/PublicBrowsePages.test.tsx`

## Behaviour after the fix

| State            | Previous page | Page indicator | Next page    | End message |
| ---------------- | ------------- | -------------- | ------------ | ----------- |
| Single page      | not rendered  | not rendered   | not rendered | shown       |
| First of several | disabled      | Page 1         | enabled      | hidden      |
| Middle page      | enabled       | Page n         | enabled      | hidden      |
| Final page       | enabled       | Page n         | disabled     | shown       |

The history is tied to the related scope (`filters`). If the parent record changes, the list restarts
at page one rather than reusing another fixture's cursor. Controls are native `<button type="button">`
elements inside a labelled `navigation` landmark, with the existing accessible names pattern
(`Previous players page` and `Next players page`). The page indicator uses `aria-live="polite"`.

As in the issue, list pagination remains component state and does not change the URL. That matches the
existing behaviour of every related list; moving it into the URL was out of scope.

## Test-driven development

1. Tests were written first and committed while failing. The 4 new component tests and the
   `#869` route test failed with `Unable to find ... "Previous players page"`. A fifth test
   (single-page collection has no controls) passed beforehand as a guard against regressions.
2. The implementation was added and all of them passed.

| Command                              | Result                     |
| ------------------------------------ | -------------------------- |
| `npm run test:frontend`              | 46 files, 466 tests passed |
| `npm run typecheck`                  | passed                     |
| `npm run hygiene`                    | passed                     |
| `npm run structure:check`            | passed                     |
| Prettier and ESLint on changed files | clean                      |

## Browser verification of the original reproduction

The deployed site (`https://sport-analytics-tool-web.pages.dev/fixtures/8937/players`) was not
reachable from the AI working environment, and it will not include this change until it is deployed.
The reproduction was therefore run on the Vite dev build of this branch in headless Chromium 1194
(Playwright). It used a local stub of the public read API that serves fixture `8937`
(New Zealand vs Australia) and 22 fixture players in cursor pages of 10, ordered so that A Symonds
opens page 1, as in the reported reproduction.

Steps and results:

1. Open `/fixtures/8937/players`. Page 1 starts with A Symonds. Previous page is disabled.
2. Move focus to Next page and press Enter. Page 2 starts with JDP Oram. Previous page is enabled.
3. Activate Next page. Page 3, the final page, shows SM Katich and SB Styris. Next page is disabled,
   and "End of published results" is shown.
4. Move focus to Previous page and press Space. The exact page 2 slice is restored.
5. Activate Previous page. The exact page 1 slice is restored, and Previous page is disabled again.

Across the 3 pages the list showed 22 unique players, with no records skipped or duplicated. Every
participants request kept `fixtureId=8937&limit=10`, and the cursor sequence was none, `offset-10`,
`offset-20`, `offset-10`, none.

Screenshots: [page 1](issue-869/869-players-page-1.png), [page 2](issue-869/869-players-page-2.png),
[final page](issue-869/869-players-page-3-final.png),
[back to page 1](issue-869/869-players-back-to-page-1.png).

**Still to do by a team member:** after deployment, repeat steps 1 to 5 on the deployed URL with real
data and record the deployed commit and browser version here.
