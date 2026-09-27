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

## AI Declaration

The preceding document was reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
