# Sprint 2 User Testing Evidence

## Purpose

This section documents the user testing feedback pipeline used for Sprint 2 evaluation.

The pipeline converts anonymised Microsoft Forms responses into generated Markdown evidence published through the documentation site.

## Pipeline Overview

Microsoft Forms
|
v
Power Automate
|
v
OneDrive JSON responses
|
v
rclone retrieval
|
v
Evidence generator
|
v
MkDocs documentation

## Requirements

Before generating evidence:

- Microsoft Forms responses must exist.
- Power Automate must export schema-compliant JSON.
- Response files must be available in the OneDrive response directory.
- `rclone` must be configured for the Wits OneDrive remote.

## Generated Evidence

Generated evidence is stored at:

docs/user-testing/evidence/generated/

Each Markdown file represents an anonymised user-testing session.

## Privacy

The pipeline does not store:

- participant names;
- email addresses;
- contact information.

Only anonymised participant identifiers are retained.

Example:

P01
P02
