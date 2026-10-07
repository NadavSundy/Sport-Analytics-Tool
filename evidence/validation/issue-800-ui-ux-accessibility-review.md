# Issue #800: final UI/UX, accessibility and responsive review

Review date: 5 October 2026. Branch: `fix/800-ui-ux-accessibility-polish`.

## Scope and method

The review covered every normal user-facing route in both Day Match and Night Match:

- **Public:** home, fixtures, fixture overview, players and statistics, a statistic
  calculation trace, competitions, seasons, teams, players, player comparison, dataset
  releases, the API Explorer, sign-in, the three policy pages from #798, and not-found.
- **Signed in:** account overview and access, submit data, submission history, review
  queue, administration, users, API consumers, and publish a dataset release.

Each route was opened in a production build at 320, 390, 768 and 1280 CSS pixels in
both themes (256 page states). For each state the audit recorded:

- serious and critical Axe violations, plus every lower-impact Axe violation;
- horizontal overflow, with the element responsible;
- the heading outline and any skipped levels;
- the document title;
- browser console errors.

Every state was screenshotted. The header was also checked at twelve widths from 320 to
1440 pixels, signed out and as an administrator. 320 CSS pixels is the width a 1280-pixel
window shows at 400% zoom, so the 320 checks are the WCAG 2.2 SC 1.4.10 reflow test.

Public data came from a mocked published fixture, because the hosted development API was
returning 503 during the review. Workspace routes were reviewed signed in as an
administrator, the role that can reach all of them, with empty collections, so their
empty states were reviewed too.

Performance is owned by #797. This review only confirms that the changes do not lower the
Lighthouse results.

## Findings and fixes

| Area                              | Finding before                                                                                                                                                                                                                             | Fix                                                                                                                                                                                                                                 | Regression test                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Header, 901–1260px                | Signed in as an administrator at 1024px (a tablet in landscape, or a laptop at 125% zoom), Downloads and API were drawn over Manage Submission and the wordmark was cut off. Up to at least 1180px, "Explore Data" wrapped onto two lines. | Three header tiers (full, compact theme switch, menu) chosen by `useHeaderLayout`. The tiers are rem-based and depend on whether the account has workspace links. Header CSS was consolidated from three competing blocks into one. | `responsive-layout.spec.ts` (overlap, clip, wrap at 12 widths, two roles); `useHeaderLayout.test.tsx` |
| Header, 320px                     | The theme switch covered the wordmark.                                                                                                                                                                                                     | Compact switch with sun and moon glyphs; the theme name is visually hidden below 30rem but still announced.                                                                                                                         | `responsive-layout.spec.ts`                                                                           |
| Header consistency                | Public links were small and muted, account links were large and bold, and the active markers differed.                                                                                                                                     | One size, colour, active marker (tint plus rule, not colour alone) and press feedback for every top-level item. A hairline separates the theme control.                                                                             | Visual review; Axe                                                                                    |
| Reflow at 320px                   | Account pages were 377px wide and the submission form 361px.                                                                                                                                                                               | The account grid track can shrink; inputs and grid children have `min-width: 0`; page widths share a `--page-gutter` token instead of depending on rule order.                                                                      | `responsive-layout.spec.ts` (every reviewed route, after data loads)                                  |
| Page titles                       | Public pages were all titled "Stat'sTheGame", and some titles disagreed with their heading ("Submit Events" for "Submit data").                                                                                                            | `usePageTitle` in the shared layouts and in pages that render their own `<h1>`. The title always matches the `<h1>`, including loading and error states.                                                                            | `RouteExperience.test.tsx`, dataset release and statistics tests                                      |
| Focus and scroll after navigation | A new page opened at the previous page's scroll position, with focus left on a link that no longer existed.                                                                                                                                | The shell opens the page at the top and focuses `<main>` on a path change, but not on back/forward or a query-string change. It also re-asserts the top position after an in-flight smooth scroll.                                  | `RouteExperience.test.tsx`; `policies.spec.ts` footer journey                                         |
| Loading text                      | The route fallback read "Loading pageâ€¦" (mis-encoded).                                                                                                                                                                                   | Correct ellipsis.                                                                                                                                                                                                                   | `RouteExperience.test.tsx`                                                                            |
| Statistic trace                   | "Wanderers innings 0 total": the zero-based ordinal was shown to people.                                                                                                                                                                   | One-based, as the scorecards already were.                                                                                                                                                                                          | Statistics unit and e2e tests                                                                         |
| Heading outline                   | Match statistics and the dataset release states jumped from h1 to h3. Player comparison nested a second h1 in its loading and error states.                                                                                                | Visually hidden "Scorecard" h2; release states are h2; embedded states take `level={2}`.                                                                                                                                            | `expectNoSkippedHeadingLevels` in unit tests; audit                                                   |
| Status colour                     | `--colour-success`, `--colour-warning` and four other tokens were used but never declared, so success and warning messages lost their accent in both themes.                                                                               | Tokens declared for both themes and contrast-checked (all at least 4.95:1 against their backgrounds).                                                                                                                               | `styles.test.ts`                                                                                      |
| Filters                           | Gender was a free-text box, so people had to guess the stored value.                                                                                                                                                                       | A select of the recorded genders. An unlisted value from the address stays selectable, and the active-filter summary shows the label.                                                                                               | `PublicBrowsePages.test.tsx`                                                                          |
| Narrow tables and tabs            | Wide scorecards and the account tabs were cut off with no sign that they scroll.                                                                                                                                                           | An edge shadow appears on each side that has more content beyond it.                                                                                                                                                                | Visual review                                                                                         |
| Feedback states                   | The API Explorer error title was squeezed to an 18ch measure; a state message whose first child is a paragraph had a stray top margin.                                                                                                     | Message headings use a body measure; first-child margin reset.                                                                                                                                                                      | Visual review                                                                                         |
| Buttons                           | There was no press feedback, and hover applied on touch.                                                                                                                                                                                   | `scale(0.97)` while pressed and hover only for fine pointers. The reduced-motion rule removes the movement.                                                                                                                         | Visual review                                                                                         |
| Home call to action               | The decorative crease ran through the heading.                                                                                                                                                                                             | The crease sits between heading and button, and the heading takes two lines.                                                                                                                                                        | Visual review                                                                                         |

## Results after the fixes

Both columns come from the same audit script run against production builds of `main`
(commit `4b3cef95`) and of this branch, with identical mocked data.

| Check (32 routes, 256 page states)           | `main`                                                                                                                     | This branch                           |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Serious or critical Axe violations           | 0                                                                                                                          | 0                                     |
| Moderate Axe violations                      | `heading-order` on 2 routes                                                                                                | 0                                     |
| Page states with horizontal overflow         | 6 (account overview, account access and submit data at 320px, both themes)                                                 | 0                                     |
| Header items overlapping, clipped or wrapped | Yes for an administrator: overlapping at 1024px, "Explore Data" wrapped at 1180px; theme switch over the wordmark at 320px | None at any of 12 widths, either role |
| Routes with skipped heading levels           | 2                                                                                                                          | 0                                     |
| Routes whose title is only "Stat'sTheGame"   | 22                                                                                                                         | 0                                     |

On the final branch build, `npm run check` passed (formatting, lint, type-check, OpenAPI
lint, build and every workspace's tests, including 455 frontend unit tests), as did
`npm run hygiene`. `npm run test:e2e` passed 152 tests across the desktop and mobile
projects; the one skipped test is the opt-in live API Explorer check.

New automated coverage: Axe on every reviewed data and workspace route in both themes;
header layout at 12 widths for two roles; reflow at 320px on every reviewed route; route
titles, focus and scroll; heading outlines; colour token declarations; and the header tier
hook.

### Lighthouse (CI baseline gate)

The CI configuration (9 public routes, 3 runs each, median, `baseline` gate) was run
locally against production previews of `main` and of this branch on the same machine.

| Route               | Desktop `main` | Desktop branch | Mobile `main` | Mobile branch | CI floor (desktop/mobile) |
| ------------------- | -------------- | -------------- | ------------- | ------------- | ------------------------- |
| `/`                 | 100            | 100            | 93            | 93            | 97 / 90                   |
| `/api`              | not rerun      | 100            | 91            | 91            | 96 / 89                   |
| `/competitions`     | not rerun      | 99             | 90            | 90            | 96 / 87                   |
| `/seasons`          | not rerun      | 99             | 90            | 90            | 96 / 86                   |
| `/fixtures`         | not rerun      | 99             | 89            | 89            | 96 / 86                   |
| `/competitors`      | not rerun      | 99             | 90            | 90            | 96 / 87                   |
| `/participants`     | not rerun      | 99             | 90            | 90            | 96 / 87                   |
| `/dataset-releases` | not rerun      | 100            | 91            | 91            | 96 / 88                   |
| `/sign-in`          | not rerun      | 99             | 90            | 90            | 96 / 87                   |

The branch passes the CI baseline gate with no regression failures, and every mobile median
equals `main`'s. Cumulative layout shift stays at or below 0.005 on every route. On this
machine, mobile LCP is above the strict 2.5-second production target on `main` and on the
branch alike; that is #797's scope and is unchanged by this work.

### Screenshots

Before and after captures are in [`issue-800/`](issue-800/). Each file is named
`<before|after>-<route>-<theme>-<width>.png`.

| Pair                                          | Shows                                                                                               |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `header-admin-day-1024`                       | Overlapping header links and clipped wordmark, replaced by the menu tier                            |
| `header-admin-night-1180`                     | "Explore Data" wrapped and mismatched item styles, replaced by the compact tier (theme switch only) |
| `header-signed-out-day-320`                   | Theme switch over the wordmark, replaced by the compact mobile header                               |
| `menu-admin-day-1024`                         | No menu at this width before; after, the menu panel with one column per section                     |
| `account-reflow-day-320`                      | Account card wider than the screen, then fitting, with a scroll edge on the tabs                    |
| `submit-data-reflow-night-320`                | Submission form wider than the screen, then fitting                                                 |
| `home-day-1280`                               | Call-to-action crease crossing the heading, then sitting beside it                                  |
| `fixtures-night-1280`                         | Unified header items and active marker                                                              |
| `match-statistics-night-390`                  | Mobile scorecards with a scroll edge; scorecard heading outline                                     |
| `innings-trace-day-1280`                      | "innings 0" corrected to "innings 1"                                                                |
| `api-explorer-night-1280`                     | Squeezed error title, then readable                                                                 |
| `review-queue-day-1280`                       | Uneven empty-state spacing, then even                                                               |
| `submit-data-night-390` and `account-day-390` | The mobile header at 390px                                                                          |

## Keyboard operation

Keyboard journeys are covered by the existing e2e suite and were rechecked after the header
change:

- skip link to `<main>`;
- Explore Data and Manage Submission menus (arrow keys, Escape returns focus to the button);
- the menu panel (Escape closes it and returns focus);
- footer policy links (open at the top with focus on `<main>`);
- the filter combobox, sign-in, and the submission, correction and review workflows.

Focus stays visible on every control: header items and menus use the theme focus colour,
and the programmatic focus on `<main>` is the only element without an outline, because it
is never a Tab stop.

## Remaining known limitations

- Wide data tables (scorecards, administrator tables) scroll sideways inside their frame
  on narrow screens instead of reflowing, because their rows and columns must stay
  aligned. An edge shadow signals the hidden columns, and each table can be focused and
  scrolled with the keyboard. This is recorded in the accessibility statement.
- The API Explorer's interactive operations are rendered by Swagger UI. The development
  API was unavailable, so the review audited the page's own content and its clear
  specification-unavailable error state, but not Swagger UI's operation panels.
- The review is automated (Axe, layout assertions) and keyboard-based. It did not include
  testing with a screen reader such as NVDA or VoiceOver, and it does not replace an
  independent WCAG 2.2 AA audit.
- Header tier breakpoints were measured for the current links. A new header link needs
  the header layout spec rerun; the component baseline explains how to adjust the tiers.

## AI declaration

This review, its fixes and this record were produced with the assistance of Claude
Code[Opus 5.5], using a test-first workflow. Every finding above was reproduced in a
production build before it was fixed, and every fix was verified against the automated
checks listed.
