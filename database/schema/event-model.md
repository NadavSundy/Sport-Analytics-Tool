# Initial event data model direction

The sport-specific model is not final until the team and stakeholder select the sport and agree on its event schema.

The initial domain should distinguish at least:

- competition and season;
- competitor, athlete, and/or team;
- fixture, match, race, or heat;
- ordered event records within a fixture;
- submission source and submitter scope;
- validation and review state;
- correction and audit history;
- statistic definition and version;
- derived statistic result and provenance; and
- dataset release and export job.

Statistics must be derived from accepted event records rather than entered as independent totals. Stable identifiers and traceability must be designed before implementation.

## Direct submission provenance

Authenticated direct JSON submissions extend the model without changing legacy file-ingestion rows:

- `submission.fixture_id`, `schema_version`, `event_count`, `submitted_by`, and `received_at`
  identify the fixture, validated contract, size, submitter, and acceptance time;
- `delivery.submission_id` links every accepted delivery to that submission;
- `delivery.source_event_id` retains the globally unique client event UUID and prevents replay;
- `delivery.submission_event_ordinal` retains the exact zero-based order of the submitted array; and
- the delivery's `innings_id` links it to the fixture, while the submission links it to the submitter.

The API validates all event references and repeats the approval/scope check inside the same
transaction that inserts the submission, deliveries, wickets, and fielders. Any failure rolls back the
whole write, so rejected input leaves no partial provenance or event rows.
