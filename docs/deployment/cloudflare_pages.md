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

## Future Automated Deployment

Once a Gitea Actions runner is available, the documentation deployment can be automated by:

1. Checking out the repository.
2. Installing the documentation dependencies.
3. Building the documentation using:

   ```bash
   python -m mkdocs build --strict
   ```

4. Deploying the generated `site/` directory using Wrangler.
5. Using the following repository secrets:

   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

No Cloudflare credentials or API tokens should be committed to the repository.