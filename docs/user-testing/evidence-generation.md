# Evidence Generation

## Generate Evidence

Retrieve feedback files:

npm run retrieve:user-testing-feedback

Generate Markdown:

npm run retrieve:user-testing-feedback
npm run generate:user-testing-evidence -- testing/user-feedback/input

`rclone` uses `RCLONE_REMOTE` and `RCLONE_SOURCE` when set; otherwise it retrieves from
`wits-onedrive:Sport Analytics/User Testing/responses`.

Output:

docs/user-testing/evidence/generated/
