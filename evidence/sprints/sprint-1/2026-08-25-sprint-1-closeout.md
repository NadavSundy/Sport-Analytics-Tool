# Sprint 1 Close-Out

**Sprint:** Sprint 1  
**Date:** 25 August 2026  
**Team:** Git Push Pray  
**Related Issue:** #71  
**Stakeholder Review:** 18 August 2026  
**Retrospective Format:** Asynchronous team reflection via WhatsApp

## Stakeholder Review

The final Sprint 1 stakeholder review was completed with Terence Nkoua Mackyta
on 18 August 2026.

The team reviewed the Basic, Intermediate and Advanced requirements and the
planned implementation roadmap. The stakeholder confirmed the team's
interpretation and did not request changes to the agreed requirements or
planned direction.

The stakeholder requested that the full required T20 dataset be available for
the following stakeholder meeting.

See:

`evidence/sprints/sprint-1/2026-08-18-stakeholder-meeting.md`

## Incomplete / Carried-Over Work

Work that was not complete at the end of Sprint 1 is not being represented as
completed Sprint 1 work.

Remaining work has been returned to the backlog, moved to Sprint 2, or remains
blocked with a documented reason where appropriate.

This includes:

- remaining Basic functionality identified in the Sprint 1 requirements
  traceability and validation evidence;
- environment-dependent CI/CD work that cannot yet be completed because of the
  documented infrastructure limitation; and
- any other incomplete Sprint 1 work that remains visibly tracked in Gitea.

## Known Defects and Limitations

Known defects and limitations are documented through the Sprint 1 requirements
traceability, validation evidence and relevant Gitea issues.

In particular:

- CI/CD is not yet fully operational because of the documented
  environment/infrastructure blocker.
- Incomplete functionality is not being represented as Done.
- Remaining Basic work is explicitly carried into Sprint 2 where applicable.
- Environment and deployment configuration still require further
  standardisation and verification during Sprint 2.

## Team Reflection

The Sprint 1 retrospective was conducted asynchronously through the team's
WhatsApp group on 25 August 2026.

An asynchronous reflection was used because of assessment commitments
surrounding the Sprint 1 milestone. Each team member was asked to provide:

1. one thing that worked well;
2. one thing that was difficult; and
3. one thing the team should improve in Sprint 2.

Responses were received from all six team members.

## Individual Responses

### Ben Swartz

**What worked well**

The schema was derived from measured properties of the source data rather than
assumptions.

Eight important properties were identified while parsing approximately
3.2 million deliveries. These included repeated printed ball numbers, names
not being reliable identities, and four innings occurring in 99 matches.

Determining these properties before finalising the schema prevented several
reasonable-looking but incorrect design assumptions. The resulting corpus
imported without a single rejection, and fixture 729307 validated against its
published scorecard on the first attempt.

**What was difficult**

It was sometimes difficult to determine what work had already been completed
or was close to completion.

Ben began work on issues #49, #50 and #193 before discovering that another team
member had already completed or nearly completed the work. This resulted in
duplicated effort.

**Sprint 2 improvement**

Team members should briefly claim intended work in the group chat before
starting, even if this is only a one-line message.

---

### Shayna Unterslak

**What worked well**

The team worked well together and established a strong foundation for the
project, especially around the API, database, testing and documentation.

**What was difficult**

Working without CI/CD being fully operational was difficult because the team
had to rely more heavily on manually running and verifying checks and tests.

**Sprint 2 improvement**

Issues should be kept smaller and more focused so that work is easier to
complete, review and merge during the sprint.

---

### Gabriel Raz

**What worked well**

The overall project structure and formatting were neat, consistent and
accessible. This made it easier to pick up and work on areas of the project
that Gabriel had not initially developed himself.

The database upload also went smoothly and was completed without any major
issues.

**What was difficult**

Gabriel initially worked with Firebase Authentication rather than the agreed
Supabase Authentication provider. This meant that some work had to be changed
once the correct authentication provider was established.

Account deletion also caused difficulty because of confusion around the
Supabase private and publishable keys. Resolving this required discussion with
the team and reorganisation of the backend environment files so that the
correct keys and configuration were used.

**Sprint 2 improvement**

Improve efficiency and planning by making work more complete before opening a
Pull Request.

Implementations should be tested and finalised as far as practical before
review so that PRs are cleaner, easier for the team to review and require fewer
follow-up changes.

> Gabriel's original WhatsApp response referred to "Sprint 3". As the
> retrospective question specifically requested an improvement for Sprint 2,
> the improvement has been recorded here as a Sprint 2 action.

---

### Liora Rosenberg

**What worked well**

The team made strong progress on the project foundation, including the backend
API, database integration, frontend structure, weather API integration,
testing and technical documentation.

**What was difficult**

Getting the different parts of the system working together was challenging,
particularly API integration, database functionality and testing edge cases.

**Sprint 2 improvement**

The team should improve integration between features earlier in the sprint,
test new functionality as it is developed, and communicate blockers sooner so
that integration and deployment are not left until the end.

---

### Dean Feldman

**What worked well**

The team's use of Git, Gitea issues and Pull Requests worked well.

The team also established a strong foundation with the frontend/backend
structure, authentication and authorisation, database, API, testing and
deployment.

**What was difficult**

Getting the different environments and services working together was
difficult.

The team experienced problems involving ports, CORS, Supabase configuration,
environment variables, Azure deployment and CI/CD, which required significant
time to debug.

**Sprint 2 improvement**

The team should standardise and better document its environment and deployment
configuration.

Integration, CI/CD and deployment should also be tested earlier so that
problems are identified during development rather than near the end of the
sprint.

---

### Nadav Sundy

**What worked well**

The Git workflow and task breakdown worked well.

Using clearly defined issues, feature branches and Pull Requests allowed
multiple team members to work in parallel while keeping the codebase organised.
This provided a strong development structure going into the remainder of the
project.

**What was difficult**

A major difficulty was managing dependencies between frontend and backend
development.

Some frontend features could not be completed until the corresponding backend
functionality had been implemented, which occasionally caused work to become
blocked.

There were also instances where issues grew beyond their original scope. This
scope creep created additional integration work and required significant time
to bring the different pieces together and ensure that they worked correctly
as a complete system.

**Sprint 2 improvement**

The team should define and control issue scope more carefully and identify
dependencies between frontend and backend tasks before development begins.

Larger issues should be divided into smaller, more focused pieces, and
dependent backend work should be prioritised where necessary.

This should reduce blockers and make integration more predictable, leaving
more time for testing and refinement.

**AI Declaration supplied with response**

> The preceding text was planned and generated with the assistance of
> ChatGPT-Web[GPT-5.6 Sol].

## Consolidated Reflection

### What Worked Well

A clear theme across the team responses was that Sprint 1 established a strong
technical and organisational foundation for the project.

The team made substantial progress across:

- the frontend and backend structure;
- the handwritten API;
- PostgreSQL database integration;
- authentication and authorisation;
- external API integration;
- automated testing;
- deployment infrastructure;
- technical documentation; and
- the Git/Gitea issue, branch and Pull Request workflow.

The Git workflow was particularly valuable because it allowed multiple team
members to work in parallel while keeping changes structured and traceable.

The repository structure was also considered clear enough for team members to
work on areas that they had not originally developed themselves.

Another important success was the evidence-based approach used when designing
the cricket data schema. Analysing the actual source data before finalising the
schema helped avoid incorrect assumptions and contributed to a successful
large-scale data import.

### What Was Difficult

The strongest common difficulty was integration and dependency management
across different parts of the system.

Although individual components could often be developed independently,
problems became more difficult when connecting:

- the frontend and backend;
- the API and database;
- authentication and authorisation;
- local and deployed environments;
- automated testing;
- CI/CD; and
- Azure deployment.

Frontend/backend dependencies sometimes caused work to become blocked when one
part of a feature depended on functionality that had not yet been completed.

CI/CD not being fully operational also increased the amount of manual
verification required.

Other difficulties included:

- environment and configuration inconsistencies;
- Supabase authentication and key configuration;
- API/database integration and edge cases;
- issue scope growing during implementation;
- duplicated work where ownership or current progress was unclear;
- deployment and CI/CD debugging; and
- Pull Requests sometimes requiring repeated follow-up changes.

## Sprint 2 Improvements

The retrospective identified several practical improvements for Sprint 2.

### 1. Communicate intended work before starting

Where there is a risk of overlap, team members should briefly state in the team
group chat which issue they intend to begin.

This should reduce duplicated work and make current ownership clearer.

### 2. Keep issues smaller and control scope

Larger pieces of work should be divided into smaller, focused issues before
development where appropriate.

Issue scope should also be controlled during implementation so that additional
work does not silently expand an issue beyond what was originally planned.

### 3. Identify dependencies earlier

Frontend/backend and other technical dependencies should be identified during
planning and backlog refinement.

Where one issue blocks another, the dependency should be recorded and the
required foundational work prioritised appropriately.

### 4. Test and integrate earlier

Features should be tested and integrated as they are developed rather than
leaving integration, CI/CD or deployment verification until the end of the
sprint.

### 5. Communicate blockers sooner

Environment, dependency and integration blockers should be communicated as soon
as they are identified so that they can be resolved or explicitly tracked.

### 6. Improve environment and deployment consistency

Environment and deployment configuration should be standardised and clearly
documented so that team members are working with consistent settings.

### 7. Improve Pull Request readiness

Where practical, implementations should be tested and brought close to
completion before opening a Pull Request.

This should make PRs easier to review and reduce unnecessary follow-up changes.

## Primary Sprint 2 Process Improvement

The main process improvement identified from the retrospective is:

> **Keep work smaller and more clearly coordinated, identify dependencies
> earlier, and integrate/test continuously throughout the sprint.**

In practice, the team will:

- communicate intended issue work before starting where overlap is possible;
- split oversized issues before they move into `Ready`;
- record important dependencies during planning and backlog refinement;
- prioritise blocking backend or foundational work where necessary;
- keep Pull Requests focused;
- test functionality while it is being developed;
- communicate blockers earlier; and
- perform integration and deployment verification earlier in the sprint.

These actions are intended to reduce duplicated work and scope creep, minimise
blockers, simplify reviews and identify integration problems before the end of
the sprint.

## Sprint 2 Actions

The retrospective produces the following concrete process actions for Sprint 2:

| Action                          | How it will be applied                                                              |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| Communicate intended work       | Team members briefly announce intended issue work where overlap is possible.        |
| Keep issues focused             | Oversized issues are split before entering `Ready` where appropriate.               |
| Identify dependencies           | Frontend/backend and other dependencies are recorded before dependent work begins.  |
| Test during development         | Relevant tests are added and run while features are implemented.                    |
| Raise blockers early            | Blockers are communicated and recorded as soon as they are identified.              |
| Improve PR readiness            | PRs are kept focused and tested as completely as practical before review.           |
| Improve environment consistency | Configuration and setup documentation are kept aligned with the actual application. |

## Sprint 1 Milestone Decision

The team considers the reviewed Sprint 1 repository state ready to be captured
as the Sprint 1 milestone once:

- this close-out evidence is reviewed and merged;
- all work intended for the Sprint 1 milestone is merged to `main`;
- incomplete and blocked work is correctly classified;
- known defects and limitations are documented;
- required checks pass on the final `main` commit, except for any explicitly
  documented external infrastructure blocker; and
- the exact final `main` commit is confirmed.

The final reviewed commit will then be tagged with the annotated tag
`sprint-1`.

## Milestone Verification

Before creating the `sprint-1` tag:

- [ ] Sprint 1 stakeholder review evidence is complete.
- [ ] Sprint 1 retrospective is complete.
- [ ] Sprint 1 close-out evidence is reviewed.
- [ ] All intended Sprint 1 documentation changes are merged.
- [ ] Incomplete and blocked work is correctly classified.
- [ ] Known defects and limitations are documented.
- [ ] Required checks pass on the final `main` commit, except for explicitly
      documented infrastructure limitations.
- [ ] The final `main` commit is confirmed as the reviewed Sprint 1 state.

## Milestone Tag

**Tag:** `sprint-1`  
**Commit:** Pending final merge and verification  
**Tag Status:** Pending

The annotated milestone tag will identify the exact reviewed Sprint 1
repository state.

## Related Evidence

- Gitea issue #71
- Sprint 1 Gitea milestone
- `evidence/sprints/sprint-1/2026-08-18-stakeholder-meeting.md`
- Sprint 1 planning record
- Sprint 1 stand-up records
- Sprint 1 requirements traceability
- Sprint 1 validation evidence
- Relevant Sprint 1 Pull Requests
- `sprint-1` annotated milestone tag once created

## Retrospective Evidence

The original retrospective responses were collected asynchronously through the
team WhatsApp group on 25 August 2026.

The responses were consolidated into this repository record so that the Sprint
1 retrospective forms part of the project's authoritative methodology
evidence.

## AI Declaration

> The preceding document was planned and edited with the assistance of
> ChatGPT-Web[GPT-5.6 Sol].
