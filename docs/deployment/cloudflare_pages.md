# Deploying the Documentation

## Prerequisites

- Python
- MkDocs
- Cloudflare account

## Build

```bash
mkdocs build --strict
```

## Preview locally

```bash
mkdocs serve
```

## Deploy

1. Log in to Cloudflare.
2. Navigate to Workers & Pages.
3. Select the project.
4. Upload the contents of the generated `site/` directory.
5. Deploy.

The public documentation is available at:

https://sports-analytics-tool.pages.dev