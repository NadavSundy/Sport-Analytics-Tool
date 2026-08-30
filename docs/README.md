# Documentation site

The `docs/` directory contains the source Markdown for the public Stat'sTheGame documentation site. MkDocs Material builds these files into the generated `site/` directory, which is deployed to Cloudflare Pages.

## Responsibilities

- maintain public project, architecture, API, database, security, testing and deployment documentation;
- keep documentation aligned with the implemented repository state;
- provide the canonical developer setup and technology-stack guides; and
- build and validate the public documentation site without committing generated `site/` output.

## Prerequisites

From the repository root:

- Python 3.10 or later;
- the packages listed in `requirements-docs.txt`; and
- Node.js/npm only when deploying with Wrangler.

## Local setup

Create a virtual environment and install the documentation dependencies.

### Windows PowerShell

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-docs.txt
```

### macOS / Linux / Git Bash

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-docs.txt
```

If PowerShell policy prevents virtual-environment activation, use the virtual environment's Python executable directly rather than weakening machine security settings.

## Serve locally

From the repository root:

```bash
python -m mkdocs serve
```

The default preview is `http://127.0.0.1:8000`.

## Validate and build

Before a documentation Pull Request, run:

```bash
python -m mkdocs build --strict
```

The generated `site/` directory is build output and must not be committed as part of normal documentation changes.

## Deployment

The public documentation site is deployed to Cloudflare Pages. After a successful strict build, the documented manual deployment command is:

```bash
npx wrangler pages deploy site --project-name=sports-analytics-tool
```

Deployment credentials must be supplied through the approved Cloudflare/Gitea secret mechanism and must never be committed.

See:

- [Complete developer setup guide](development/setup.md) for full onboarding;
- [Technology stack and motivations](development/technology-stack.md) for selected tools and why they were chosen;
- [Cloudflare Pages deployment guide](deployment/cloudflare_pages.md) for documentation-site deployment; and
- [MkDocs configuration and navigation](../mkdocs.yml) for the documentation-site configuration.

## Theming

The site's colours, fonts, logo and favicon follow the [Stat'sTheGame brand guidelines](design/brand-guidelines.md):

- `mkdocs.yml` sets the Material `palette` (Day Match / Night Match), `font`, `logo` and `favicon`.
- `docs/stylesheets/extra.css` maps the brand's Day Match and Night Match tokens onto Material's `--md-*` CSS variables, and documents one deliberate contrast adjustment (see the comment above `--md-typeset-a-color`).
- `docs/javascripts/external-links.js` opens links that leave the documentation site (repository, third-party references) in a new tab with `rel="noopener noreferrer"`. Internal MkDocs navigation, in-page anchors, `mailto:` and `tel:` links are left untouched.

Run `python -m mkdocs build --strict` after any theming change and check both the light and dark toggle, and a narrow-viewport layout, before opening a Pull Request.

## AI Declaration

The preceding document was planned, generated, reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol]. The Theming section, and the branding/external-link implementation it describes, were added with the assistance of Claude[Claude Sonnet 5].
