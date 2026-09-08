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

## rclone cannot retrieve OneDrive responses

Cause:

`rclone` is unavailable, its Wits remote is not configured, or the configured source contains no JSON files.

Solution:

1. Install `rclone` and configure the `wits-onedrive` remote.
2. Set `RCLONE_REMOTE` or `RCLONE_SOURCE` only when the defaults are not correct.
3. Confirm `Sport Analytics/User Testing/responses` contains anonymised JSON response files.

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

npm run retrieve:user-testing-feedback
npm run generate:user-testing-evidence -- testing/user-feedback/input
