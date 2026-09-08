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
- `../../scripts/retrieve-user-testing-feedback.mjs` retrieves the restricted Power Automate export
  from the Wits OneDrive source through Microsoft Graph.
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

The Graph retrieval command writes JSON files to the ignored local input directory:

```bash
npm run retrieve:user-testing-feedback
```

Validate and generate evidence from that input directory:

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

## Microsoft Graph retrieval

The retrieval script uses the OAuth 2.0 client-credentials flow against Microsoft Graph. It resolves
the Wits OneDrive source and retrieves JSON files from:

```text
Sport Analytics/User Testing/responses
```

No SharePoint HTML page is fetched or scraped. The script writes valid JSON only to
`testing/user-feedback/input/`, which is ignored by Git. It leaves schema validation and evidence
generation to the existing commands above.

### Azure app registration and permissions

Create an Azure (Microsoft Entra ID) app registration in the Wits tenant, create a client secret,
and grant Microsoft Graph **Application** permission `Sites.Selected`. An administrator must grant
tenant consent and grant that application read access to the source SharePoint site. `Sites.Read.All`
also works but is broader than required and should not be used unless the team has formally approved
the broader access.

Store these only as repository Actions secrets or transient local shell environment variables; never
commit them or add them to a tracked environment file:

- `MICROSOFT_TENANT_ID`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`

For local retrieval, set the three variables in the active shell from the approved secret store, then
run `npm run retrieve:user-testing-feedback`. Do not paste their values into terminal transcripts,
documentation, fixtures, or repository files. Authentication failures, missing folders, download
failures, and malformed JSON stop before any evidence page is generated.

## Power Automate JSON input

Each retrieved JSON file must be either one response object or the response-store envelope. Every
response requires these fields:

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
