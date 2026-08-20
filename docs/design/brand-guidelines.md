# Stat’sTheGame Brand and Interface Guidelines

| Document information | Details               |
| -------------------- | --------------------- |
| Product              | Stat’sTheGame         |
| Domain               | T20 cricket analytics |
| Light theme          | Day Match             |
| Dark theme           | Night Match           |
| Document version     | 1.0                   |
| Status               | Approved              |
| Date                 | 7 August 2026         |
| Approval confirmed   | 19 August 2026        |

> This document defines the approved visual identity and frontend presentation standard for Stat’sTheGame. Project-team approval of the design documents was confirmed during issue #191 on 19 August 2026. Future changes continue through the normal project issue and Pull Request process.

---

## 1. Purpose and project alignment

Stat’sTheGame is the user-facing identity for the project’s T20 cricket analytics platform.

The interface must support the project’s existing architectural boundaries rather than create a separate product model:

- the React frontend presents data and user journeys;
- the frontend obtains application data through the documented backend HTTP API;
- authoritative validation, authorisation, business rules and database access remain backend responsibilities;
- the API remains a first-class product rather than an implementation detail;
- the current event-data domain is T20 cricket, with Cricsheet as the approved historical data source;
- user-facing work must remain usable, responsive, accessible and consistent with the agreed design.

Relevant project documents:

- [System architecture](../architecture/system-architecture.md)
- [Repository structure](../architecture/repository-structure.md)
- [API overview](../api/overview.md)
- [Cricsheet T20 data](../data/cricsheet.md)
- [Testing strategy](../development/testing.md)
- [Project methodology](../project_methodology.md)
- [Git methodology](../git-methodology.md)
- [AI usage](../ai/usage.md)

This document covers visual and interaction design only. It does not override architecture, security, API, database, testing or project-methodology decisions.

---

## 2. Brand foundation

### 2.1 Brand idea

**The game, measured ball by ball.**

Stat’sTheGame should make event-derived cricket data feel immediate without making it feel unreliable or superficial.

### 2.2 Brand personality

The product should feel:

- **Fast** — appropriate for T20 cricket and responsive interaction.
- **Exact** — statistics are evidence, not decoration.
- **Confident** — strong visual hierarchy without exaggerated marketing language.
- **Technical** — appropriate for analysts and API consumers.
- **Accessible** — understandable to cricket followers who are not data specialists.
- **Distinctive** — recognisable without generic SaaS or generic sports styling.
- **Traceable** — the interface should reinforce that published figures come from underlying event data.

### 2.3 Brand keywords

**Explosive. Exact. Traceable.**

These words are a design test, not marketing copy. A screen that is energetic but makes values harder to interpret is not on-brand. A screen that is technically correct but visually lifeless is also incomplete.

### 2.4 Tagline

Primary tagline:

> **The game, measured ball by ball.**

Approved secondary lines:

- Every ball. Every stat.
- From delivery to decision.
- Cricket data with a source.

Avoid phrases such as:

- “unlock the future of cricket”;
- “revolutionary insights”;
- “supercharge your game”;
- “AI-powered cricket intelligence” unless AI is genuinely a user-facing feature and the claim is specifically justified.

---

## 3. Product name

### 3.1 Written name

Use:

**Stat’sTheGame**

In normal prose, use the curly apostrophe.

Technical contexts may use ASCII-safe forms:

```text
Plain-text fallback: Stat'sTheGame
Repository/package slug: stats-the-game
URL/route segment: statsthegame
Environment prefix: STATS_THE_GAME_
```

### 3.2 Capitalisation

The product name is constructed as:

```text
Stat’s + The + Game
```

Do not use:

```text
StatsTheGame
Stats the Game
Stat's the game
STATSTHEGAME
```

All-uppercase treatment is allowed only in designed display contexts such as compact navigation or promotional artwork.

---

## 4. Approved logo concept

The logo is based on the selected reference artwork and contains:

- a navy cricket-player silhouette;
- a large orange apostrophe-shaped cricket bat;
- a lime cricket ball;
- a lime curved motion trail;
- the Stat’sTheGame wordmark.

The **orange apostrophe-bat is the defining brand device**. It must remain visually dominant in all logo refinements.

The approved reference image is the authority for the player pose, bat shape, ball, motion trail and overall composition. Future logo work must trace or adapt that reference deliberately; it must not regenerate the player through an image model and treat the result as the same logo.

### 4.1 Theme treatment

#### Day Match / light backgrounds

Use:

- navy player and wordmark;
- orange apostrophe-bat;
- lime ball and motion trail;
- transparent background.

#### Night Match / dark backgrounds

Use:

- warm off-white player and wordmark;
- orange apostrophe-bat;
- lime ball and motion trail;
- transparent background.

The orange and lime brand accents remain consistent between themes.

### 4.2 Logo variants

The brand system requires:

1. **Full logo** — player mark plus wordmark.
2. **Player mark** — player, orange apostrophe-bat, ball and trail without the wordmark.
3. **Wordmark** — Stat’sTheGame wordmark without the player.
4. **Favicon** — simplified orange apostrophe-bat mark with sufficient transparent safe area.

### 4.3 Minimum sizes

| Asset       |     Minimum recommended digital size |
| ----------- | -----------------------------------: |
| Full logo   |                          180 px wide |
| Player mark |                           40 px wide |
| Wordmark    |                          140 px wide |
| Favicon     | 16 × 16 px, using simplified artwork |

If detail becomes unreadable below these sizes, switch to the next simpler asset rather than shrinking the full logo further.

### 4.4 Clear space

For the full logo and player mark, keep clear space on all sides equal to approximately the width of the player’s head.

Do not allow:

- text;
- borders;
- navigation controls;
- chart labels;
- card edges;

to intrude into the clear-space area.

### 4.5 Favicon safe area

The favicon must never touch the edge of its square canvas.

Requirements:

- keep at least **14% transparent padding on every side**;
- keep the visible mark centred optically, not only mathematically;
- verify the favicon at 16 × 16, 32 × 32 and 48 × 48;
- do not use the full player or wordmark at favicon size;
- do not allow shadows or outlines to extend beyond the safe area.

### 4.6 Incorrect logo use

Do not:

- replace the orange apostrophe-bat with a normal cricket bat;
- move the apostrophe away from the player’s hands;
- recolour the apostrophe-bat green, blue or white;
- replace the lime ball or trail with unrelated accent colours;
- stretch, squash, skew or arbitrarily rotate the logo;
- add shields, trophies, crossed bats or wickets;
- add permanent neon glows to the production artwork;
- place the logo over busy imagery without a solid supporting surface;
- retype the wordmark in a different font and present it as the logo;
- regenerate the logo and silently replace the approved artwork.

---

## 5. Logo file structure and naming

The documentation site and frontend are independently deployable, so each needs access to its own static brand assets.

The **canonical design assets** live under:

```text
docs/design/assets/logo/
```

The **frontend runtime copies** live under:

```text
apps/frontend/public/brand/
```

Files with the same name in these two locations must represent the same approved artwork.

### 5.1 Canonical documentation assets

```text
docs/design/assets/logo/
├── statsthegame-logo-reference.png
├── statsthegame-logo-light.svg
├── statsthegame-logo-dark.svg
├── statsthegame-mark-light.svg
├── statsthegame-mark-dark.svg
├── statsthegame-wordmark-light.svg
├── statsthegame-wordmark-dark.svg
└── statsthegame-favicon.svg
```

The reference PNG is retained for traceability and future vector redrawing. It is not intended to be used as the normal application asset.

### 5.2 Frontend runtime assets

```text
apps/frontend/public/brand/
├── statsthegame-logo-light.svg
├── statsthegame-logo-dark.svg
├── statsthegame-mark-light.svg
├── statsthegame-mark-dark.svg
├── statsthegame-wordmark-light.svg
├── statsthegame-wordmark-dark.svg
└── statsthegame-favicon.svg
```

For broad browser compatibility, also provide:

```text
apps/frontend/public/favicon.ico
```

The `.ico` file must use the same padded apostrophe-bat artwork as the SVG favicon.

### 5.3 Asset URLs in the frontend

Examples:

```text
/brand/statsthegame-logo-light.svg
/brand/statsthegame-logo-dark.svg
/brand/statsthegame-mark-light.svg
/brand/statsthegame-mark-dark.svg
/brand/statsthegame-wordmark-light.svg
/brand/statsthegame-wordmark-dark.svg
/brand/statsthegame-favicon.svg
/favicon.ico
```

Do not import the canonical copies from `docs/` into the frontend. The documentation website and application have separate deployment boundaries.

### 5.4 Current artwork format

The current approved reference is raster artwork. If an SVG variant contains embedded raster data, it must not be described as a true vector redraw.

A future true-vector version should trace the approved reference and preserve:

- player pose;
- proportions;
- apostrophe-bat silhouette;
- ball position;
- motion trail;
- wordmark composition.

---

## 6. Theme strategy

Stat’sTheGame supports two equal themes:

1. **Day Match** — warm light theme.
2. **Night Match** — dark broadcast-inspired theme.

Both themes use the same:

- information architecture;
- layout;
- spacing;
- typography hierarchy;
- controls;
- content;
- interaction behaviour.

Theme switching changes colour and elevation only. It must not reveal, hide or move functionality.

### 6.1 Theme behaviour

On first visit:

```text
1. Use a stored user preference if one exists.
2. Otherwise use the operating-system preference.
3. Otherwise default to Day Match.
```

Requirements:

- provide a visible manual theme control;
- persist the user’s manual selection;
- do not change theme automatically based on time of day;
- do not force Night Match for live matches;
- avoid pure white and pure black as the main page canvas.

Components must consume semantic design tokens instead of hard-coded theme-specific values.

---

## 7. Day Match palette

Day Match is warm, editorial and scorecard-inspired.

| Token                     | Name            | Hex       | Primary use                       |
| ------------------------- | --------------- | --------- | --------------------------------- |
| `--colour-canvas`         | Warm Canvas     | `#F5F2E9` | Page background                   |
| `--colour-surface`        | Scorecard Paper | `#FFFDF7` | Cards, forms, modals              |
| `--colour-surface-raised` | Pavilion Paper  | `#EEE9DC` | Secondary surfaces                |
| `--colour-text`           | Match Ink       | `#102026` | Primary text                      |
| `--colour-text-secondary` | Commentary Ink  | `#52636A` | Supporting text                   |
| `--colour-text-muted`     | Scorebook Grey  | `#627078` | Metadata and muted labels         |
| `--colour-border`         | Printed Rule    | `#D9D3C4` | Borders and dividers              |
| `--colour-primary`        | Crease Green    | `#5D7E00` | Primary actions and selected data |
| `--colour-primary-soft`   | Grass Tint      | `#DFF0A7` | Selected surfaces                 |
| `--colour-brand`          | Boundary Orange | `#E95A24` | Logo and high-impact events       |
| `--colour-data-accent`    | Analysis Cyan   | `#007F9E` | Links and comparison series       |
| `--colour-success`        | Accepted Green  | `#3A8F57` | Success indicators                |
| `--colour-warning`        | Review Amber    | `#C98500` | Warning indicators                |
| `--colour-error`          | Rejected Red    | `#D64251` | Error indicators                  |

### 7.1 Day Match rules

- Use Warm Canvas for the page and Scorecard Paper for raised surfaces.
- Use Match Ink rather than black.
- Use Crease Green for the dominant action in a region.
- Use Boundary Orange sparingly for brand moments, wickets, anomalies and decisive events.
- Use Analysis Cyan for links and secondary analytical series.
- Do not use Boundary Orange as small body text on a light surface.
- Use colour together with labels, icons or patterns for statuses.
- Keep shadows broad, low-opacity and functional.

---

## 8. Night Match palette

Night Match is a modern broadcast-and-analytics treatment rather than a gaming interface.

| Token                     | Name            | Hex       | Primary use                       |
| ------------------------- | --------------- | --------- | --------------------------------- |
| `--colour-canvas`         | Night Match     | `#08121B` | Page background                   |
| `--colour-surface`        | Pavilion        | `#101E2B` | Cards and navigation              |
| `--colour-surface-raised` | Scoreboard      | `#162736` | Raised cards and overlays         |
| `--colour-surface-soft`   | Deep Field      | `#0C1822` | Alternate dark surface            |
| `--colour-border`         | Floodlight Rule | `#263847` | Borders and dividers              |
| `--colour-text`           | Crease White    | `#F6F8F2` | Primary text                      |
| `--colour-text-secondary` | Commentary Grey | `#B8C3CC` | Supporting text                   |
| `--colour-text-muted`     | Muted Score     | `#8EA0AF` | Metadata and labels               |
| `--colour-primary`        | Powerplay Lime  | `#C7FF4A` | Primary actions and selected data |
| `--colour-brand`          | Boundary Orange | `#FF6B35` | Logo and high-impact events       |
| `--colour-data-accent`    | Review Cyan     | `#20D5FF` | Links and comparison series       |
| `--colour-success`        | Accepted Green  | `#4ADE80` | Success indicators                |
| `--colour-warning`        | Review Amber    | `#FBBF24` | Warning indicators                |
| `--colour-error`          | Rejected Red    | `#FF5A67` | Error indicators                  |

### 8.1 Night Match rules

- Use navy surfaces rather than black.
- Use Powerplay Lime selectively so it retains emphasis.
- Bright lime and orange filled controls use dark text.
- Use Boundary Orange for brand identity and high-impact match events.
- Avoid excessive glow.
- A restrained halo is acceptable for a live indicator or focus state.
- Do not make glassmorphism the default card style.

---

## 9. Semantic colour usage

| Semantic role           | Day Match | Night Match |
| ----------------------- | --------- | ----------- |
| Page background         | `#F5F2E9` | `#08121B`   |
| Card background         | `#FFFDF7` | `#101E2B`   |
| Raised surface          | `#EEE9DC` | `#162736`   |
| Primary text            | `#102026` | `#F6F8F2`   |
| Secondary text          | `#52636A` | `#B8C3CC`   |
| Muted text              | `#627078` | `#8EA0AF`   |
| Border                  | `#D9D3C4` | `#263847`   |
| Primary action          | `#5D7E00` | `#C7FF4A`   |
| Brand/high-impact event | `#E95A24` | `#FF6B35`   |
| Link/comparison         | `#007F9E` | `#20D5FF`   |

A typical screen should remain predominantly neutral:

- 70–80% canvas and surfaces;
- 15–20% text and structural contrast;
- 5–8% primary green/lime;
- 2–4% orange/cyan accents.

Do not colour every statistic.

---

## 10. Typography

### 10.1 Font families

| Role                                  | Font             |
| ------------------------------------- | ---------------- |
| Display headings and major statistics | Barlow Condensed |
| Interface and body text               | IBM Plex Sans    |
| API paths, IDs and technical values   | IBM Plex Mono    |

Approved weights:

```text
Barlow Condensed: 500, 600, 700
IBM Plex Sans: 400, 500, 600
IBM Plex Mono: 400, 500
```

Production font loading must be treated as a documented frontend dependency. Prefer package-managed or self-hosted fonts over an undeclared third-party runtime dependency.

### 10.2 Type scale

| Style           | Size / line-height | Weight | Typical use            |
| --------------- | ------------------ | -----: | ---------------------- |
| Display         | 64 / 64            |    700 | Live score             |
| Page heading    | 48 / 52            |    700 | Page title             |
| Section heading | 30 / 34            |    600 | Dashboard section      |
| Card heading    | 22 / 26            |    600 | Panel title            |
| KPI value       | 40 / 42            |    600 | Key statistic          |
| Body            | 16 / 24            |    400 | Main content           |
| Small body      | 14 / 20            |    400 | Supporting content     |
| Label           | 12 / 16            |    600 | Metadata               |
| Technical       | 13 / 20            |    400 | Endpoint, ID, checksum |

### 10.3 Typography rules

- Use tabular numerals for scores, rates and data tables.
- Use condensed typography for display values, not paragraphs.
- Use uppercase only for short labels and compact navigation.
- Keep normal body text at 16 px where practical.
- Do not make every number lime or green.
- Use IBM Plex Mono only where monospacing communicates meaning.
- The logo wordmark is artwork; do not recreate it using Barlow Condensed.

---

## 11. Layout and spacing

### 11.1 Spacing scale

Use a 4 px base unit:

```text
4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80
```

### 11.2 Recommended content widths

| Context                           | Maximum width |
| --------------------------------- | ------------: |
| Analytics application             |       1600 px |
| Documentation / long-form content |       1100 px |
| Form-focused flow                 |        760 px |
| Standard modal                    |    720–900 px |

### 11.3 Grid

Desktop analytical screens may use a 12-column grid.

Useful patterns include:

- 8 columns for primary match content and 4 for supporting events;
- 9 columns for charts and 3 for compact supporting tables;
- four equal KPI cards;
- full-width tables when comparison is the primary task.

### 11.4 Responsive behaviour

Use content-driven breakpoints. Starting values:

```text
Small:   below 640 px
Medium:  640–899 px
Large:   900–1199 px
Wide:    1200 px and above
```

Stack dashboard regions before shrinking typography below usable sizes.

---

## 12. Shape and surface language

### 12.1 Corners

| Element                   | Radius |
| ------------------------- | -----: |
| Inputs and small controls |   6 px |
| Standard cards            |  10 px |
| Large overlays            |  16 px |

Fully rounded pills are reserved for controls or statuses where the shape has a clear purpose.

### 12.2 Signature clipped corner

Featured match cards, logo tiles and selected hero surfaces may use one clipped bottom-right corner.

Do not apply clipped corners to every container.

### 12.3 Borders and elevation

- Use 1 px borders for structural separation.
- Use shadows to communicate elevation, not decoration.
- Day Match shadows are broad and low-opacity.
- Night Match shadows are restrained and dark.
- Avoid glowing card borders.
- Avoid glassmorphism as the standard card language.

### 12.4 Crease line

A 2–3 px line is a recurring visual device.

Appropriate uses:

- active navigation;
- selected KPI card;
- chart target or benchmark;
- score transition;
- section accent.

Do not use it between every row.

---

## 13. Core interface components

### 13.1 Buttons

#### Primary

Day Match:

```text
Background: Crease Green
Text: white
```

Night Match:

```text
Background: Powerplay Lime
Text: Night Match
```

Use one dominant primary action per local region.

#### Secondary

Use:

- surface background;
- visible border;
- primary text;
- primary-colour focus/hover treatment.

#### Destructive

Use error styling only for genuinely destructive actions.

Irreversible actions require confirmation.

### 13.2 Cards

Cards should:

- use solid surfaces;
- group related information;
- have a clear hierarchy;
- avoid unnecessary icons;
- use spacing before heavy shadows.

Do not create a card solely to place a border around one line of text.

### 13.3 Navigation

- Desktop may use a compact left rail or top navigation.
- Mobile navigation must remain understandable without relying only on icon familiarity.
- The active state uses a soft selected surface plus the crease-line accent.
- Navigation remains stable during page transitions.

### 13.4 Tables

- Left-align entity names.
- Right-align numeric values.
- Use tabular numerals.
- Use subtle row separators.
- Keep long table headers sticky where helpful.
- Support horizontal overflow deliberately on small screens.
- Do not turn every value into a badge.

### 13.5 Forms

- Keep labels visible above inputs.
- Placeholder text does not replace a label.
- Validation identifies the exact issue and location.
- Required/error state is not communicated by colour alone.
- Submission flows must show progress and actionable validation results.

### 13.6 Loading and system states

Every data-driven screen must have deliberate states for:

- loading;
- empty results;
- validation failure;
- general error;
- unauthorised access;
- unavailable/offline backend;
- partial data where the API explicitly supports it.

Do not use an indefinite full-page spinner where useful structure can be rendered immediately.

---

## 14. Cricket data visualisation

### 14.1 Chart palette

| Role                    | Day Match       | Night Match     |
| ----------------------- | --------------- | --------------- |
| Current/selected series | Crease Green    | Powerplay Lime  |
| Comparison series       | Analysis Cyan   | Review Cyan     |
| Historical/unselected   | Scorebook Grey  | Commentary Grey |
| Wicket/anomaly          | Boundary Orange | Boundary Orange |
| Invalid/error state     | Rejected Red    | Rejected Red    |

### 14.2 Chart rules

- Start with the analytical question, not the chart type.
- Avoid rainbow palettes.
- Use line style, marker shape or opacity in addition to colour.
- State units and ranges explicitly.
- Label decisive points directly where practical.
- Keep tooltips keyboard accessible where practical.
- Provide text equivalents for important conclusions.
- Do not delay access to data while a decorative animation completes.

### 14.3 Cricket-specific conventions

Approved visual patterns include:

- orange wickets or decisive events;
- green/lime for the selected innings or player;
- cyan for comparison data;
- a crease line for a target or benchmark;
- ordered delivery events entering in source order.

Do not use an error colour simply because it matches a team kit.

---

## 15. Motion system

### 15.1 Motion character

**Sharp acceleration, controlled stop.**

Motion should make the interface feel responsive rather than decorative.

### 15.2 Timing

| Interaction            |   Duration |
| ---------------------- | ---------: |
| Hover / press feedback |  90–140 ms |
| Tooltip / dropdown     | 140–180 ms |
| Card / row entry       | 180–240 ms |
| Page transition        | 220–320 ms |
| Chart reveal           | 300–500 ms |
| Modal opening          | 220–280 ms |

### 15.3 Easing

```css
--ease-fast: cubic-bezier(0.2, 0.8, 0.2, 1);
--ease-hit: cubic-bezier(0.16, 1, 0.3, 1);
```

### 15.4 Signature animations

#### Score update

1. Old value moves up by no more than 4 px and fades.
2. New value enters from below.
3. The crease line flashes once.
4. Total duration stays below 500 ms.

#### Delivery insertion

A new delivery enters with:

- 6–8 px vertical movement;
- short opacity transition;
- no layout-blocking delay.

#### Wicket

Use one orange pulse or narrow strike.

Do not shake the screen or use confetti.

#### Page transition

Fade and move the primary content by no more than 8 px.

Do not move persistent navigation.

#### Chart reveal

The selected line may draw left-to-right once on first appearance.

Filtering or refreshing data should update promptly rather than replay a long entrance sequence.

### 15.5 Motion restrictions

Do not:

- bounce cards continuously;
- use decorative parallax behind data;
- stagger a dashboard for long periods;
- animate every value on every render;
- block interaction while an animation finishes;
- change layout dimensions significantly on hover.

### 15.6 Reduced motion

Respect the user’s reduced-motion preference:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 16. Accessibility

Accessibility is a project requirement and must be designed in from the start.

The team’s UI target is **WCAG 2.2 AA** unless a stricter project requirement supersedes it.

### 16.1 Required practices

- Verify text/background colour contrast.
- Provide a visible keyboard focus state.
- Prefer semantic HTML before adding ARIA.
- Keep interactive controls keyboard operable.
- Do not communicate state by colour alone.
- Provide text alternatives for meaningful images.
- Respect reduced-motion preferences.
- Maintain usable touch targets.
- Support browser zoom without loss of function.
- Preserve table and chart meaning on small screens.
- Test light and dark themes independently.

### 16.2 Colour notes

The muted light-theme text token has been darkened to `#627078` so it remains suitable for normal-size text against the Warm Canvas.

Boundary Orange is a brand accent on light surfaces, not a normal small-text colour.

Status colours should normally be paired with readable neutral text rather than used as the only text colour.

### 16.3 Focus treatment

Use a clearly visible 2 px focus ring with a 2 px offset.

Preferred rings:

- Day Match: Crease Green or Analysis Cyan.
- Night Match: Powerplay Lime or Review Cyan.

---

## 17. Iconography and imagery

### 17.1 Icons

Use:

- simple outline icons;
- consistent stroke weight;
- consistent view-box sizing;
- labels or accessible names for critical actions.

Avoid mixing unrelated filled, outline and illustration styles.

### 17.2 Cricket imagery

Prefer:

- real data;
- scorecards;
- field diagrams;
- delivery trajectories;
- the approved player mark;
- licensed authentic photography where useful.

Avoid:

- generic trophy graphics;
- crossed bats;
- decorative shields;
- fake 3D cricket balls;
- arbitrary stadium imagery;
- AI-generated players presented as real athletes.

### 17.3 Photography

When photography is used:

- preserve authentic colours;
- give overlaid text a solid or sufficiently opaque surface;
- avoid heavy colour grading that competes with data;
- do not place the logo over a face or visually complex focal point.

---

## 18. Interface writing

The product voice is direct, informed and calm.

Good:

```text
Explore matches
View delivery data
Compare innings
Export dataset
Submission awaiting review
12 events failed validation
```

Avoid:

```text
Dive into the action
Unleash next-level insights
Oops! Something went wrong
Your data journey starts here
```

### 18.1 Error copy

Error messages should state:

1. what failed;
2. where it failed;
3. what the user can do;
4. whether data was accepted or published.

Example:

```text
Delivery 43 is missing a striker identifier.
No events from this submission were published.
Add the identifier and submit the corrected file.
```

### 18.2 Cricket terminology

Use recognised cricket terminology accurately.

If a term is likely to be unfamiliar to a general user, explain it with supporting copy or a tooltip rather than replacing it with vague language.

---

## 19. CSS design tokens

Use semantic variables as the frontend implementation baseline.

```css
:root {
  --font-display: 'Barlow Condensed', sans-serif;
  --font-body: 'IBM Plex Sans', sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  --motion-fast: 120ms;
  --motion-standard: 200ms;
  --motion-page: 280ms;

  --ease-fast: cubic-bezier(0.2, 0.8, 0.2, 1);
  --ease-hit: cubic-bezier(0.16, 1, 0.3, 1);
}

:root,
:root[data-theme='light'] {
  color-scheme: light;

  --colour-canvas: #f5f2e9;
  --colour-surface: #fffdf7;
  --colour-surface-raised: #eee9dc;
  --colour-surface-soft: #f8f5ed;
  --colour-border: #d9d3c4;

  --colour-text: #102026;
  --colour-text-secondary: #52636a;
  --colour-text-muted: #627078;

  --colour-primary: #5d7e00;
  --colour-primary-ink: #ffffff;
  --colour-primary-soft: #dff0a7;

  --colour-brand: #e95a24;
  --colour-data-accent: #007f9e;

  --colour-success: #3a8f57;
  --colour-warning: #c98500;
  --colour-error: #d64251;

  --shadow-card: 0 8px 24px rgb(16 32 38 / 7%);
  --shadow-overlay: 0 18px 45px rgb(16 32 38 / 10%);
}

:root[data-theme='dark'] {
  color-scheme: dark;

  --colour-canvas: #08121b;
  --colour-surface: #101e2b;
  --colour-surface-raised: #162736;
  --colour-surface-soft: #0c1822;
  --colour-border: #263847;

  --colour-text: #f6f8f2;
  --colour-text-secondary: #b8c3cc;
  --colour-text-muted: #8ea0af;

  --colour-primary: #c7ff4a;
  --colour-primary-ink: #08121b;
  --colour-primary-soft: rgb(199 255 74 / 12%);

  --colour-brand: #ff6b35;
  --colour-data-accent: #20d5ff;

  --colour-success: #4ade80;
  --colour-warning: #fbbf24;
  --colour-error: #ff5a67;

  --shadow-card: 0 10px 30px rgb(0 0 0 / 18%);
  --shadow-overlay: 0 22px 60px rgb(0 0 0 / 28%);
}
```

### 19.1 Theme initialisation

Resolve the theme before the main application paints where practical to avoid a visible flash of the wrong theme.

Precedence:

```text
stored preference
→ operating-system preference
→ Day Match fallback
```

---

## 20. Implementation rules

- Components use semantic tokens rather than raw theme hex values.
- Theme selection belongs at application/provider level rather than inside individual cards.
- Shared component structure and behaviour remain identical across themes.
- New colours require a documented design reason.
- New animation patterns require review for consistency and reduced-motion behaviour.
- Use existing shared UI patterns before adding visually equivalent alternatives.
- User-facing changes must be checked for responsiveness and accessibility before being considered done.
- Brand assets must not contain secrets, runtime configuration or environment-specific URLs.
- The frontend must not use branding work as a reason to bypass the documented HTTP API boundary.

---

## 21. Anti-generic design checklist

Reconsider a design if it relies on several of the following:

- purple-to-blue SaaS gradients;
- floating glass cards;
- oversized pill buttons;
- decorative blobs;
- unexplained sparkles;
- generic trophies or shields;
- excessive icon use;
- lime text on every statistic;
- full-screen animation before useful content appears;
- fake AI sports imagery;
- identical card layouts for unrelated information;
- vague marketing copy;
- “Oops” error messages;
- inconsistent corner radii;
- many unrelated accent colours.

Stat’sTheGame should be recognisable through:

- the approved player logo;
- the orange apostrophe-bat;
- the lime ball and motion trail;
- Day Match and Night Match;
- scoreboard-inspired typography;
- the crease-line device;
- strong numeric hierarchy;
- event-first visualisation;
- restrained fast motion.

---

## 22. Review checklist

### Brand

- [ ] Product name is written correctly.
- [ ] Approved logo variant is used for the background.
- [ ] Orange apostrophe-bat remains recognisable.
- [ ] Logo clear space is preserved.
- [ ] Favicon has at least 14% transparent safe area.

### Theme

- [ ] Screen works in Day Match.
- [ ] Screen works in Night Match.
- [ ] Components use semantic tokens.
- [ ] Theme switching does not alter functionality.

### Layout

- [ ] Primary task is visually obvious.
- [ ] Data density is appropriate.
- [ ] Mobile layout remains usable.
- [ ] Numbers and table columns align consistently.

### Interaction

- [ ] Motion is purposeful and fast.
- [ ] Reduced-motion behaviour works.
- [ ] Loading, empty and error states exist.
- [ ] Keyboard focus is visible.

### Accessibility

- [ ] Colour contrast has been checked.
- [ ] Colour is not the sole state indicator.
- [ ] Interactive controls have accessible names.
- [ ] Charts retain meaning without animation.
- [ ] Touch and keyboard interaction have been considered.

### Project consistency

- [ ] Frontend data still flows through documented backend endpoints.
- [ ] No authoritative business rule has been moved into presentation code.
- [ ] Relevant tests and documentation are updated.
- [ ] Work follows the project issue, branch, review and merge process.
- [ ] AI assistance is recorded where required.

---

## 23. Change control

Changes to any of the following should be treated as a deliberate design decision rather than a casual component tweak:

- product name;
- logo composition;
- player pose;
- apostrophe-bat shape;
- lime ball or motion trail;
- primary theme palettes;
- typography families;
- core motion language.

For a material change:

1. record the proposed change in a Gitea issue;
2. explain the motivation;
3. attach design evidence or comparison where appropriate;
4. obtain normal team review;
5. update this document and affected assets in the same Pull Request where practical.

Do not claim that a visual change has been approved until the relevant team review has actually occurred.

---

## 24. AI declaration

The preceding document was generated, reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol]. Its approved status was recorded with the assistance of Codex[GPT-5.6 Sol].
