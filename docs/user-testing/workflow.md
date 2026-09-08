# Sprint 2 User Testing Workflow

## Overview

User testing feedback is collected through Microsoft Forms and transformed into generated Markdown evidence.

The workflow consists of:

Microsoft Forms
|
v
Power Automate
|
v
OneDrive response storage
|
v
rclone retrieval
|
v
JSON schema validation during evidence generation
|
v
Markdown evidence generation
|
v
MkDocs documentation deployment

## Data Collection

The Microsoft Form collects:

- tested workflow;
- tasks attempted;
- completion status;
- observations;
- positive findings;
- usability problems;
- severity classification;
- suggested improvements.

Responses are anonymised using participant identifiers:

Example:

P01
P02

## Response Storage

Power Automate exports responses as JSON files:

Sport Analytics/
└── User Testing/
└── responses/
├── response_1.json
└── response_2.json

## Evidence Generation

The repository script:

npm run retrieve:user-testing-feedback
npm run generate:user-testing-evidence -- testing/user-feedback/input

converts validated responses into Markdown:

docs/user-testing/evidence/generated/

Generated evidence contains:

- workflow tested;
- tasks attempted;
- observations;
- findings;
- severity;
- suggested improvements.
