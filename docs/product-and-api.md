# Product & API

This is the product-facing entry point for Stat'sTheGame. Start here when you want to understand what
the platform exposes, use the handwritten HTTP API, submit event data, inspect derived statistics or
work with dataset outputs.

## Product capabilities

| Goal                                  | Start here                                                                 | Detailed reference                                                                |
| ------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Understand the API surface            | [API overview](api/overview.md)                                            | [Final API audit](api/final-audit.md) and [OpenAPI specification](api/openapi.md) |
| Browse public cricket records         | [Public read API](api/public-read.md)                                      | [Sport domain definition](requirements/sport-domain-definition.md)                |
| Submit accepted event data            | [Direct event submissions](api/submissions.md)                             | [Submission field mapping](api/submission-field-mapping.md)                       |
| Upload season/back-catalogue data     | [Batch ingestion receipt API](api/batches.md)                              | [Season-upload contract](api/season-upload-contract.md)                           |
| Understand derived fixture statistics | [Fixture statistic calculations](statistics/fixture-statistics.md)         | [Event-to-statistic mapping](api/event-statistic-mapping.md)                      |
| Understand participant aggregates     | [Participant aggregate calculations](statistics/participant-aggregates.md) | [Event model](database/schema.md)                                                 |
| Export data or retrieve releases      | [Dataset exports](data/dataset-exports.md)                                 | [Batch submission packages](data/batch-submission-packages.md)                    |
| Use consumer API controls             | [Consumer API keys, limits and quotas](api/consumer-keys.md)               | [API versioning](api/versioning.md)                                               |
| Inspect weather integration           | [Weather API](api/weather.md)                                              | [Security overview](security/overview.md)                                         |
| Trace accepted data and revisions     | [Provenance and audit API](api/provenance.md)                              | [Database architecture guide](database/guide.md)                                  |

## Public API path

For a new API consumer, the recommended order is:

1. [API overview](api/overview.md) for conventions and the implemented route surface.
2. [OpenAPI specification](api/openapi.md) for the authoritative request/response contract and the
   public API Explorer route.
3. [Public read API](api/public-read.md) for filters, pagination and cricket resources.
4. [Consumer API keys, rate limits and quotas](api/consumer-keys.md) when using managed consumer
   access.
5. [API versioning and deprecation](api/versioning.md) for compatibility expectations.

Contract-level verification is documented separately in
[OpenAPI contract testing](api/contract-testing.md).

## Submission and publication path

For a submitter or reviewer, start with the workflow that matches the data source:

- [Direct event submissions](api/submissions.md) for scoped direct delivery submission and
  correction.
- [Batch ingestion receipt API](api/batches.md) for staged upload, validation, review and
  publication.
- [Season-upload contract](api/season-upload-contract.md) and
  [Batch submission packages](data/batch-submission-packages.md) for package/reference details.

The API pages describe externally visible behaviour. The underlying persistence and worker design
are documented under [Architecture & Data](architecture-and-data.md).

## Statistics, exports and provenance

Published totals are derived from accepted event data rather than entered as independent totals. Use
[Fixture statistic calculations](statistics/fixture-statistics.md) and
[Participant aggregate calculations](statistics/participant-aggregates.md) for calculation behaviour,
then [Dataset exports](data/dataset-exports.md) for JSON/CSV slices and versioned release artefacts.

When you need to understand _why_ a value exists, use the
[Provenance and audit API](api/provenance.md), [event-to-statistic mapping](api/event-statistic-mapping.md)
and [event model](database/schema.md) rather than treating an aggregate as a separate source of truth.

## Detailed reference

The following pages remain available as specialist reference without occupying the first level of
navigation:

- [Shared contracts](api/contracts.md)
- [Submission field mapping](api/submission-field-mapping.md)
- [Event-to-statistic mapping](api/event-statistic-mapping.md)
- [Season-upload contract](api/season-upload-contract.md)
- [Batch submission packages](data/batch-submission-packages.md)
- [Cricsheet data source](data/cricsheet.md)

## AI Declaration

The product/API documentation hub and progressive-disclosure structure were planned and drafted with
the assistance of ChatGPT-Web[GPT-5.6 Sol].
