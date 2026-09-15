# Sprint 2 Close-Out

**Sprint:** Sprint 2  
**Date:** 15 September 2026  
**Team:** Git Push Pray  
**Related Issue:** #298  
**Retrospective Format:** Asynchronous team reflection via WhatsApp  
**Milestone Status:** Close-out in progress

## Stakeholder Review

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

Work that is not complete at the end of Sprint 2 is not being represented as
completed Sprint 2 work.

Remaining work is retained in Gitea and is either explicitly carried into
Sprint 3, remains in the Sprint 2 milestone pending final disposition, or is
tracked separately as an active defect.

At the time of close-out preparation, the following open and currently
unassigned work remains visible:

### Remaining Sprint 2 work

- **#513 — Improve fixture overview with cricket match context and useful
  summary information**

  This issue remains open in the Sprint 2 milestone and is not represented as
  completed Sprint 2 work.

- **#329 — Upgrade Vite/Vitest toolchain to resolve remaining esbuild
  development-server advisory**

  This issue remains open in the Sprint 2 milestone and is not represented as
  completed Sprint 2 work.

### Work carried into Sprint 3

- **#566 — Document hosting capacity, Azure quota recovery and deployment
  strategy**
- **#565 — Add production-scale deployment and dataset release acceptance
  testing**
- **#564 — Move frontend from Azure App Service to static hosting**
- **#563 — Migrate backend API from Azure App Service to Azure Container Apps**
- **#562 — Move dataset release publication to asynchronous worker processing**

These issues remain explicitly tracked rather than being represented as
completed Sprint 2 functionality.

Additional active defects that already have owners remain tracked in the bug
tracker and are not duplicated here as unowned carry-over.

The carry-over list will be checked again immediately before the final Sprint 2
milestone state is agreed and tagged.

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

## AI Declaration

> The preceding document was planned, generated and edited with the assistance
> of ChatGPT-Web[GPT-5.6 Sol].
