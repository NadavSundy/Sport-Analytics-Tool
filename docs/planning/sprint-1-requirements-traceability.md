# Sprint 1 requirements traceability

| Document information | Details                                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Project              | Sport Analytics Tool                                                                                                    |
| Milestone            | Sprint 1                                                                                                                |
| Related issue        | #70                                                                                                                     |
| Purpose              | Trace the course-wide and Sport Analytics requirements to implementation, issues, Pull Requests and repository evidence |
| Status               | Sprint 1 close-out record                                                                                               |

## 1. Purpose

This document records the Sprint 1 requirements traceability baseline for the Sport Analytics Tool.

It supplements the detailed project backlog by mapping the externally defined project requirements to:

- their Sprint 1 implementation status;
- relevant Gitea issues;
- representative Pull Requests;
- implementation or documentation evidence; and
- known incomplete work.

The status recorded here describes the state reached during Sprint 1. It does not imply that every Basic, Intermediate or Advanced project requirement is complete.

Gitea remains authoritative for current issue and Pull Request state.

## 2. Status definitions

| Status                 | Meaning                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------ |
| Implemented            | The requirement has a working Sprint 1 implementation and supporting evidence.       |
| Implemented foundation | The required foundation exists, while later hardening or extension remains planned.  |
| Partial                | A meaningful portion is implemented, but part of the requirement remains incomplete. |
| Planned                | The requirement is intentionally scheduled for a later sprint.                       |

## 3. Course-wide requirements

| Requirement                                | Sprint 1 status        | Implementation and evidence                                                                                                                                                                                                                                                                               | Issues / representative PRs                                                  | Remaining work                                                                  |
| ------------------------------------------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Git-based version control                  | Implemented            | Repository uses Gitea with documented GitHub Flow adapted for Gitea, issue-linked branches, Conventional Commits, Pull Request review and protected `main` practices. See `docs/git-methodology.md`.                                                                                                      | #2, #7, #8; PR #3, PR #9                                                     | Continue applying the methodology consistently through later sprints.           |
| Responsiveness and accessibility           | Implemented foundation | Responsive public layouts, accessible component conventions and browser-based public journey validation are present. See `docs/design/frontend-component-baseline.md`, `docs/design/information-architecture-and-wireframes.md` and `evidence/user-testing/2026-08-23-issue-199-public-data-journeys.md`. | #56, #57, #199; PR #219, PR #224, PR #228                                    | Continue accessibility and responsive testing as additional features are added. |
| CI/CD                                      | Implemented foundation | Automated quality checks, Azure frontend/backend deployment workflows and Cloudflare Pages documentation deployment are configured. Azure monorepo workflow paths were repaired during Sprint 1.                                                                                                          | #10, #15, #17, #29, #69; PR #23, PR #41, PR #178                             | Continue deployment smoke verification and production hardening.                |
| Separate frontend and backend applications | Implemented            | React/Vite frontend and Express/TypeScript backend are maintained separately under `apps/frontend` and `apps/backend`, with shared contracts isolated in `packages/contracts`. See `docs/architecture/system-architecture.md`.                                                                            | #38; PR #42                                                                  | Maintain the boundary as the system grows.                                      |
| Team-designed handwritten API              | Implemented            | All application HTTP endpoints are implemented through the Express backend under `/api/v1`; generated Supabase Data API endpoints are not used. OpenAPI and shared API conventions are version controlled.                                                                                                | #58, #59; PR #94, PR #97                                                     | Expand the same API conventions to later-tier endpoints.                        |
| Authentication and security                | Implemented foundation | Supabase Auth provides managed identity and Google OAuth. The backend verifies identities and owns application roles and competition scopes. Sign-in, account lifecycle, password-recovery ownership and self-service deletion are documented and implemented.                                            | #14, #39, #44, #65, #66; PR #34, PR #100, PR #123, PR #160, PR #177, PR #186 | Continue security hardening and later review/publication workflows.             |
| Relevant external API integration          | Implemented            | Open-Meteo is called server-side through the handwritten `GET /api/v1/weather` endpoint with validation, timeout handling and safe upstream-error mapping. See `docs/api/weather.md` and `evidence/decisions/ADR-008-external-weather-api-integration.md`.                                                | #174; PR #210                                                                | Fixture-to-venue coordinate lookup and caching remain deferred.                 |
| Public documentation website               | Implemented            | MkDocs documentation is version controlled and deployed publicly through Cloudflare Pages at `https://sports-analytics-tool.pages.dev`.                                                                                                                                                                   | #11, #29; PR #22, PR #41                                                     | Maintain the site as implementation changes.                                    |

## 4. Sport Analytics Basic requirements

### 4.1 Event-derived statistics and correction model

| Requirement                                                                            | Sprint 1 status        | Implementation and evidence                                                                                                                                                                                                                  | Issues / representative PRs                     | Remaining work                                                                       |
| -------------------------------------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| Platform data is built from ordered fixture events rather than manually entered totals | Implemented            | Cricket deliveries are represented as ordered event data in PostgreSQL and exposed through the API. The event model is documented in `docs/database/schema.md`.                                                                              | #27, #67; PR #76, PR #79, PR #159               | Continue extending event handling for later ingestion modes.                         |
| Published fixture statistics are derived from event data                               | Implemented            | Fixture totals and participant batting/bowling statistics are derived from accepted deliveries. See `docs/statistics/fixture-statistics.md`, `docs/api/event-statistic-mapping.md` and `evidence/validation/issue-52-fixture-statistics.md`. | #52; PR #133                                    | Season, competition and career aggregates are later-tier requirements.               |
| Correcting an event updates every dependent statistic without manual re-entry          | Partial                | The schema preserves event provenance and the architecture defines correction history and recomputation, but the authorised correction workflow and dependent recomputation are not yet implemented.                                         | #27, #61; later correction work remains planned | Implement authorised event corrections, retained history and targeted recomputation. |
| Statistics are traceable to source events                                              | Implemented foundation | Fixture statistics are calculated from stored delivery events and submission provenance is retained.                                                                                                                                         | #51, #52; PR #134, PR #133                      | Expand provenance presentation when correction/version workflows are introduced.     |

### 4.2 Submission, validation and provenance

| Requirement                                                      | Sprint 1 status | Implementation and evidence                                                                                                                                                                                                                        | Issues / representative PRs                   | Remaining work                                                                                                  |
| ---------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Only approved submitters may submit data                         | Implemented     | Backend authorisation requires the `submitter` role and approved application state.                                                                                                                                                                | #43, #44, #45, #51; PR #123, PR #157, PR #134 | Maintain deny-by-default authorisation for later submission paths.                                              |
| Submitters operate within a defined competition scope            | Implemented     | Competition grants are server-owned and checked before submission acceptance.                                                                                                                                                                      | #43, #44, #45, #51; PR #137, PR #157, PR #134 | Extend scope checks to batch and correction workflows.                                                          |
| Submission is checked against the event schema before acceptance | Implemented     | Shared submission contracts and cricket-domain validation reject structurally or semantically invalid deliveries.                                                                                                                                  | #49, #50, #51; PR #142, PR #147, PR #134      | Extend the same validation to file and batch ingestion.                                                         |
| Rejected submissions explain what is wrong                       | Implemented     | Structured validation errors identify invalid fields/events instead of failing silently. See `docs/api/submissions.md` and `evidence/validation/issue-51-direct-event-submission.md`.                                                              | #50, #51; PR #147, PR #134                    | Maintain actionable errors for future batch-level rejection reports.                                            |
| Submission provenance identifies who supplied the events         | Implemented     | Accepted submissions retain application-user, competition and source provenance.                                                                                                                                                                   | #51; PR #134                                  | Extend provenance to corrections, reviews and releases.                                                         |
| Direct submission path                                           | Implemented     | Approved submitters can submit ordered delivery events through `POST /api/v1/submissions`.                                                                                                                                                         | #51, #53; PR #134, PR #148                    | Continue usability improvements as required.                                                                    |
| File-based submission                                            | Planned         | The Basic requirement permits submission either by file upload or directly to the platform. Sprint 1 implements the direct JSON submission path, so file upload is an additional planned ingestion path rather than a blocker to that requirement. | Future submission work                        | If retained in the backlog, implement file upload using the same event schema, validation and provenance rules. |

### 4.3 Public API and data access

| Requirement                                         | Sprint 1 status        | Implementation and evidence                                                                                                                                     | Issues / representative PRs           | Remaining work                                                                      |
| --------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------- |
| API is a primary product interface                  | Implemented            | Public and protected application functionality is exposed through the handwritten Express API and documented in OpenAPI.                                        | #47, #58, #59; PR #95, PR #94, PR #97 | Continue treating API contracts as first-class product behaviour.                   |
| Consumers can read fixtures                         | Implemented            | Anonymous competition, season and fixture resources are available through `/api/v1`.                                                                            | #47; PR #95                           | Continue enriching related-record summaries where useful.                           |
| Consumers can read ordered fixture events           | Implemented            | Accepted deliveries are exposed in deterministic occurrence order.                                                                                              | #67; PR #159                          | Later live/change-feed requirements remain separate.                                |
| Consumers can read derived fixture statistics       | Implemented            | Fixture and participant statistics are available through public API endpoints.                                                                                  | #52; PR #133                          | Wider aggregates are planned for Sprint 2.                                          |
| Collection requests support documented filtering    | Implemented            | Public-read endpoints expose documented query filters and readable filtering behaviour. See `docs/api/public-read.md`.                                          | #47, #194; PR #95, PR #211            | Expand filtering with later resources where required.                               |
| Large collections can be paged                      | Implemented            | Public collection contracts use documented cursor pagination and deterministic ordering.                                                                        | #47, #58; PR #95                      | Continue contract testing as collections grow.                                      |
| Identifiers are stable                              | Implemented foundation | Shared API conventions define stable opaque non-recycled identifiers, and public resources resolve through persistent database identifiers.                     | #58                                   | Preserve identifiers across later release/version work.                             |
| Analysts can export a filtered data slice as a file | Partial                | Export behaviour is documented in the architecture and roadmap but a filtered dataset export endpoint/file workflow is not implemented in the Sprint 1 product. | Planned Basic follow-up               | Implement filtered export before declaring the full Basic API requirement complete. |

## 5. Sprint 1 requirement review

The complete Basic, Intermediate and Advanced interpretation was reviewed with the stakeholder on
18 August 2026.

The stakeholder confirmed:

- the team's interpretation of the Basic requirements;
- the planned Sprint 2 timing for Intermediate requirements;
- the planned Sprint 3 timing for Advanced requirements; and
- the continued applicability of the course-wide requirements.

No requirement changes were requested during that review.

The stakeholder additionally requested that the full required T20 dataset be available by the next
meeting. The full import was subsequently recorded in `evidence/validation/issue-175-dataset-import.md`.
That request changed execution priority, not the project requirement set.

See `evidence/sprints/sprint-1/2026-08-18-stakeholder-meeting.md`.

## 6. Material requirement and architecture changes

| Date        | Source                                                                                                                    | Decision / change                                                                                                                                                                                                                              | Affected work                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 5 Aug 2026  | Lecturer/client written clarification retained in `evidence/decisions/2026-08-05-lecturer-ruling-supabase.md` and ADR-003 | Supabase may be used as hosted PostgreSQL provided generated Data API endpoints are not used. The team retained a handwritten Express API as the only application-data HTTP boundary.                                                          | Database hosting, backend connection, architecture, API boundary and compliance documentation.                            |
| 6 Aug 2026  | ADR-004, superseding ADR-002                                                                                              | Authentication changed from the initial Firebase proof to Supabase Auth with Google OAuth. Authentication continues to establish identity only; application roles remain backend-owned.                                                        | Frontend auth client, backend token verification, environment variables, authentication tests and security documentation. |
| 12 Aug 2026 | ADR-005                                                                                                                   | The PostgreSQL database moved to a Supabase project with sufficient storage because the original project could not accommodate the intended corpus. The application remained provider-neutral through `DATABASE_URL` and committed migrations. | Database configuration, developer environment, Azure configuration, ingestion planning and storage benchmarking.          |
| 18 Aug 2026 | Sprint 1 stakeholder requirements review                                                                                  | The stakeholder confirmed the team's Basic, Intermediate and Advanced interpretations and sprint timing with no requested requirement changes. Loading the complete T20 corpus became the immediate execution priority for the next meeting.   | Sprint planning and data-ingestion priority; no change to the requirement baseline.                                       |
| 19 Aug 2026 | ADR-007 / issue #191                                                                                                      | Public information architecture moved from technical-ID-oriented browsing toward readable cricket names, embedded related records and key information within three purposeful interactions.                                                    | Public API enrichment and frontend issues #192–#199.                                                                      |
| 20 Aug 2026 | ADR-008                                                                                                                   | Open-Meteo was selected as the course-required runtime external API integration and isolated behind `GET /api/v1/weather`.                                                                                                                     | Backend weather service/controller/router, tests, OpenAPI and public documentation.                                       |
| 21 Aug 2026 | ADR-009 to ADR-012 / issue #55                                                                                            | Later-tier cache, background-job, object-storage and live-ingestion designs were recorded with explicit adoption gates rather than being added prematurely to the Sprint 1 runtime.                                                            | Sprint 2/Sprint 3 architecture and future implementation planning; no Sprint 1 runtime services were added.               |

## 7. Known Sprint 1 limitations relevant to the requirements

The following gaps are intentionally recorded rather than presented as complete:

- authorised event correction and dependent-statistic recomputation are not yet implemented;
- the direct JSON submission path is implemented; a separate file-upload ingestion path remains planned but is not required where direct submission satisfies the Basic ingestion alternative;
- filtered dataset export is not yet implemented;
- season, competition and career aggregates belong to later-tier work;
- Open-Meteo currently accepts raw latitude and longitude rather than resolving a fixture venue automatically;
- weather responses are not cached;
- later review/publication, batch-ingestion, dataset-release and API-consumer controls remain planned for Sprint 2;
- the advanced custom-statistic, live-ingestion, temporal-query and change-feed capabilities remain planned for Sprint 3.

These limitations are consistent with the Sprint 1 goal of establishing a working Basic vertical slice
and strong project foundations rather than claiming later-tier completion.

## 8. Related planning and evidence

Detailed Sprint 1 work-to-issue mapping is maintained in:

- `docs/planning/project-backlog.md`

Architecture and implementation state are maintained in:

- `docs/architecture/system-architecture.md`
- `docs/development/technology-stack.md`
- `docs/api/overview.md`
- `docs/development/testing.md`

Sprint 1 process evidence includes:

- `evidence/sprints/sprint-1/2026-08-04-stakeholder-meeting.md`
- `evidence/sprints/sprint-1/2026-08-06-planning.md`
- `evidence/sprints/sprint-1/2026-08-06-standup.md`
- `evidence/sprints/sprint-1/2026-08-11-stakeholder-meeting.md`
- `evidence/sprints/sprint-1/2026-08-13-standup.md`
- `evidence/sprints/sprint-1/2026-08-18-stakeholder-meeting.md`
- `evidence/sprints/sprint-1/2026-08-20-standup.md`

## AI Declaration

The preceding document was planned, generated, reviewed and edited with the assistance of
ChatGPT-Web[GPT-5.6 Sol].
