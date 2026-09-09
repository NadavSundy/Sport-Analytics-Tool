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

Automatic documentation deployment is part of `Sport Analytics CI`. Published documentation changes are first validated by the change-aware CI flow; after merge, the `main` commit must pass the required `quality` job before `deploy_docs` can publish to Cloudflare Pages.

The planner requests documentation deployment for production MkDocs inputs such as `docs/**`, `mkdocs.yml` and `requirements-docs.txt`. Application-only, evidence-only and CI-only changes do not redeploy the documentation site merely because a commit reached `main`.

On an automatic deployment, CI:

1. checks out the validated `main` commit;
2. validates `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`;
3. installs the root workspace dependencies;
4. installs the documentation dependencies;
5. builds the deployable site using:

   ```bash
   python -m mkdocs build --strict
   ```

6. deploys the generated `site/` directory using:

   ```bash
   npx wrangler pages deploy site --project-name=sports-analytics-tool
   ```

7. smoke checks the public documentation home page.

The strict MkDocs build is intentionally present both in validation and deployment: validation proves the source before the quality decision, while deployment must create the generated `site/` artifact on its own runner before Wrangler can publish it.

`.gitea/workflows/deploy-docs.yml` remains available as a manual `workflow_dispatch` recovery or redeployment path. It does not run independently on every docs push to `main`, preventing a docs publish from racing ahead of the shared post-merge quality and deployment decision.

The workflow authenticates using repository Actions secrets and never commits Cloudflare credentials:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The Cloudflare API token should be limited to the permissions required to deploy the `sports-analytics-tool` Pages project.

User-testing evidence is retained through the normal repository workflow under `evidence/user-testing/`. Documentation deployment does not retrieve feedback from OneDrive or generate user-testing evidence dynamically, so a given repository commit builds the same documentation source regardless of external feedback storage state.

Manual Wrangler deployment using the commands above remains a local/fallback option when required.
