# Frontend component baseline

This is the final frontend component and convention set at Milestone 4. Issue #57 established the first primitives; later route work added the shell, navigation, browse and detail components below, and issue #894 confirmed the list against `apps/frontend/src/components` and `apps/frontend/src/features/browse`. It translates the approved [brand guidelines](brand-guidelines.md) into reusable React components; the screens they compose are described in the [final information architecture and wireframes](information-architecture-and-wireframes.md).

## Tokens and layout

`apps/frontend/src/styles.css` defines semantic colour tokens for Day Match and Night Match, a four-pixel spacing scale, control/card radii, focus colour and motion easing. Components consume semantic tokens only, so changing a theme changes colour and elevation without changing behaviour or content.

Use `PageLayout` for a normal route. It provides the 1600 px analytics content boundary, a clear page heading and an optional description. Pages stack content at narrow widths before reducing type below usable sizes.

## Reusable components

### Primitives (`src/components`)

| Component      | Purpose                                                                                             | Accessibility contract                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `Button`       | Primary, secondary and destructive native actions                                                   | Native keyboard operation, disabled state and visible focus                                    |
| `TextField`    | Labelled text input with optional help and validation                                               | Visible `<label>`, required semantics, help/error description, `aria-invalid`                  |
| `Message`      | Information, success, warning and error feedback                                                    | Errors use `role="alert"`; non-error updates use `role="status"`                               |
| `Card`         | Group related content                                                                               | Uses a landmark section; do not use for a single line only                                     |
| `DataTable`    | Responsive data table wrapper                                                                       | Native caption and table semantics; deliberate keyboard-focusable horizontal overflow          |
| `PageLayout`   | Shared route heading and content boundary                                                           | Preserves one visible page `<h1>`                                                              |
| `NameCombobox` | Searchable name picker for teams, players, competitions and fixtures (ranked by `fuzzyRankOptions`) | `role="combobox"` with a listbox, labelled clear/toggle buttons and a polite live result count |
| `ThemeToggle`  | Day Match / Night Match switch persisted per browser                                                | Labelled "Switch to … theme" control; the current theme is announced politely                  |
| `PublicShell`  | Header, Explore Data/Pinned/role menus, mobile Menu, skip link, `<main>` and footer                 | Skip link, labelled `<nav>` landmarks, focus moved to `<main>` on route change                 |

### Navigation primitives (`NavigationPrimitives.tsx`)

| Component           | Purpose                                                       | Accessibility contract                                                        |
| ------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `Breadcrumbs`       | Trail from a list to the current record                       | `<nav aria-label="Breadcrumb">`; the current item uses `aria-current="page"`  |
| `LocalNavigation`   | Route-based section links (fixture, account, review sections) | Labelled `<nav>`; the active link is marked current                           |
| `SectionNavigation` | In-page links to anchored sections on long detail pages       | Labelled `<nav>` of same-page links                                           |
| `AnchoredSection`   | Target wrapper for a `SectionNavigation` link                 | Plain wrapper with a stable `id`; the section inside supplies its own heading |

### Browse and detail building blocks (`src/features/browse`)

| Component                       | Purpose                                                                     | Accessibility contract                                                                    |
| ------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `BrowseCollection`              | Public list page: filters, result count, cards and Previous/Next pagination | Sets the page title; filter changes keep focus; loading, empty and error states announced |
| `RelatedCollection`             | Paged related records embedded in a detail page                             | Own heading and loading/empty/error states so one failed section does not blank the page  |
| `DetailLayout`                  | Detail-page frame: breadcrumbs, eyebrow, title and actions                  | One `<h1>`; calls `usePageTitle`                                                          |
| `DetailLoading` / `DetailError` | Page-level or embedded (`level={2}`) loading and failure states             | `role="status"` / `role="alert"` with retry where retryable                               |
| `RecordFacts` / `RecordFact`    | Key facts as a description list                                             | Native `<dl>`/`<dt>`/`<dd>` semantics                                                     |
| `RelatedLinks`                  | Links to related records                                                    | `<nav>` labelled by its heading                                                           |
| `SectionError`                  | Failure state for one embedded section                                      | Alert scoped to that section                                                              |
| `PinShortcutButton`             | Pin a team or competition into the **Pinned** header menu                   | Toggle button with `aria-pressed`                                                         |

All components work at desktop and mobile widths. Tables retain their meaningful columns and scroll horizontally when necessary; data cells marked with `data-numeric` are right-aligned with tabular numerals.

## Usage

```tsx
<PageLayout heading="Fixtures" description="Published T20 cricket fixtures.">
  <Card heading="Find a fixture">
    <TextField id="team" label="Team" helpText="Start typing a team name." />
    <Button type="submit">Apply filters</Button>
  </Card>
  <Message variant="error" heading="Could not load fixtures">
    <p>Try again when the service is available.</p>
  </Message>
</PageLayout>
```

Keep labels visible, never use placeholders as labels, and give destructive controls an explicit confirmation interaction. Test both themes, keyboard navigation, browser zoom and mobile table overflow when adding a component or route.

## Shell and route conventions

These conventions came out of the issue #800 route review. New routes get them for free when they use the shared layouts.

- **Page title.** `PageLayout`, `DetailLayout`, `BrowseCollection` and the page-level `DetailLoading`/`DetailError` states call `usePageTitle`, which names the tab `<h1> | Stat'sTheGame`. A page that renders its own `<h1>` calls `usePageTitle` itself with the same text. Loading and error states embedded beneath a page heading pass `level={2}` so they neither add a second `<h1>` nor replace the page title.
- **Navigation focus.** On a move to a different path, `PublicShell` opens the new page at the top and focuses `<main>`. Back/forward keeps the browser's scroll restoration, and a query-string change (filters, pagination) keeps focus where it is. Pages must not scroll the window themselves.
- **Header tiers.** `useHeaderLayout` sets `data-layout` on the header to `full`, `compact` (theme control shrinks to its switch) or `menu` (navigation moves into the menu panel). The tiers are rem-based and depend on whether the account has workspace links, which need about 400px more. When adding a header link, rerun `tests/e2e/responsive-layout.spec.ts` and adjust `headerLayoutQueries` if it fails.
- **Page width.** Page containers use `min(100% - var(--page-gutter), <max>)`. `--page-gutter` halves below 40rem, so mobile margins do not depend on rule order.
- **Horizontal scroll.** `DataTable` and the other table wrappers show an edge shadow while more columns lie beyond that edge. Inside a grid, give inputs and grid children `min-width: 0` so an input's intrinsic width cannot stop a page from reflowing at 320px.
- **Status colour.** Use `--colour-success`, `--colour-warning` and `--colour-error` (and their `-soft` backgrounds) together with text. `src/styles.test.ts` fails if a stylesheet consumes a colour token that neither theme declares.
- **Motion.** Buttons and header items scale to `0.97` while pressed, menus enter from their trigger in 160–200ms with a strong ease-out, and hover effects apply only to fine pointers. The global reduced-motion rule removes the movement.

## AI Declaration

The preceding document was reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
The shell and route conventions section was written with the assistance of Claude Code[Opus 5.5].
The final component inventory and its alignment with the final information architecture (#894) were
prepared with the assistance of Claude-Web[Claude Opus 5.5].
