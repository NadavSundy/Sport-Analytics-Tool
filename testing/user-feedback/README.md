# Sprint 2 user-testing feedback store

This directory is the canonical, sanitised storage layer for formal Sprint 2 user-testing Power
Automate responses. It supports the protocol in
[`docs/testing/user-testing-protocol.md`](../../docs/testing/user-testing-protocol.md); it does not
replace the human facilitator's observations, consent checks, finding decisions, or retesting record.

## Files

- `responses.json` is the committed response store. It intentionally begins empty: no participant
  data is invented for this repository.
- `schema.json` is the versioned JSON Schema for normalised Power Automate responses.
- `../../scripts/validate-user-feedback.mjs` validates a response store against the schema without
  adding a runtime dependency.
- `input/responses.json` is the committed empty, schema-valid response store. Other retrieved files
  in `input/` remain ignored local imports.
- `../../scripts/retrieve-user-testing-feedback.mjs` uses `rclone` to copy the configured Wits
  OneDrive response folder into `input/`, then validates the imported files.
- `../../scripts/generate-user-testing-evidence.mjs` ingests validated response files and writes
  sanitised MkDocs evidence pages under `docs/user-testing/evidence/generated/`.
- `tsconfig.json` applies the repository TypeScript checker to the executable ESM scripts without
  adding a separate transpilation runtime.

Validate the committed store from the repository root with:

```bash
node scripts/validate-user-feedback.mjs
```

Pass a normalised candidate file explicitly before replacing the committed store:

```bash
node scripts/validate-user-feedback.mjs path/to/sanitised-responses.json
```

Retrieve JSON response files into the ignored input directory:

```bash
npm run retrieve:user-testing-feedback
```

Validate and generate evidence from that directory:

```bash
node scripts/user-feedback-ingestion.mjs testing/user-feedback/input
npm run generate:user-testing-evidence -- testing/user-feedback/input
npm run test:user-feedback
```

## Privacy boundary

Only anonymous participant identifiers such as `P01` are accepted. The schema rejects unrecognised
fields, so `name`, `email`, phone-number, credential, and Power Automate/OneDrive metadata fields cannot be
stored accidentally. Free-text observations still require a facilitator privacy review: do not enter
names, email addresses, passwords, tokens, API keys, or other identifying information.

Never commit a raw OneDrive export that includes respondent identity or timestamps. Keep the original
export in the team's approved restricted location and commit only reviewed, normalised JSON response
data.

## Power Automate JSON input

The generator reads local files synchronised by Power Automate from:

```text
OneDrive/Sport Analytics/User Testing/responses/*.json
```

Set `RCLONE_REMOTE` and `RCLONE_SOURCE` to override the defaults `wits-onedrive` and `Sport
Analytics/User Testing/responses`. CI configures the `rclone` remote from the protected
`RCLONE_CONFIG` secret, retrieves the same source, then generates evidence before the MkDocs build.
No response data or credentials are committed.

Each JSON file must be either one response object or the response-store envelope. Every response
requires these fields:

| Input field        | Requirement                                           |
| ------------------ | ----------------------------------------------------- |
| `participant`      | Anonymous identifier matching `P01`, `P02`, and so on |
| `workflow`         | Tested workflow                                       |
| `tasksAttempted`   | Tasks attempted by the participant                    |
| `completionStatus` | Recorded completion status                            |
| `observations`     | Sanitised observation text                            |
| `positiveFindings` | Positive findings                                     |
| `problems`         | Usability problems                                    |
| `severity`         | Protocol severity `S1` to `S4`                        |
| `suggestions`      | Suggested improvements                                |

`traceability` is optional. When included, it may contain only `giteaIssue`,
`implementationCommit`, and a repository-relative `retestingEvidence` path. Name, email, phone,
credential, and Microsoft Forms metadata fields are rejected.

## Generated evidence

The generator redacts supported email-address, phone-number, and credential patterns in free-text
fields before writing Markdown. It emits one page per imported response with the workflow, tasks,
completion status, observations, comments, positive findings, usability problems, severity
classification, suggested improvements, and traceability.

## Response shape

```json
{
  "schemaVersion": "1.0",
  "responses": []
}
```

Populate the array only with real, reviewed, anonymised sessions that satisfy `schema.json`.
