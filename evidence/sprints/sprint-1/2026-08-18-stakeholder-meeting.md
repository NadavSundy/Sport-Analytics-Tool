# Stakeholder Meeting

**Date:** 18 August 2026  
**Project:** Sport Analytics Tool  
**Team:** Git Push Pray  
**Stakeholder:** Terence Nkoua Mackyta

## Purpose

This meeting served as the final Sprint 1 stakeholder review. The team used the meeting to confirm its interpretation of the complete Sport Analytics Tool brief, including the Basic, Intermediate and Advanced requirements, as well as the planned implementation timing for later sprints.

## Requirements Review

The team reviewed the full set of project requirements with the stakeholder.

### Basic Requirements

The team confirmed its interpretation of the Basic requirements, including:

- professional T20 cricket as the selected sport;
- fixtures represented as matches and event data represented as ordered deliveries;
- statistics derived from event data rather than manually entered totals;
- correction of event data updating dependent statistics;
- approved submitters with defined submission scope;
- provenance linking submitted data and published statistics back to the relevant submission and source events;
- direct and file-based submission;
- schema validation before submission acceptance;
- useful validation feedback when a submission is rejected;
- a handwritten public API as a core product interface;
- public access to fixtures, events and derived statistics;
- filtering, pagination and stable identifiers; and
- export of filtered data.

The stakeholder confirmed that the team's interpretation of the Basic requirements was appropriate and did not request any changes.

### Intermediate Requirements

The team explained that the Intermediate requirements are planned for Sprint 2. These include:

- batch ingestion of seasons and back catalogues;
- staging and validation of batches before publication;
- reporting of accepted and rejected records;
- idempotent batch resubmission;
- resumable batch processing;
- review before publication;
- validation of impossible or conflicting data;
- correction history and auditability;
- season, career and competition-wide aggregates;
- selective recomputation of affected statistics;
- validation of derived statistics against known reference results;
- realistic-scale performance testing and a stated response-time target;
- API versioning;
- API consumer keys;
- rate limits and quotas;
- caching of repeated reads; and
- reproducible, versioned dataset releases with schema information, field descriptions and checksums.

The stakeholder confirmed that the team's interpretation and planned Sprint 2 timing were appropriate.

### Advanced Requirements

The team explained that the Advanced requirements are planned for Sprint 3. These include:

- analyst-defined custom statistics over the event schema;
- evaluation of custom statistics across historical data;
- validation, containment and resource control for custom definitions;
- versioning of statistic definitions;
- live event ingestion;
- handling of late and out-of-order events;
- replayable event processing;
- traceability to both source events and statistic-definition versions;
- historical "as-of" statistics;
- comparison between dataset releases;
- aggregate API queries;
- asynchronous processing of large API requests;
- change feeds for consumers;
- API deprecation and backwards-compatibility handling;
- contract testing;
- consumer usage tracking;
- anomaly detection;
- reconciliation of conflicting submitters; and
- propagation of accepted corrections through dependent aggregates and dataset releases.

The stakeholder confirmed that the team's interpretation and planned Sprint 3 timing were appropriate.

## Course-Wide Requirements

The team also confirmed that the course-wide requirements remain part of the project plan and will continue to be implemented and maintained throughout the remaining sprints. These include:

- Git-based version control;
- responsiveness and accessibility;
- CI/CD;
- separate frontend and backend applications;
- a team-designed, handwritten HTTP API;
- established authentication supporting the required account lifecycle;
- integration with a relevant external API service; and
- a publicly available documentation website.

No concerns or requested changes were raised by the stakeholder.

## Stakeholder Feedback and Decisions

- The stakeholder confirmed that the team's interpretation of the Basic, Intermediate and Advanced requirements was correct.
- The stakeholder did not request changes to the planned implementation approach or sprint timing.
- The stakeholder confirmed that the team may continue with its planned roadmap.
- For the next stakeholder meeting, the stakeholder would like the full required T20 dataset to be available in the system.

## Data Loading Follow-Up

The full T20 dataset is not yet loaded into the project database. The remaining data import is expected to take approximately **20 hours** to complete.

The team will begin/continue the data-loading process immediately so that the dataset is available for the next stakeholder meeting.

This is an execution task rather than a change in project requirements.

## Actions

- Begin/continue loading the remaining T20 data into the project database.
- Verify that the full dataset has loaded successfully before the next stakeholder meeting.
- Continue implementation of the remaining Basic requirements.
- Prepare Sprint 2 work around completion of remaining Basic functionality and the Intermediate tier.
- Retain this meeting record as evidence that the complete Basic, Intermediate and Advanced requirement set was reviewed with the stakeholder.

## Outcome

The complete project brief was reviewed with the stakeholder. The stakeholder confirmed the team's interpretation of the Basic, Intermediate and Advanced requirements and the planned implementation timing, with no requested changes.

**AI Declaration:** The preceding document was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
