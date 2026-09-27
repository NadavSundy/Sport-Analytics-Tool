# Sprint 2 Close-Out

**Sprint:** Sprint 2
**Date:** 15 September 2026
**Team:** Git Push Pray
**Related Issue:** #298
**Retrospective Format:** Asynchronous team reflection via WhatsApp
**Milestone Status:** Sprint 2 closed and milestone tagged

## Stakeholder Review

The Sprint 2 stakeholder review was completed in person with the project tutor / marking reviewer.

The meeting was not formally recorded and contemporaneous minutes were not taken. A retrospective record was therefore prepared immediately after the review to preserve the team's shared recollection of the feedback and the resulting Sprint 3 actions.

The review considered the implemented Sprint 2 product, supporting documentation and the overall user experience.

The main improvement areas raised were:

- clearer Google authentication presentation and appropriate Google branding;
- stronger and more consolidated database documentation, including schema, deployment and design motivation;
- more meaningful cricket statistics and analytical context rather than primarily presenting collections of calculated values; and
- improved frontend organisation, navigation and flow.

These findings were evaluated and converted into explicit Sprint 3 work:

- #579 — database documentation and design motivation;
- #580 — Google OAuth branding and sign-in presentation;
- #581 — frontend navigation and role journeys;
- #582 — meaningful cricket analytics; and
- existing #513 — fixture overview and cricket match context.

User-facing improvements will be validated through the Sprint 3 feature-level user-feedback gates #601 and #602.

A fuller retrospective record of the stakeholder feedback is retained later in this close-out record.

The separate post-review technical audit identified additional ingestion, correctness and reproducibility issues. Those findings were produced internally and are deliberately not attributed to the stakeholder review.

The final Sprint 2 stakeholder close-out review is still pending at the time
this record is being prepared.

The final review will consider:

- the implemented Sprint 2 functionality;
- consolidated formal user-testing findings and integration decisions;
- known defects and limitations;
- remaining Sprint 2 carry-over;
- the Sprint 2 requirements and rubric traceability record maintained under
  #420; and
- the final repository state proposed for the Sprint 2 milestone tag.

Formal human user testing is owned by #271 and the associated testing workstreams
#416, #417 and #418.

This close-out does not create a second independent user-testing exercise.
Instead, the stakeholder close-out will review the consolidated findings and
accepted, deferred and rejected decisions from that work.

This section will be updated once the final stakeholder close-out has been
completed.

## Incomplete / Carried-Over Work

Work that was not complete at the Sprint 2 boundary is not being represented as completed Sprint 2 work.

The remaining work has been explicitly retained in Gitea and classified as Sprint 3 carry-over or Sprint 3 follow-up work.

### Existing work carried into Sprint 3

The following existing issues remain open and have been incorporated into the Sprint 3 plan:

- **#329 — Upgrade Vite/Vitest toolchain to resolve remaining esbuild development-server advisory**
- **#513 — Improve fixture overview with cricket match context and useful summary information**
- **#562 — Move dataset release publication to asynchronous worker processing**
- **#563 — Migrate backend API from Azure App Service to Azure Container Apps**
- **#564 — Move frontend from Azure App Service to static hosting**
- **#565 — Add production-scale deployment and dataset release acceptance testing**
- **#566 — Document hosting capacity, Azure quota recovery and deployment strategy**
- **#571 — bug(submissions): approved submitters cannot submit a new fixture that does not already exist**

These issues remain explicitly visible rather than being represented as completed Sprint 2 functionality.

### Additional Sprint 3 work identified during close-out

The final internal audit also identified additional Basic / Intermediate correctness and reproducibility work.

These findings are represented by the dedicated Sprint 3 issues created after the audit, including #583–#597.

They were identified after the Sprint 2 stakeholder review and therefore form part of the Sprint 3 technical plan rather than retrospectively changing the stakeholder feedback record.

## Known Defects and Limitations

Known defects and limitations remain documented through Gitea issues, the Sprint
2 requirements and rubric traceability record, formal user-testing evidence,
acceptance evidence and relevant Pull Requests.

Important close-out limitations include:

- some defects and integration problems were only exposed once complete user
  journeys were exercised against the integrated or deployed system;
- the season-scale publication workflow did not initially meet its required
  performance target;
- corrective work was completed, but the final deployed production-scale
  verification was not completed before the initial milestone close-out;
- infrastructure and deployment constraints identified during Sprint 2 require
  further work during Sprint 3;
- some formal testing and close-out evidence was completed later in the sprint
  than intended;
- open Sprint 2 work is not being represented as Done; and
- known defects remain visible in the bug tracker until they are resolved and
  verified.

## Team Reflection

The Sprint 2 retrospective was conducted asynchronously through the team's
WhatsApp group on 15 September 2026.

Each team member was asked to provide:

1. what went well in Sprint 2;
2. what did not go well or caused problems;
3. what the team should continue doing in Sprint 3;
4. what the team should change or improve in Sprint 3; and
5. one specific action for Sprint 3.

Responses were received from the team and consolidated below.

## Individual Responses

### Shayna Unterslak

**What worked well**

The team completed a large amount of work during Sprint 2, particularly around
testing, bug fixing and getting functionality working in the deployed system
rather than only locally.

Issue tracking and supporting evidence also improved significantly.

**What did not go well**

Too much integration, testing and documentation accumulated near the end of the
sprint, making the final days unnecessarily stressful.

Several bugs only became visible once complete workflows were tested against the
live or integrated system, meaning functionality that appeared nearly complete
still required significant work.

**What should continue**

Continue using small, clear issues and Pull Requests, testing functionality
properly before closing issues, and recording bugs when they are identified
rather than ignoring or working around them.

**What should change**

Features should be tested end-to-end and against the deployed system earlier in
the sprint.

Evidence and documentation should also be maintained as work is completed
rather than requiring a large close-out exercise at the end.

**Sprint 3 action**

Introduce a cut-off before the end of the sprint where major new feature work
stops and the team's focus moves to integration, bugs, testing, documentation
and polish.

---

### Dean Feldman

**What worked well**

The team made strong progress on the core product, particularly submissions,
batch review, testing, user feedback and getting more of the system working
end-to-end.

**What did not go well**

Several bugs were discovered late in the sprint, particularly around UI state,
batch/reviewer workflows and CI/environment behaviour.

This made the end of the sprint more rushed.

**What should continue**

Continue using the bug tracker properly, formal user testing, and strengthening
automated and end-to-end testing.

**What should change**

Full user journeys should be tested earlier instead of discovering integration
problems close to the deadline.

The team should also avoid adding unnecessary new scope before existing issues
are stabilised.

**Sprint 3 action**

Prioritise fixing and stabilising core workflows before moving onto polish,
accessibility, performance and remaining advanced functionality.

---

### Nadav Sundy

**What worked well**

The team's use of the issue and bug trackers improved significantly during
Sprint 2.

Team members became more consistent about creating issues, linking work to them,
and using the trackers to manage bugs and feature work.

The development process also improved after CI/CD was introduced.

A local command for running the relevant test suite and the addition of a
dedicated CI runner helped developers identify failures earlier and reduced the
feedback time from CI.

**What did not go well**

A large number of defects were discovered during formal user testing in
functionality that had appeared complete.

This showed that some features had not been exercised thoroughly enough by the
developer before being pushed or merged.

The submission workflow was especially difficult because it depended on many
backend components working together.

Individual parts could be developed and tested independently, while some
problems only became visible once the complete workflow was integrated.

**What should change**

Developers should take greater responsibility for properly testing their own
feature before considering it ready for review.

The relevant local CI command should be run and the main user flows and
important edge cases should be manually exercised before a Pull Request is
considered ready to merge.

Features with multiple dependencies should also have their full integration
path identified and exercised earlier.

---

### Ben Swartz

**What worked well**

Formal user testing produced useful results.

External participants identified a significant number of findings and several
were fixed and retested during Sprint 2 rather than only being recorded.

The bug tracker was also used meaningfully, with issues triaged by severity and
linked to the Pull Requests that fixed them.

The team also improved how it validated automated tests.

In several cases, functionality was deliberately broken to confirm that the
test protecting it would actually fail.

Measuring the real cricket corpus before making design decisions also continued
to be valuable and influenced implementation decisions.

**What did not go well**

The team found examples of tests that passed without meaningfully testing the
behaviour they were intended to protect.

Examples included tests that asserted hand-written SQL without invoking the
real function, assertions that protected the existing bug rather than the
desired behaviour, and configuration tests that passed because they matched a
library default.

This demonstrated that green CI did not always provide the level of confidence
expected.

**What should continue**

Continue deliberately validating important tests, using evidence from the real
dataset when making design decisions, and conducting user testing with people
outside the development team.

**What should change**

Milestone close-out work should begin earlier rather than being concentrated on
the final day.

Deployment visibility should also improve so that the team can identify exactly
which build and commit is running in the deployed environment.

**Sprint 3 action**

Improve backend deployment verification so that deployment automation waits for
the deployment to complete and verifies the health of the resulting service
before reporting success.

---

### Liora Rosenberg

**What worked well**

Sprint 2 delivered a substantial portion of the Intermediate feature set,
including batch staging, asynchronous processing, idempotency, review gating,
conflict detection, corrections and aggregates.

The team maintained a useful test-to-fix-to-retest loop and formal user testing
directly resulted in product improvements.

Process discipline also improved through stakeholder approvals, stand-ups and
traceable issue/PR linkage.

**What did not go well**

The season-scale publication workflow did not meet the required performance
target during its initial test.

Although corrective work was completed, the deployed retest was not completed
before close-out.

Submitter-side user testing was also not completed as early or as extensively as
intended.

Environment and access problems caused additional delays.

**What should continue**

Continue task-based user testing with users who have different levels of domain
familiarity.

Continue recording known defects and limitations openly and using stand-ups to
resolve blockers quickly.

**What should change**

Scale and performance testing should happen earlier in the sprint.

User-testing sessions should also be scheduled sooner so that findings can be
acted upon before close-out.

Environment and access requirements should be identified before dependent work
begins.

**Sprint 3 action**

Run the outstanding deployed season-scale verification early in Sprint 3 so
that any remaining performance or correctness problems are identified before
the next milestone close-out.

---

### Gabriel Raz

**What worked well**

The team made strong progress on the core product, including batch review,
fixture and statistics functionality, testing, database work and frontend/backend
integration.

**What did not go well**

The team encountered integration and environment issues involving testing,
local services and CI.

Some issues also required more fixes and rework than expected, which slowed
development.

**What should continue**

Continue working through clearly defined issues, using separate branches and
Pull Requests, manually testing changes before merging, and adding automated
tests for new functionality and bug fixes.

**What should change**

Development time and limited AI resources should be used more efficiently.

Larger issues should be planned properly, relevant context should be kept
focused, and larger implementations should be broken into smaller steps rather
than trying to solve everything at once.

**Sprint 3 action**

Prioritise stable and well-tested core workflows first, while keeping
implementation tasks smaller and more focused to reduce rework.

## Consolidated Reflection

### What Worked Well

Sprint 2 moved the project significantly beyond the Sprint 1 foundation and
towards a functional Intermediate-tier product.

Strong progress was made across:

- submission and review workflows;
- batch ingestion and asynchronous processing;
- fixture and statistics functionality;
- corrections and aggregate statistics;
- frontend/backend integration;
- automated and end-to-end testing;
- formal user testing;
- database and infrastructure work;
- issue and bug tracking;
- stakeholder interaction; and
- supporting documentation and evidence.

The issue and bug trackers became substantially more useful during Sprint 2.
Work was more consistently linked to issues and Pull Requests, and defects found
during testing were tracked through to fixes.

Formal user testing was another major success.

Testing with people outside the development team exposed real usability and
workflow problems and resulted in changes that were implemented and retested
during the sprint.

The team's testing discipline also improved.

Tests were increasingly treated as something that needed to be validated rather
than merely counted, and the team identified several cases where passing tests
were not meaningfully protecting the intended behaviour.

Using measurements from the real cricket dataset continued to support better
technical decisions.

### What Was Difficult

The strongest common difficulty was late discovery of integration problems.

Several features appeared complete when their individual components were
tested, but problems only became visible when complete user journeys were
exercised.

This was especially significant for submission, batch processing, review,
publication and deployment workflows involving multiple services.

Other difficulties included:

- bugs being discovered late in the sprint;
- insufficient developer-level manual verification before review;
- tests that passed without protecting the intended behaviour;
- frontend/backend and infrastructure dependencies;
- local environment and Azure configuration problems;
- CI and deployment delays;
- performance testing occurring too late;
- formal testing and close-out work being concentrated near the milestone
  deadline;
- deployment pipelines not always proving that the deployed application was
  healthy; and
- large issues creating avoidable rework.

## Sprint 3 Improvements

### 1. Strengthen developer verification

Before a feature is considered ready for review, the developer should run the
relevant local CI checks and manually exercise the primary user journey and
important edge cases.

Automated tests should also be challenged where practical to confirm that they
actually detect the behaviour they are intended to protect.

### 2. Integrate and test earlier

Features involving multiple services or dependencies should be integrated as
soon as a useful vertical slice exists.

Performance, scale, deployment and formal user testing should begin earlier
rather than being deferred until milestone close-out.

### 3. Improve close-out and deployment confidence

Documentation and evidence should be maintained throughout the sprint.

Deployment automation should verify that the resulting deployed service is
healthy and, where practical, expose enough build/version information for the
team to identify exactly what has been deployed.

## Primary Sprint 3 Process Improvement

The main process improvement identified from the retrospective is:

> **Stabilise and verify work earlier: developers should prove their own
> features locally, integrate complete user journeys sooner, and reserve the
> end of the sprint for verification and polish rather than discovering major
> integration problems.**

In practice, the team will:

- run relevant local CI checks before review;
- manually test the primary workflow and important edge cases;
- validate that important automated tests genuinely detect failures;
- identify multi-component integration paths earlier;
- perform deployed and end-to-end testing earlier;
- schedule performance and formal user testing sooner;
- maintain documentation and evidence throughout the sprint;
- keep larger implementation work focused and broken into manageable pieces;
  and
- reserve the final part of the sprint primarily for defects, verification,
  performance, accessibility, documentation and polish.

## Sprint 3 Actions

| Action                                      | How it will be applied                                                                                                                               |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Strengthen developer verification           | Developers run relevant local CI checks and manually exercise the main user flow before work is considered ready for review.                         |
| Test integrated workflows earlier           | Multi-component features, deployed workflows, performance checks and formal user testing are exercised earlier in Sprint 3.                          |
| Improve close-out and deployment confidence | Evidence is maintained continuously and deployments are verified as completed and healthy rather than assumed successful from pipeline status alone. |

## Sprint 2 Milestone Decision

The team considers the Sprint 2 repository state ready to be captured as the
Sprint 2 milestone only once:

- this close-out evidence is reviewed and merged;
- the final Sprint 2 stakeholder close-out has been completed and evidenced;
- work still in progress for Sprint 2 has either been merged or explicitly
  classified as carry-over;
- known defects and limitations are documented;
- Sprint 2 requirements and rubric traceability are current;
- required checks pass on the final reviewed `main` commit;
- the exact final `main` commit is agreed as the Sprint 2 milestone state; and
- no incomplete work is being represented as complete merely to allow the
  milestone to close.

The final reviewed commit will then be tagged with the annotated tag
`sprint-2`.

## Milestone Verification

Before creating the `sprint-2` tag:

- [ ] Final Sprint 2 stakeholder close-out evidence is complete.
- [x] Sprint 2 retrospective is complete.
- [ ] Sprint 2 close-out evidence is reviewed.
- [ ] Remaining Sprint 2 work has either been merged or explicitly classified
      as carry-over.
- [x] Known incomplete work is visibly tracked rather than represented as Done.
- [ ] Formal user-testing findings and integration decisions have been reviewed
      for close-out.
- [ ] Sprint 2 requirements and rubric traceability are current.
- [ ] Required checks pass on the final `main` commit.
- [ ] The final `main` commit is confirmed as the reviewed Sprint 2 state.

## Milestone Tag

**Tag:** `sprint-2`
**Commit:** Pending final merge and verification
**Tag Status:** Pending

The annotated milestone tag will identify the exact reviewed Sprint 2
repository state.

The tag must not be created until the reviewed repository state has been agreed.

## Related Evidence

- Gitea issue #298
- Sprint 2 Gitea milestone
- #271 — Sprint 2 formal user-testing coordination
- #416 — formal public-user testing
- #417 — formal submitter/reviewer testing
- #418 — formal administrator testing
- #420 — Sprint 2 requirements and rubric traceability
- #331 — Sprint 2 weekly stand-up evidence
- relevant Sprint 2 stakeholder evidence
- relevant Sprint 2 acceptance and verification evidence
- relevant Sprint 2 Pull Requests
- `sprint-2` annotated milestone tag once created

## Retrospective Evidence

The original retrospective responses were collected asynchronously through the
team WhatsApp group on 15 September 2026.

The responses were consolidated into this repository record so that the Sprint
2 retrospective forms part of the project's authoritative methodology
evidence.

## Sprint 2 Stakeholder / Review Feedback

The Sprint 2 review was used not only to demonstrate implemented functionality,
but also to identify areas where the product and its supporting documentation
needed to be improved before Sprint 3.

The feedback was evaluated after the review and converted into explicit Sprint 3
work rather than being left as informal notes.

### Google authentication presentation

The Google authentication flow functioned, but the sign-in presentation did not
make appropriate use of official Google branding and the managed OAuth experience
was not presented as clearly as it could be.

**Response**

Sprint 3 issue:

- #580 — `enhancement(auth): use official Google branding and clear managed OAuth sign-in`

This work will also be validated as part of:

- #601 — `test(user): validate navigation, authentication and overall frontend flow`

---

### Database documentation and design motivation

The database documentation required further consolidation and explanation.

Although schema and database documentation existed, the review highlighted the
need for a clearer marker-facing account of:

- the implemented database architecture;
- the deployed PostgreSQL/Supabase setup;
- the schema and important relationships;
- deployment information;
- how the schema supports the cricket event model;
- why the chosen schema was selected;
- the evidence and trade-offs that motivated those design decisions.

The Sprint 3 response is therefore not simply to add another schema diagram, but
to consolidate the existing documentation into a coherent explanation of both
**what was implemented and why it was designed that way**.

**Response**

Sprint 3 issue:

- #579 — `docs(database): consolidate schema, deployment and database design motivation`

---

### Statistics and cricket insight

The review also highlighted a distinction between exposing calculated values and
presenting useful analytics.

The platform already exposed a substantial amount of statistical data, but the
frontend experience could still feel like a collection of numbers rather than a
clear cricket-analysis product.

Sprint 3 will therefore improve the way fixture and participant statistics are
presented, with stronger cricket context, useful summaries and clearer analytical
value for the user.

**Response**

Sprint 3 issues:

- #513 — `Improve fixture overview with cricket match context and useful summary information`
- #582 — `feat(statistics): turn public statistics into meaningful cricket analytics`

User validation:

- #602 — `test(user): validate public statistics and fixture analytics experience`

---

### Frontend navigation and user flow

The Sprint 2 review identified opportunities to improve the overall structure and
flow of the frontend.

As the number of features increased during Sprint 2, navigation and tabs were
added incrementally. Sprint 3 will review the information architecture as a
complete product so that public, submitter, reviewer and administrator journeys
flow logically rather than reflecting the order in which features happened to be
implemented.

**Response**

Sprint 3 issue:

- #581 — `enhancement(frontend): restructure navigation, tabs and role journeys for coherent flow`

User validation:

- #601 — `test(user): validate navigation, authentication and overall frontend flow`

---

## Evaluation of Stakeholder Feedback

The review feedback was accepted as Sprint 3 improvement work.

None of the above findings invalidates the Sprint 2 milestone. They identify areas
where an implemented product foundation should be improved as the project moves
towards the near-complete Sprint 3 standard.

Each accepted finding has therefore been converted into a traceable Sprint 3
issue rather than remaining as informal review notes.

## Post-Sprint Internal Technical Audit

Following the Sprint 2 stakeholder review, the team performed an additional internal audit of the implementation against the Basic and Intermediate Sport Analytics requirements.

This audit was separate from the stakeholder review.

It identified additional correctness and completeness risks that were not raised during the Sprint 2 demonstration. These findings were deliberately converted into Sprint 3 issues rather than being attributed retrospectively to stakeholder feedback.

The main areas identified were:

- genuinely new fixture ingestion and canonical onboarding;
- competition-scope enforcement;
- consistency between public package and worker validation;
- canonical reference resolution;
- event ordering;
- multi-season back-catalogue ingestion;
- cricket-statistics edge cases;
- stable logical event identity across corrections;
- selective aggregate recomputation;
- aggregate provenance;
- consistent API consumer quota/rate-limit enforcement;
- shared rate-limit state across backend replicas;
- point-in-time consistency of dataset releases; and
- completeness of released event data for statistical reproducibility.

These findings are represented by Sprint 3 issues #583–#597.

The audit therefore acts as an engineering input to Sprint 3 planning rather than as retrospective stakeholder feedback.

## AI Declaration

> The preceding document was planned, generated and edited with the assistance
> of ChatGPT-Web[GPT-5.6 Sol].
