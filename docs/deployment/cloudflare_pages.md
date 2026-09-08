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

The evidence-generation step does not use OneDrive credentials in CI. It runs against the committed,
empty schema-valid response store under `testing/user-feedback/input/`, so deployment verifies the
same generation path without accessing a developer's local OneDrive folder.

## Public Documentation

Cloudflare Pages Project:

```
sports-analytics-tool
```

Public documentation URL:

https://sports-analytics-tool.pages.dev

## Automated Deployment

Automatic documentation deployment is part of `Sport Analytics CI`. Published documentation changes
are first validated by the change-aware CI flow; after merge, the `main` commit must pass the required
`quality` job before `deploy_docs` can publish to Cloudflare Pages.

The planner requests documentation deployment for production MkDocs inputs such as `docs/**`,
`mkdocs.yml` and `requirements-docs.txt`. Application-only, evidence-only and CI-only changes do not
redeploy the documentation site merely because a commit reached `main`.

On an automatic deployment, CI:

1. checks out the validated `main` commit;
2. validates `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`;
3. installs the root workspace dependencies;
4. validates the committed feedback input and generates sanitised Markdown pages in
   `docs/user-testing/evidence/generated/`;
5. installs the documentation dependencies;
6. builds the deployable site using:

   ```bash
   python -m mkdocs build --strict
   ```

7. deploys the generated `site/` directory using:

   ```bash
   npx wrangler pages deploy site --project-name=sports-analytics-tool
   ```

8. smoke checks the public documentation home page.

The strict MkDocs build is intentionally present both in validation and deployment: validation proves
the source before the quality decision, while deployment must create the generated `site/` artifact on
its own runner before Wrangler can publish it.

`.gitea/workflows/deploy-docs.yml` remains available as a manual `workflow_dispatch` recovery or
redeployment path. It no longer runs independently on every docs push to `main`, preventing a docs
publish from racing ahead of the shared post-merge quality and deployment decision.

The workflow authenticates using repository Actions secrets and never commits Cloudflare credentials:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The Cloudflare API token should be limited to the permissions required to deploy the
`sports-analytics-tool` Pages project.

Malformed committed feedback input and evidence-generation failures stop the deployment before MkDocs
runs. Local OneDrive synchronisation remains a developer workflow and does not require CI secrets.

Manual Wrangler deployment using the commands above remains a local/fallback option when required.
