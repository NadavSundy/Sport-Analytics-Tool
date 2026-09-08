# User Testing Pipeline Troubleshooting

## Evidence generation fails with schema validation errors

Example:

User-testing feedback validation failed:
participant has an invalid format

Cause:

The JSON response does not match the expected schema.

Check:

- participant format must be P01, P02, etc.
- severity must be S1, S2, S3, or S4.
- required fields must exist.

---

## Generated evidence contains old responses

Cause:

Old JSON files are still present in `testing/user-feedback/input/`.

Solution:

Remove outdated local imports, then rerun retrieval from the required OneDrive response directory.

---

## OneDrive responses are missing locally

Cause:

The OneDrive client has not synchronised the Wits folder.

Solution:

1. Open OneDrive.
2. Confirm the Wits account is synchronised.
3. Wait for the response JSON file to appear locally.

---

## Power Automate creates invalid JSON

Cause:

The Compose action is not producing the expected schema.

Expected format:

{
"schemaVersion": "1.0",
"responses": []
}

Verify:

- Compose output.
- Create file content uses Compose output.
- Severity values match S1-S4.

---

## Evidence generation command

Run:

npm run retrieve:user-testing-feedback -- "<response-directory>"
npm run generate:user-testing-evidence -- testing/user-feedback/input
