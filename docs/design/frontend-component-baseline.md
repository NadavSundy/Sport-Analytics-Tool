# Frontend component baseline

This is the implementation baseline for issue #57. It translates the approved [brand guidelines](brand-guidelines.md) into small reusable React components without prescribing a permanent page design.

## Tokens and layout

`apps/frontend/src/styles.css` defines semantic colour tokens for Day Match and Night Match, a four-pixel spacing scale, control/card radii, focus colour and motion easing. Components consume semantic tokens only, so changing a theme changes colour and elevation without changing behaviour or content.

Use `PageLayout` for a normal route. It provides the 1600 px analytics content boundary, a clear page heading and an optional description. Pages stack content at narrow widths before reducing type below usable sizes.

## Reusable components

| Component    | Purpose                                               | Accessibility contract                                                                |
| ------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `Button`     | Primary, secondary and destructive native actions     | Native keyboard operation, disabled state and visible focus                           |
| `TextField`  | Labelled text input with optional help and validation | Visible `<label>`, required semantics, help/error description, `aria-invalid`         |
| `Message`    | Information, success, warning and error feedback      | Errors use `role="alert"`; non-error updates use `role="status"`                      |
| `Card`       | Group related content                                 | Uses a landmark section; do not use for a single line only                            |
| `DataTable`  | Responsive data table wrapper                         | Native caption and table semantics; deliberate keyboard-focusable horizontal overflow |
| `PageLayout` | Shared route heading and content boundary             | Preserves one visible page `<h1>`                                                     |

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
