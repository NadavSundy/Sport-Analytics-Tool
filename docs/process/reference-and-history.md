# Reference & Historical Records

This page provides access to detailed technical references, historical planning records and operational
material that remain useful for traceability but do not need to occupy the primary documentation path.

The pages listed here have not been removed from the documentation set. They remain available as
supporting references and historical evidence.

## Architecture and data reference

- [System architecture and development roadmap](../architecture/system-architecture.md)
- [Batch ingestion pipeline](../architecture/batch-ingestion-pipeline.md)
- [Event model](../database/schema.md)
- [Entity relationships](../database/erd.md)
- [Database access and transactions](../database/access.md)
- [Batch persistence](../database/batch-persistence.md)
- [Sport domain definition](../requirements/sport-domain-definition.md)
- [Cricsheet data source](../data/cricsheet.md)

## API contracts and mapping reference

- [OpenAPI contract testing](../api/contract-testing.md)
- [Shared contracts](../api/contracts.md)
- [Provenance and audit API](../api/provenance.md)
- [Season-upload contract](../api/season-upload-contract.md)
- [Submission field mapping](../api/submission-field-mapping.md)
- [Event-to-statistic mapping](../api/event-statistic-mapping.md)
- [Batch submission packages](../data/batch-submission-packages.md)
- [API versioning and deprecation](../api/versioning.md)

## Security reference

- [Privacy and retention](../security/privacy-retention.md)
- [Password recovery ownership](../security/password-recovery.md)
- [Authentication provider comparison](../security/auth-provider-comparison.md)

## Testing procedures and acceptance reference

- [User testing protocol](../testing/user-testing-protocol.md)
- [User testing task bank](../testing/user-testing-task-bank.md)
- [Intermediate ingestion acceptance](../testing/intermediate-ingestion-acceptance.md)
- [Local CI](../development/local-ci.md)
- [Reference fixtures](../development/reference-fixtures.md)

## Design and UX reference

- [Brand guidelines](../design/brand-guidelines.md)
- [Frontend component baseline](../design/frontend-component-baseline.md)
- [Information architecture and wireframes](../design/information-architecture-and-wireframes.md)

## Deployment and operations reference

- [Azure application hosting reference](../deployment/azure.md)

- [Azure hosting decision record](../adr/0003-azure-hosting.md)
- [Documentation deployment](../deployment/cloudflare_pages.md)
- [Hosting capacity and recovery strategy](../deployment/hosting-capacity-and-recovery-strategy.md)
- [Azure deployment recovery history](../deployment/azure-app-service-recovery.md)
- [Private object storage operations](../deployment/object-storage-operations.md)
- [Dedicated CI runner operations](../deployment/runner-operations.md)

## Final API gap-analysis records

These focused records preserve the analysis used to close or bound selected final API work. They are
retained for implementation traceability rather than presented as primary product documentation.

- [API deprecation lifecycle gap analysis](../validation/issue-608-api-deprecation-lifecycle-gap-analysis.md)
- [API usage gap analysis](../validation/issue-610-api-usage-gap-analysis.md)
- [Advanced aggregate-query gap analysis](../validation/issue-611-advanced-aggregate-query-gap-analysis.md)

## Historical planning and Sprint records

These pages preserve the state of the project at the time they were written. They should not be read
as if later implementation decisions were already known during earlier Sprints.

- [Project backlog and milestone plan](../planning/project-backlog.md)
- [Sprint 1 requirements traceability](../planning/sprint-1-requirements-traceability.md)
- [Sprint 2 requirements traceability](../planning/sprint-2-requirements-traceability.md)
- [Sprint 3 requirements traceability](../planning/sprint-3-requirements-traceability.md)
- [Team meeting transcripts](team-meeting-transcripts.md)

The current final-state assessment is maintained separately in
[Final Requirements and Rubric Traceability](../planning/final-requirements-rubric-traceability.md).

## Development reference

- [Dependencies](../development/dependencies.md)
- [Gitea issue export](../development/gitea-issue-export.md)
- [Git methodology](../git-methodology.md)

## Retained evidence

The repository-level evidence collection remains authoritative for retained Sprint, validation,
stakeholder, user-testing, decision and AI records.

Use [Project Records & Evidence](index.md) as the normal evidence entry point rather than duplicating
those records into this appendix.

## AI Declaration

The reference and historical-record index was planned and drafted with the assistance of
ChatGPT-Web[GPT-5.6 Sol].
