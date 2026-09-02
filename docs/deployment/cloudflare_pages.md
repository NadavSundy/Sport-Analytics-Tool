# Deploying the Documentation

## Prerequisites

- Python
- Node.js and npm
- A Cloudflare account
- Wrangler (run using `npx`)

## Install Documentation Dependencies

```bash
python -m pip install -r requirements-docs.txt
```

## Build the Documentation

Build the MkDocs site in strict mode to ensure there are no broken links or configuration errors.

```bash
python -m mkdocs build --strict
```

## Preview Locally

To preview the documentation before deployment:

```bash
python -m mkdocs serve
```

Open your browser at:

```
http://127.0.0.1:8000
```

## Deploy

Wrangler can authenticate either by logging in interactively or by using a Cloudflare API token.

Deploy the generated `site/` directory:

```bash
npx wrangler pages deploy site --project-name=sports-analytics-tool
```

For automated deployments, authentication should be provided using the following environment variables or repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Public Documentation

Cloudflare Pages Project:

```
sports-analytics-tool
```

Public documentation URL:

https://sports-analytics-tool.pages.dev

## Automated Deployment

Documentation deployment is automated by the `Sport Analytics - Deploy Docs` Gitea Actions workflow at `.gitea/workflows/deploy-docs.yml`. The workflow runs on every push to `main` that changes `docs/**`, `mkdocs.yml`, `requirements-docs.txt`, or the workflow file itself, and can also be triggered manually with `workflow_dispatch`.

On each run, the workflow:

1. Checks out the repository.
2. Validates that the required Cloudflare secrets are configured, failing fast if either is missing.
3. Installs the documentation dependencies.
4. Builds the documentation using:

   ```bash
   python -m mkdocs build --strict
   ```

5. Installs the root workspace dependencies (so `wrangler` is available via `npx`).
6. Deploys the generated `site/` directory using Wrangler:

   ```bash
   npx wrangler pages deploy site --project-name=sports-analytics-tool
   ```

7. Smoke checks the deployed documentation home page to confirm the site is reachable and serving current content.

The workflow authenticates using the following repository Actions secrets, which must be configured under the Gitea repository settings and are never committed to the repository:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The Cloudflare API token should be limited to the permissions required to deploy the `sports-analytics-tool` Pages project.

Manual deployment using the steps above remains available as a fallback and for local verification before opening a Pull Request.