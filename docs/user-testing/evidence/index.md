# Generated User-Testing Evidence

Sanitised evidence generated from the formal Sprint 2 feedback pipeline is published in the
`generated/` subdirectory. Each page is derived from validated, anonymised response JSON and keeps
the participant identifier, task outcomes, findings, and traceability only.

For local feedback collection and CI, `rclone` retrieves the synchronised Power Automate JSON files
from Wits OneDrive into the ignored input directory, then validates and generates evidence:

```bash
npm run retrieve:user-testing-feedback
node scripts/user-feedback-ingestion.mjs testing/user-feedback/input
npm run generate:user-testing-evidence -- testing/user-feedback/input
```

Generated records complement the protocol's manual evidence; they do not replace facilitator consent
checks, follow-up decisions, issue creation, or retesting.
