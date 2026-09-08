# Sprint 2 user-testing feedback store

This directory is the canonical, sanitised storage layer for formal Sprint 2 user-testing
responses. It supports the protocol in
[`docs/testing/user-testing-protocol.md`](../../docs/testing/user-testing-protocol.md); it does not
replace the human facilitator's observations, consent checks, finding decisions, or retesting record.

## Files

- `responses.json` is the committed response store. It intentionally begins empty: no participant
  data is invented for this repository.
- `schema.json` is the versioned JSON Schema for normalised responses.
- `../../scripts/validate-user-feedback.mjs` validates a response store against the schema without
  adding a runtime dependency.

Validate the committed store from the repository root with:

```bash
node scripts/validate-user-feedback.mjs
```

Pass a normalised candidate file explicitly before replacing the committed store:

```bash
node scripts/validate-user-feedback.mjs path/to/sanitised-responses.json
```

## Privacy boundary

Only anonymous participant identifiers such as `P01` are accepted. The schema rejects unrecognised
fields, so `name`, `email`, phone-number, credential, and Microsoft Forms metadata fields cannot be
stored accidentally. Free-text observations still require a facilitator privacy review: do not enter
names, email addresses, passwords, tokens, API keys, or other identifying information.

Never commit a raw Microsoft Forms CSV export. Forms may include respondent identity and timestamps
that are outside this storage contract. Keep the original export in the team's approved restricted
location and commit only the reviewed, normalised JSON response data.

## Microsoft Forms CSV preparation

Configure the Form to avoid collecting names or email addresses. The facilitator must supply the
anonymous `Participant ID` before import; an importer must never derive it from a respondent name,
email address, or Microsoft Forms record ID.

Normalise one Forms row into one object in `responses.json` using this mapping:

| Forms column or task group               | Store field                                        |
| ---------------------------------------- | -------------------------------------------------- |
| Participant ID                           | `participantId`                                    |
| Role                                     | `role` (`public`, `submitter`, or `administrator`) |
| Session date                             | `sessionDate` in `YYYY-MM-DD` format               |
| Task ID, outcome, observations, findings | one object in `tasks`                              |
| Six protocol post-test questions         | `postTestResponses`                                |
| Import method                            | `importSource: "microsoft_forms_csv"`              |

Drop Forms columns such as `Name`, `Email`, `Start time`, and `Completion time`; they have no field
in the schema. Convert wide task-question columns into the `tasks` array before validation. The
schema's `x-microsoft-forms-csv` metadata records the required and excluded CSV columns for a future
import command.

## Response shape

```json
{
  "schemaVersion": "1.0",
  "responses": []
}
```

Populate the array only with real, reviewed, anonymised sessions that satisfy `schema.json`.
