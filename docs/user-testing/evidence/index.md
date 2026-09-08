# Generated User-Testing Evidence

Sanitised evidence generated from the formal Sprint 2 feedback pipeline is published in the
`generated/` subdirectory. Each page is derived from validated, anonymised response JSON and keeps
the participant identifier, task outcomes, findings, and traceability only.

CI retrieves the approved restricted OneDrive source with repository secrets and never retains raw
exports in the repository. Run the repository validator and generator against a local
OneDrive-synchronised response folder, then review the output before committing it:

```bash
node scripts/user-feedback-ingestion.mjs "path/to/Sport Analytics/User Testing/responses"
node scripts/generate-user-testing-evidence.mjs "path/to/Sport Analytics/User Testing/responses"
```

Generated records complement the protocol's manual evidence; they do not replace facilitator consent
checks, follow-up decisions, issue creation, or retesting.
