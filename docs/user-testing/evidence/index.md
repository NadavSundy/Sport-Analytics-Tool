# Generated User-Testing Evidence

Sanitised evidence generated from the formal Sprint 2 feedback pipeline is published in the
`generated/` subdirectory. Each page is derived from validated, anonymised response JSON and keeps
the participant identifier, task outcomes, findings, and traceability only.

CI runs generation against the committed empty schema-valid input store and never accesses a
developer's OneDrive folder. For local feedback collection, copy the synchronised Power Automate JSON
files into the ignored input directory, then validate and generate evidence:

```bash
npm run retrieve:user-testing-feedback -- "path/to/Sport Analytics/User Testing/responses"
node scripts/user-feedback-ingestion.mjs testing/user-feedback/input
npm run generate:user-testing-evidence -- testing/user-feedback/input
```

Generated records complement the protocol's manual evidence; they do not replace facilitator consent
checks, follow-up decisions, issue creation, or retesting.
