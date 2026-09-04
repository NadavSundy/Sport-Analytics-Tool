# Shared batch processing

`@sport-analytics/batch-processing` contains server-side batch-ingestion logic that must be identical
between the HTTP API and the separately deployed worker. It is deliberately infrastructure-light and
must not import source code from `apps/`.

The first shared boundary is the authoritative package reference resolver. It performs bounded,
set-based PostgreSQL reads for competition, season, fixture, innings, team and participant references
and returns explicit resolved, unresolved or ambiguous outcomes with provenance. Both the backend and
issue #278 worker import this same implementation instead of maintaining parallel resolver logic.

Build it after the public contracts package:

```text
npm run build --workspace=@sport-analytics/contracts
npm run build --workspace=@sport-analytics/batch-processing
```

## AI Declaration

This package extraction and guide were generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
