# Shared frontend components

Place reusable, presentational, accessible UI components here. Feature-specific components should remain inside the relevant directory under `src/features/`.

`PublicShell` provides the shared public header, main-content target, footer and persisted Day Match/Night Match control. Route-level pages supply only their own main content and must not duplicate the shell.

## Component baseline

Issue #57 establishes a deliberately small presentational baseline. Build new routes from these components rather than copying page-local controls and state styling:

- `PageLayout` supplies the responsive page boundary, page heading and optional description.
- `Button` provides primary, secondary and destructive native buttons. Use one primary action per local region; destructive actions need a confirmation flow.
- `TextField` always renders a visible label. It links optional help and validation text to the input and exposes errors through `aria-invalid`.
- `Message` renders information, success, warning and error feedback. Error messages use an alert region; other updates use a status region.
- `Card` groups genuinely related content on a solid, bordered surface.
- `DataTable` wraps a native table in a focusable horizontal-overflow region for narrow screens. Give every table a meaningful caption, use `scope` on headers, and add `data-numeric` to right-align numerical cells with tabular figures.

The baseline consumes semantic Day Match/Night Match tokens from `src/styles.css`; individual components must not introduce hard-coded theme colours. It follows the approved 4 px spacing scale, 6 px controls, 10 px cards, visible keyboard focus, and the existing reduced-motion policy. Prefer semantic HTML over ARIA; ARIA complements native semantics where a native element cannot express the intent.

The approved production font families are Barlow Condensed, IBM Plex Sans and IBM Plex Mono. They are intentionally not fetched from a third-party runtime: add them through a package-managed or self-hosted asset change before enabling the families in production.
