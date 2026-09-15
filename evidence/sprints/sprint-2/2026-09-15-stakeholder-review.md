# Sprint 2 Stakeholder Review — Retrospective Record

## Context

The Sprint 2 review was conducted in person with the project tutor / marking reviewer.

This document was prepared retrospectively after the meeting to preserve the feedback and resulting actions in the repository evidence trail.

The meeting was not formally recorded and contemporaneous minutes were not taken. The points below therefore record the team's shared recollection of the feedback and the actions taken in response.

## Feedback received

### Google authentication presentation

The Google sign-in flow was functional, but the presentation of the managed OAuth login needed improvement.

The reviewer specifically raised the need for clearer Google sign-in presentation and appropriate Google branding.

### Database documentation and motivation

The existing database documentation needed to be consolidated and strengthened.

The reviewer highlighted the need to explain not only the schema and deployment arrangement, but also the motivation for the database design and why the selected schema was appropriate for the project.

### Statistics / analytics presentation

The application exposed many calculated values, but the statistical experience did not yet communicate enough meaningful cricket insight.

The reviewer feedback indicated that the frontend should move beyond displaying many individual numbers and provide clearer analytical context.

### Frontend organisation and flow

The review identified opportunities to improve the overall frontend structure and navigation so that the product flows more logically between features and roles.

## Evaluation and Sprint 3 response

The feedback was accepted and converted into explicit Sprint 3 work:

- #579 — `docs(database): consolidate schema, deployment and database design motivation`
- #580 — `enhancement(auth): use official Google branding and clear managed OAuth sign-in`
- #581 — `enhancement(frontend): restructure navigation, tabs and role journeys for coherent flow`
- #582 — `feat(statistics): turn public statistics into meaningful cricket analytics`
- #513 — `Improve fixture overview with cricket match context and useful summary information`

The associated user-facing changes will be validated through:

- #601 — navigation, authentication and frontend user-feedback gate
- #602 — public statistics and fixture analytics user-feedback gate

## Separation from later technical audit

The ingestion, dataset-reproducibility and other correctness issues identified after the Sprint 2 review were found through a separate internal technical audit.

They were not raised by the tutor / marking reviewer during this in-person review and are not attributed to stakeholder feedback.

## AI Declaration

The preceding document was reviewed and edited with the assistance of:

`ChatGPT-Web[GPT-5.6 Sol]`
