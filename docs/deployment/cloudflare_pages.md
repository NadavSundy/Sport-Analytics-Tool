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

The evidence-generation step retrieves the approved anonymised Power Automate export through
Microsoft Graph. Configure these as repository Actions secrets; do not commit their values or add
them to a tracked `.env` file:

- `MICROSOFT_TENANT_ID`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`

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
4. obtains a short-lived Microsoft Graph access token with the configured client credentials, then
   retrieves JSON files from `Sport Analytics/User Testing/responses` without logging credentials,
   response content, or filenames;
5. validates the response files and generates sanitised Markdown pages in
   `docs/user-testing/evidence/generated/`;
6. installs the documentation dependencies;
7. builds the deployable site using:

   ```bash
   python -m mkdocs build --strict
   ```

8. deploys the generated `site/` directory using:

   ```bash
   npx wrangler pages deploy site --project-name=sports-analytics-tool
   ```

9. smoke checks the public documentation home page.

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

The Azure app registration requires Microsoft Graph Application permission `Sites.Selected`, tenant
admin consent, and a read grant for the Wits SharePoint site. Missing feedback-source configuration,
authentication failures, missing folders, download failures, malformed JSON, and schema validation
failures stop the deployment before MkDocs runs. Error messages name the failure stage but do not
print secret values, response contents, source identifiers, filenames, or access tokens.

Manual Wrangler deployment using the commands above remains a local/fallback option when required.
