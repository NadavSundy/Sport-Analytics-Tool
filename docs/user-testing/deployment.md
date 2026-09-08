# User Testing Documentation Deployment

## Purpose

This document describes how Sprint 2 user-testing evidence is
transformed into Markdown documentation artifacts and included in the
published documentation site.

The workflow ensures that collected user feedback is validated,
converted into readable evidence, and deployed alongside the project
documentation.

---

## Documentation Pipeline Overview

    Microsoft Forms
            |
            v
    Power Automate
            |
            v
    Wits OneDrive JSON responses
            |
            v
    rclone retrieval
            |
            v
    testing/user-feedback/input/
            |
            v
    Evidence generation script
            |
            v
    Generated Markdown evidence
            |
            v
    MkDocs documentation build
            |
            v
    Published documentation site

---

## Evidence Generation

User-testing responses are stored as anonymised JSON files.

Example:

    Sport Analytics/
    └── User Testing/
        └── responses/
            ├── response_1.json
            └── response_2.json

The evidence generator validates responses against the user-testing
schema and generates Markdown evidence documents.

Run:

    npm run retrieve:user-testing-feedback
    npm run generate:user-testing-evidence -- testing/user-feedback/input

---

## Generated Evidence Output

Generated evidence is written into:

    docs/user-testing/evidence/generated/

Each generated document contains:

- tested workflow;
- tasks attempted;
- completion status;
- observations;
- positive findings;
- usability problems;
- severity classification;
- suggested improvements.

---

## MkDocs Integration

Generated Markdown evidence is stored inside the MkDocs documentation
source directory.

Because the generated evidence exists within the documentation tree, it
is automatically included during documentation builds.

---

## Documentation Build Process

The documentation site can be built locally using:

    mkdocs build

---

## CI/CD Documentation Deployment

The documentation deployment workflow performs:

    Checkout repository
            |
            v
    Install dependencies
            |
            v
    Build documentation
            |
            v
    Deploy MkDocs site

Documentation deployment configures `rclone` from a protected secret, retrieves anonymised feedback,
generates evidence, then includes the resulting documentation pages.

The deployment runner requires `rclone` and these repository secrets: `RCLONE_CONFIG`,
`RCLONE_REMOTE`, and `RCLONE_SOURCE`. The script defaults the latter two to `wits-onedrive` and
`Sport Analytics/User Testing/responses` when they are not set. `RCLONE_CONFIG` is written only to
the runner's private rclone configuration file and is never logged or committed.

---

## Reproducibility

The evidence generation process is reproducible because:

- feedback responses use a defined JSON schema;
- generated evidence follows a consistent Markdown template;
- generated artifacts are stored inside the documentation structure;
- documentation builds use the same MkDocs configuration.

---

## Privacy and Security

The pipeline stores only anonymised user-testing information.

The following information is excluded:

- participant names;
- email addresses;
- contact information;
- personally identifiable information.

Only anonymous participant identifiers such as `P01` are included in
generated evidence.
