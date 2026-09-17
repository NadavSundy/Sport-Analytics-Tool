# Project Backlog and Milestone Plan

| Document Information    | Details                                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| Project                 | Sport Analytics Tool                                                                               |
| Related Issue           | #36                                                                                                |
| Methodology             | Lightweight Scrumban                                                                               |
| Planning Target         | Sprint 3 near-complete Basic/Intermediate product with selected Advanced API work after acceptance |
| Final Submission Target | Hardening, evidence, documentation and release packaging                                           |
| Last Updated            | 15 September 2026                                                                                  |
| Status                  | Active planning document                                                                           |

---

## 1. Purpose

This document records the complete project backlog, milestone allocation, development roadmap and prioritisation approach for the Sport Analytics Tool.

It supports issue #36 by providing a persistent repository record of:

- the agreed project milestones;
- the complete Sprint 1 backlog;
- existing Gitea issues mapped to Sprint 1 work;
- Sprint 1 priorities and dependencies;
- the complete planned Sprint 2 backlog;
- the complete planned Sprint 3 backlog;
- the complete planned Final Submission backlog;
- the relationship between Basic, Intermediate, Advanced and Common work;
- the process for progressive backlog refinement; and
- the rules used when project priorities or requirements change.

This document provides the complete project planning baseline established during Sprint 1.

It does not replace Gitea.

Gitea remains the authoritative source for actionable development work, including:

- current issue status;
- assignees;
- detailed acceptance criteria;
- issue dependencies;
- milestone assignment;
- board position;
- Pull Requests; and
- completion evidence.

This document remains the authoritative repository record of the planned project roadmap and future backlog until future items are refined into detailed Gitea issues.

---

## 2. Planning Approach

The project uses a lightweight Scrumban methodology.

The backlog is planned across four formal delivery periods:

```text
Sprint 1
Sprint 2
Sprint 3
Final Submission
```

Two levels of backlog detail are used.

### 2.1 Planned Backlog Items

A planned backlog item identifies work that the project expects to complete during a future delivery period.

Planned backlog items:

- appear in this document;
- have a milestone;
- have a tier;
- have a priority;
- contribute to the overall development roadmap; and
- may still change following stakeholder feedback or technical discoveries.

A planned backlog item does not need to exist as an individual Gitea issue immediately.

### 2.2 Actionable Gitea Issues

When work enters the active planning horizon, it is refined into an actionable Gitea issue.

An actionable issue includes:

- a clear purpose;
- an expected outcome;
- acceptance criteria;
- identified dependencies;
- required stakeholder clarification;
- an appropriate assignee;
- a scope small enough to manage effectively; and
- an understood verification approach.

Sprint 1 is the current delivery period and is therefore represented primarily by detailed Gitea issues.

Sprint 2, Sprint 3 and Final Submission are documented completely in this roadmap during Sprint 1 but will be converted into detailed Gitea issues progressively, normally one sprint ahead.

This prevents the tracker from being filled with premature issues whose detailed scope may change before implementation begins.

Future work must not be moved to `Ready` merely because it appears in this document.

The Project board remains:

```text
Backlog
Ready
In Progress
In Review
Blocked
Done
```

---

## 3. Prioritisation Rules

Work is prioritised in the following order:

1. mandatory project requirements;
2. work required for the current milestone;
3. work blocking other issues;
4. stakeholder priorities;
5. high-risk technical work;
6. defects affecting core functionality;
7. testing and documentation supporting completed features; and
8. optional enhancements.

For the Sport Analytics Tool, the highest early priorities are:

- domain and sport definitions;
- event-data modelling;
- submission validation;
- provenance and traceability;
- authentication and authorisation;
- approved-submitter scope;
- API contracts;
- database foundations;
- statistic derivation;
- automated testing;
- deployment; and
- project documentation.

Basic functionality is non-negotiable.

Intermediate functionality is planned for completion by Sprint 2.

Advanced functionality is the Sprint 3 target.

Advanced architecture and technical risks should be considered before Sprint 3 where delaying them would create avoidable rework.

### Sprint 3 refinement at Sprint 2 close-out

The Sprint 1 roadmap remains the historical planning baseline.

At Sprint 2 close-out, the Sprint 3 target was refined through the progressive
backlog-refinement process already defined in this document.

Sprint 2 stakeholder / marker feedback, the team retrospective, deployed
acceptance evidence and the post-review Basic/Intermediate correctness audit
showed that known core correctness and usability gaps must be resolved before
the team commits capacity to the complete Advanced feature tier.

The active Sprint 3 priority is therefore:

1. complete and stabilise remaining Basic/Intermediate behaviour;
2. address accepted Sprint 2 review feedback;
3. complete feature-level user-feedback tasks and the Intermediate acceptance gate;
4. revalidate deployment, performance and supporting evidence; and
5. only after the Intermediate acceptance gate passes, implement the selected
   Advanced API capabilities represented by #608-#611.

The remaining original Advanced backlog remains documented below as the
historical Sprint 1 roadmap. It is not being represented as completed and is
not automatically committed Sprint 3 work.

---

## 4. Milestone Outcomes

### Sprint 1 — Working Basic Vertical Slice and Project Direction

Sprint 1 targets a deployed and documented Basic vertical slice while establishing the design, architecture, methodology and technical foundations required for the rest of the project.

The intended end-to-end workflow is:

```text
administrator approves submitter
        ↓
approved submitter signs in
        ↓
submitter sends delivery events
        ↓
backend verifies identity, role and scope
        ↓
events are validated
        ↓
invalid events receive useful rejection messages
        ↓
valid events are stored with provenance
        ↓
statistics are derived from accepted events
        ↓
public users retrieve fixtures, events and statistics
```

Sprint 1 must also establish:

- a comprehensive project roadmap;
- system architecture;
- UI and information architecture;
- database foundations;
- API conventions;
- authentication foundations;
- CI and automated testing foundations;
- deployment foundations;
- project methodology evidence; and
- clear direction for Sprint 2, Sprint 3 and Final Submission.

### Sprint 2 — Complete Basic and Intermediate

Sprint 2 targets:

- completion of all remaining Basic requirements; and
- completion of the Intermediate feature tier.

The expected outcome is a useful and increasingly stable product supporting:

- complete Basic user flows;
- bulk event ingestion;
- review and publication;
- correction history;
- wider aggregate statistics;
- performance optimisation;
- external API consumers;
- dataset releases;
- formal user testing; and
- Intermediate-level testing and documentation.

### Sprint 3 — Advanced Feature Completion

Sprint 3 targets completion of the Advanced feature tier and a near-complete product.

The expected outcome includes:

- safe custom statistics;
- live event ingestion;
- replayable event processing;
- temporal statistics;
- dataset comparisons;
- asynchronous queries;
- change feeds;
- API compatibility controls;
- anomaly detection;
- conflicting-submitter reconciliation;
- correction propagation;
- production observability; and
- advanced quality assurance.

### Final Submission — Hardening and Release

Final Submission is not planned as another major feature-development sprint.

The period is reserved primarily for:

- defect resolution;
- release hardening;
- production verification;
- database backup and restore verification;
- final security testing;
- final accessibility testing;
- final performance testing;
- browser compatibility;
- complete documentation;
- requirements traceability;
- known limitation records;
- demonstration preparation;
- reports;
- presentation material;
- release notes;
- final version tagging; and
- submission packaging.

---

## 5. Existing Project and Foundation Issues

The following issues already establish important repository, infrastructure, governance and technical foundations.

| Issue | Work                                                                                  |
| ----- | ------------------------------------------------------------------------------------- |
| #2    | Add Git and project methodology documentation                                         |
| #7    | Align repository governance and document initial setup deviation                      |
| #8    | Protect `main` and require Pull Request approval                                      |
| #10   | Restore green CI and reproducible installation                                        |
| #11   | Deploy the public documentation site with Cloudflare Pages                            |
| #12   | Validate developer onboarding and motivate the technology stack                       |
| #13   | Establish the Supabase PostgreSQL foundation                                          |
| #14   | Investigate and establish the OAuth/OIDC authentication foundation                    |
| #15   | Establish the Azure backend deployment foundation                                     |
| #17   | Establish the Azure frontend deployment foundation                                    |
| #21   | Resolve database merge conflict                                                       |
| #27   | Design and implement the delivery event schema                                        |
| #28   | Create the Cricsheet T20 dataset downloader                                           |
| #29   | Deploy MkDocs documentation to Cloudflare Pages using Wrangler                        |
| #30   | Create per-team-member folders for AI transcripts                                     |
| #36   | Complete and prioritise the project backlog                                           |
| #37   | Confirm sport and domain definitions                                                  |
| #38   | Produce the complete system architecture, data flow and development roadmap           |
| #39   | Build frontend authentication pages and navigation controls                           |
| #43   | Implement the application account, role, approved-submitter and scope database schema |
| #49   | Define the executable delivery submission schema and validation examples              |
| #72   | Complete the automated testing foundation and test environment setup                  |
| #73   | Align architecture roadmap and authentication terminology                             |

Existing work should not be duplicated merely because a later planning item describes related functionality.

Where a later implementation issue extends an existing foundation issue, the relationship should be recorded as a dependency or predecessor.

---

## 6. Sprint 1 Requirement-to-Issue Mapping

The Sprint 1 planning catalogue contains 36 work areas.

The following table records the current mapping between those work areas and the Gitea issues already created.

Where multiple issues are listed, they collectively satisfy or support the catalogue item.

| Catalogue ID | Sprint 1 Work                                                                                               | Gitea Mapping                                     |
| ------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| S1-01        | Confirm sport, professional competition scope, fixture definition, event vocabulary and required statistics | #37                                               |
| S1-02        | Clarify Basic, Intermediate and Advanced acceptance decisions with the stakeholder                          | Planning requirement retained for Sprint 1 review |
| S1-03        | Create requirements traceability matrix and requirement change log                                          | Planning requirement retained for Sprint 1 review |
| S1-04        | Produce complete system architecture, data flow, deployment design and development roadmap                  | #38, follow-up #73                                |
| S1-05        | Record architecture decisions for caching, background jobs, file storage and live ingestion                 | #55                                               |
| S1-06        | Produce information architecture, user journeys and responsive wireframes                                   | #56                                               |
| S1-07        | Define accessible design system and reusable frontend component baseline                                    | #57                                               |
| S1-08        | Define stable identifiers and shared API response, error, filtering, sorting and pagination contracts       | #58                                               |
| S1-09        | Create OpenAPI baseline and API versioning and deprecation conventions                                      | #59                                               |
| S1-10        | Implement repeatable database migrations and development seed tooling                                       | #60                                               |
| S1-11        | Implement competition, season, competitor, participant and fixture database schema                          | #46                                               |
| S1-12        | Implement application account, role, approved-submitter and scope database schema                           | #43                                               |
| S1-13        | Implement submission, ordered-event, provenance and correction database schema                              | #61, building on #27                              |
| S1-14        | Implement backend database repository and transaction foundation                                            | #62                                               |
| S1-15        | Create representative development seed and reference fixture dataset                                        | #63, supported by #28                             |
| S1-16        | Configure managed authentication provider and account authentication foundation                             | #14                                               |
| S1-17        | Implement account synchronisation, profile API and role-based authorisation                                 | #44                                               |
| S1-18        | Implement reusable authentication, role, approval and scope authorisation                                   | #44, with submission scope enforcement in #51     |
| S1-19        | Implement frontend authentication state, protected routes and authenticated API client                      | #64                                               |
| S1-20        | Build Create Account, Sign In, Account, Sign Out and authentication navigation                              | #39                                               |
| S1-21        | Build accessible sign-up and sign-in forms                                                                  | #39, supported by #57                             |
| S1-22        | Document Google-managed password recovery and the application credential boundary                           | #65                                               |
| S1-23        | Implement secure account deletion across authentication and application data                                | #66                                               |
| S1-24        | Implement administrator APIs for submitter approval, revocation and scope assignment                        | #45                                               |
| S1-25        | Build administrator submitter approval and scope-management interface                                       | #45                                               |
| S1-26        | Define executable delivery submission schema and valid/invalid validation examples                          | #49                                               |
| S1-27        | Implement event validation with detailed and structured rejection messages                                  | #50                                               |
| S1-28        | Implement approved-submitter event submission with provenance and scope enforcement                         | #51                                               |
| S1-29        | Implement public fixture and ordered-event APIs with filtering and pagination                               | #47 and #67                                       |
| S1-30        | Implement Basic event-derived fixture statistics and public statistics API                                  | #52                                               |
| S1-31        | Build first public competition, fixture, event and statistics browsing experience                           | #48 and #54                                       |
| S1-32        | Add backend and frontend tests for the Basic vertical slice                                                 | #68, supported by #72                             |
| S1-33        | Repair Azure deployment workflows for the current monorepo and add deployed smoke checks                    | #69, building on #15 and #17                      |
| S1-34        | Automate MkDocs deployment from Gitea to Cloudflare Pages                                                   | #29, building on #11                              |
| S1-35        | Publish Sprint 1 setup, architecture, API, testing documentation and evidence                               | #70                                               |
| S1-36        | Conduct Sprint 1 stakeholder review, retrospective and milestone tag                                        | #71                                               |

S1-02 and S1-03 remain explicit Sprint 1 planning obligations even though a dedicated Gitea issue number has not yet been recorded for them in this document.

Their absence from the mapping does not remove the requirements.

They must be reviewed during Sprint 1 close-out and either:

- mapped to an existing issue or planning record; or
- converted into a dedicated Gitea issue if meaningful implementation or documentation work remains.

---

## 7. Sprint 1 Implementation Areas

### Account, Authentication and Authorisation

| Issue | Work                                                                         |
| ----- | ---------------------------------------------------------------------------- |
| #14   | OAuth/OIDC authentication foundation                                         |
| #39   | Frontend authentication pages and navigation controls                        |
| #43   | Account, role, approved-submitter and scope database schema                  |
| #44   | Account synchronisation, profile API and role-based authorisation            |
| #45   | Administrator submitter approval and scope management                        |
| #64   | Frontend authentication state, protected routes and authenticated API client |
| #65   | Google-managed password-recovery decision and documentation                  |
| #66   | Secure account deletion across authentication and application data           |

Before #66 begins, its Gitea title and description must be checked for legacy Firebase terminology.

If Firebase remains in the issue wording, it should be changed to:

```text
Implement secure account deletion across Supabase Auth and application data
```

Firebase must not be implemented alongside Supabase Auth.

### Database and Domain

| Issue | Work                                                            |
| ----- | --------------------------------------------------------------- |
| #13   | Supabase PostgreSQL foundation                                  |
| #21   | Database merge-conflict resolution                              |
| #27   | Delivery event schema                                           |
| #28   | Cricsheet T20 dataset downloader                                |
| #43   | Application account, role, approved-submitter and scope schema  |
| #46   | Competition, season, competitor, participant and fixture schema |
| #60   | Repeatable database migrations and development seed tooling     |
| #61   | Submission, ordered-event, provenance and correction schema     |
| #62   | Backend database repository and transaction foundation          |
| #63   | Representative development seed and reference fixture dataset   |

### Event Submission and Validation

| Issue | Work                                                                                |
| ----- | ----------------------------------------------------------------------------------- |
| #49   | Define executable delivery submission schema and validation examples                |
| #50   | Implement event validation with detailed rejection messages                         |
| #51   | Implement approved-submitter event submission with provenance and scope enforcement |
| #53   | Build approved-submitter event upload and validation-results interface              |

### Public API, Statistics and Frontend

| Issue | Work                                                         |
| ----- | ------------------------------------------------------------ |
| #47   | Public competition, fixture and participant read APIs        |
| #48   | Public competition, fixture and participant browsing pages   |
| #52   | Event-derived fixture statistics and public statistics API   |
| #54   | Public fixture and competitor statistics pages               |
| #67   | Public ordered-event read APIs with filtering and pagination |

### Architecture, API Design and UX

| Issue | Work                                                                                           |
| ----- | ---------------------------------------------------------------------------------------------- |
| #38   | Complete system architecture, data flow and roadmap                                            |
| #55   | Architecture decisions for caching, background jobs, file storage and live ingestion           |
| #56   | Information architecture, user journeys and responsive wireframes                              |
| #57   | Accessible design system and reusable frontend component baseline                              |
| #58   | Stable identifiers and shared API response, error, filtering, sorting and pagination contracts |
| #59   | OpenAPI baseline and API versioning/deprecation conventions                                    |
| #73   | Architecture roadmap and authentication terminology alignment                                  |

### Testing, Deployment and Evidence

| Issue | Work                                                                  |
| ----- | --------------------------------------------------------------------- |
| #10   | Restore green CI and reproducible installation                        |
| #11   | Deploy public documentation site                                      |
| #15   | Azure backend deployment foundation                                   |
| #17   | Azure frontend deployment foundation                                  |
| #29   | MkDocs deployment through Cloudflare Pages and Wrangler               |
| #68   | Basic vertical-slice backend and frontend tests                       |
| #69   | Repair Azure workflows and add deployed smoke checks                  |
| #70   | Sprint 1 setup, architecture, API, testing documentation and evidence |
| #71   | Sprint 1 stakeholder review, retrospective and milestone tag          |
| #72   | Automated testing foundation and test environment setup               |

---

## 8. Authentication Terminology

The project originally investigated Firebase Authentication.

The current architecture uses:

```text
Supabase Auth
    +
Google OAuth
```

ADR-004 supersedes the earlier Firebase direction.

Future backlog items and Gitea issues must therefore use current Supabase Auth terminology and must not introduce Firebase as a parallel authentication implementation unless a later approved ADR explicitly supersedes ADR-004.

The authentication flow is:

```text
React frontend
      ↓
Supabase Auth
      ↓
Google OAuth
      ↓
Supabase access token
      ↓
Handwritten Express API
      ↓
Application account, role, approval state and scope
```

Authentication and application authorisation remain separate.

Supabase Auth proves identity.

The Sport Analytics backend determines:

- application account state;
- role;
- approved-submitter status;
- competition, season or fixture scope; and
- administrator permissions.

Application identity remains provider-neutral through:

```text
(auth_provider, provider_subject)
```

The written lecturer approval currently stored in the repository explicitly covers Supabase-hosted PostgreSQL but does not separately confirm Supabase Auth.

Supabase Auth is therefore the team's selected and implemented authentication foundation, while any required formal confirmation remains an open compliance decision.

---

## 9. Sprint 1 Dependency Order

Sprint 1 work should be pulled according to dependencies rather than simply by issue number.

### Priority A — Governance and Technical Foundations

Relevant issues include:

```text
#2
#7
#8
#10
#12
#13
#14
#15
#17
#21
#27
#28
#29
#30
#36
#37
#38
#55
#56
#57
#58
#59
#60
#72
#73
```

These establish:

- repository governance;
- CI;
- development setup;
- architecture;
- domain definitions;
- database connectivity;
- event modelling;
- authentication;
- API conventions;
- testing;
- deployment; and
- documentation infrastructure.

### Priority B — Persistent Domain and Identity Model

Relevant issues include:

```text
#43
#46
#61
#62
#63
```

These establish the database structures and transaction foundations required by the product vertical slice.

### Priority C — Authentication and Approval Flow

Relevant issues include:

```text
#39
#44
#45
#64
#65
#66
```

The required flow is:

```text
user authenticates
        ↓
application account is resolved
        ↓
role is determined
        ↓
administrator approves submitter
        ↓
submitter receives allowed scope
```

### Priority D — Event Submission Vertical Slice

Relevant issues include:

```text
#49
#50
#51
#53
```

The required flow is:

```text
approved submitter
        ↓
delivery submission
        ↓
schema validation
        ↓
sport-rule validation
        ↓
scope authorisation
        ↓
structured rejection or acceptance
        ↓
provenance-backed persistence
```

### Priority E — Public Read and Statistics Vertical Slice

Relevant issues include:

```text
#47
#48
#52
#54
#67
```

The required public flow is:

```text
public user
      ↓
competition / fixture discovery
      ↓
ordered event viewing
      ↓
derived statistics
```

Public read functionality must not require authentication.

### Priority F — Verification and Sprint Close-Out

Relevant issues include:

```text
#68
#69
#70
#71
```

Before Sprint 1 closes:

- the Basic vertical slice must be covered by automated tests;
- deployment must be verified;
- documentation must reflect the implemented system;
- stakeholder feedback must be recorded;
- incomplete work must be identified honestly;
- known limitations must be recorded;
- required checks must pass for the approved milestone state; and
- the Sprint 1 milestone tag must identify the reviewed `main` commit.

---

## 10. Sprint 1 End-to-End Trace

The main Sprint 1 product flow can be traced directly to Gitea work.

### 1. Define the Sport

```text
#37
```

Confirm T20 cricket terminology, competition scope, fixtures, events and required statistics.

### 2. Establish Architecture and Design

```text
#38
#55
#56
#57
#58
#59
#73
```

Define system boundaries, service interactions, API conventions, technical decisions, information architecture, user journeys and responsive design.

### 3. Establish Data Storage

```text
#13
#27
#43
#46
#60
#61
#62
#63
```

Establish PostgreSQL, migrations, domain data, authentication-linked application accounts, events, submissions, provenance and corrections.

### 4. Establish Authentication

```text
#14
#39
#44
#64
#65
#66
```

Support account authentication, frontend authentication state, account resolution and role-based access.

### 5. Approve Submitters

```text
#43
#45
```

Store approval and scope and provide administrator management functionality.

### 6. Define and Validate Deliveries

```text
#49
#50
```

Define the executable delivery contract and validate submitted events.

### 7. Submit Events

```text
#51
#53
```

Allow approved submitters to submit in-scope delivery events and receive validation outcomes.

### 8. Persist Events with Provenance

```text
#27
#61
#62
```

Store accepted events and their submission provenance through the backend repository layer.

### 9. Read Public Event Data

```text
#47
#48
#67
```

Expose public competition, fixture, participant and ordered-event data.

### 10. Derive Statistics

```text
#52
```

Compute fixture statistics from accepted event data rather than treating statistics as an independent source of truth.

### 11. Display Statistics

```text
#54
```

Provide public fixture and competitor statistics pages.

### 12. Verify the Vertical Slice

```text
#68
#72
```

Provide automated backend and frontend verification.

### 13. Deploy

```text
#15
#17
#69
```

Verify the frontend and backend through the project's Azure deployment path.

### 14. Publish Documentation and Evidence

```text
#11
#29
#70
```

Publish documentation and retain Sprint 1 evidence.

### 15. Review and Close Sprint

```text
#71
```

Conduct the stakeholder review and retrospective before creating the milestone tag.

---

## 11. Sprint 2 Planned Backlog

### Sprint Goal

Complete all remaining Basic functionality and deliver the full Intermediate feature tier.

Sprint 2 work is identified now as part of the complete development roadmap.

These entries are intentionally retained as planned backlog items during Sprint 1 rather than being expanded immediately into individual Gitea issues.

During Sprint 1 close-out, the Sprint 2 backlog will be reviewed against:

- completed Sprint 1 work;
- incomplete Sprint 1 work;
- stakeholder feedback;
- technical discoveries;
- defects and limitations;
- changed dependencies;
- performance findings; and
- team capacity.

The reviewed Sprint 2 backlog will then be converted into appropriately sized Gitea issues with detailed acceptance criteria, dependencies, labels, assignees and the Sprint 2 milestone.

### Complete Sprint 2 Backlog

| ID    | Planned Work                                                                                        | Tier         | Priority |
| ----- | --------------------------------------------------------------------------------------------------- | ------------ | -------- |
| S2-01 | Implement public competition, season, competitor and participant read APIs                          | Basic        | High     |
| S2-02 | Implement administrator CRUD APIs for competitions, seasons, competitors, participants and fixtures | Basic        | High     |
| S2-03 | Build public competition, season, competitor and fixture browsing pages                             | Basic        | Normal   |
| S2-04 | Build administrator competition, season, competitor and fixture management pages                    | Basic        | Normal   |
| S2-05 | Implement JSON and CSV file-upload submissions through the shared validation pipeline               | Basic        | High     |
| S2-06 | Implement submission list, detail and validation-result APIs                                        | Basic        | Normal   |
| S2-07 | Build the approved-submitter upload, direct-entry and result interface                              | Basic        | High     |
| S2-08 | Implement authorised event correction with automatic statistic refresh                              | Basic        | High     |
| S2-09 | Build the approved event-correction interface                                                       | Basic        | Normal   |
| S2-10 | Implement statistic provenance and the how-calculated trace in the API and frontend                 | Basic        | High     |
| S2-11 | Implement filtered CSV and JSON dataset exports in the API and frontend                             | Basic        | High     |
| S2-12 | Select and document a relevant external API integration                                             | Common       | Normal   |
| S2-13 | Implement the selected external API integration in the backend and frontend                         | Common       | Normal   |
| S2-14 | Complete the full Basic integration and browser-level end-to-end acceptance workflow                | Basic        | High     |
| S2-15 | Complete the Basic accessibility and responsive-design audit and fixes                              | Common       | High     |
| S2-16 | Complete the Basic security, privacy and dependency hardening review                                | Common       | High     |
| S2-17 | Conduct formal Basic user testing and integrate prioritised feedback                                | Basic        | High     |
| S2-18 | Design the batch staging, file storage and processing pipeline                                      | Intermediate | High     |
| S2-19 | Implement batch, batch-item and processing-checkpoint database models                               | Intermediate | High     |
| S2-20 | Implement whole-season and back-catalogue batch upload and staging                                  | Intermediate | High     |
| S2-21 | Implement asynchronous batch validation and processing                                              | Intermediate | High     |
| S2-22 | Generate accepted and rejected batch processing reports                                             | Intermediate | Normal   |
| S2-23 | Make batch resubmission idempotent and prevent double counting                                      | Intermediate | High     |
| S2-24 | Implement resumable batch processing from durable checkpoints                                       | Intermediate | High     |
| S2-25 | Implement submission review and publication workflow in the API and frontend                        | Intermediate | High     |
| S2-26 | Implement impossible and conflicting event validation rules                                         | Intermediate | High     |
| S2-27 | Implement immutable correction history and audit logs                                               | Intermediate | High     |
| S2-28 | Implement season, career and competition-wide aggregate derivation                                  | Intermediate | High     |
| S2-29 | Implement dependency-aware selective recomputation after event changes                              | Intermediate | High     |
| S2-30 | Build golden reference results and automated correctness checks                                     | Intermediate | High     |
| S2-31 | Create representative large-scale data and define API response-time targets                         | Intermediate | High     |
| S2-32 | Optimise database indexes, storage layout and query plans under load                                | Intermediate | High     |
| S2-33 | Implement explicit API versioning and compatibility behaviour                                       | Intermediate | High     |
| S2-34 | Implement API key issuance, rotation, revocation, rate limits and quotas                            | Intermediate | High     |
| S2-35 | Implement caching for repeated reads with correct invalidation                                      | Intermediate | Normal   |
| S2-36 | Implement versioned dataset releases, snapshots, field documentation and checksums                  | Intermediate | High     |
| S2-37 | Build the dataset release catalogue and download experience                                         | Intermediate | Normal   |
| S2-38 | Complete Intermediate integration, correctness, performance and API tests                           | Intermediate | High     |
| S2-39 | Publish Intermediate API, database, testing and third-party code documentation                      | Intermediate | Normal   |
| S2-40 | Conduct the Sprint 2 stakeholder review, user feedback round, retrospective and milestone tag       | Common       | High     |

### Sprint 2 Expected Outcome

By the end of Sprint 2:

- all remaining Basic requirements should be complete;
- the complete Intermediate feature tier should be operational;
- the system should support bulk event ingestion;
- imports should be resumable and idempotent;
- corrections and review workflows should be traceable;
- season, career and competition aggregates should be available;
- the API should support external consumers using appropriate controls;
- dataset releases should be versioned and reproducible;
- representative-scale performance should have been tested;
- formal user testing should have been conducted; and
- Sprint 2 evidence should be retained.

---

## 12. Sprint 3 Planned Backlog

### Sprint Goal

Complete the Advanced feature tier and bring the system to a near-complete, production-quality state.

Sprint 3 work is identified during Sprint 1 as part of the complete roadmap.

The detailed form of these items will be reviewed at Sprint 2 close-out using:

- implementation evidence;
- stakeholder feedback;
- performance findings;
- security findings;
- unresolved technical risk;
- updated requirements; and
- available team capacity.

Only then will the planned items be converted into detailed Sprint 3 Gitea issues.

### Complete Sprint 3 Backlog

| ID    | Planned Work                                                                          | Tier     | Priority |
| ----- | ------------------------------------------------------------------------------------- | -------- | -------- |
| S3-01 | Define the safe custom statistic definition language and execution contract           | Advanced | High     |
| S3-02 | Implement versioned custom statistic definitions and validation                       | Advanced | High     |
| S3-03 | Implement sandboxed and resource-limited custom statistic execution                   | Advanced | High     |
| S3-04 | Evaluate custom statistic definitions across the full event history at scale          | Advanced | High     |
| S3-05 | Build custom statistic definition, evaluation and result APIs and interfaces          | Advanced | High     |
| S3-06 | Trace custom statistic results to source events and definition versions               | Advanced | High     |
| S3-07 | Propagate event corrections into affected custom statistic results                    | Advanced | High     |
| S3-08 | Define and implement the authenticated live fixture event feed                        | Advanced | High     |
| S3-09 | Handle duplicate, late and out-of-order live events deterministically                 | Advanced | High     |
| S3-10 | Implement replayable event processing and prove ordered-feed convergence              | Advanced | High     |
| S3-11 | Implement temporal history and as-of-date statistic queries and views                 | Advanced | High     |
| S3-12 | Implement dataset release comparison and difference views                             | Advanced | Normal   |
| S3-13 | Implement aggregate query endpoints beyond record retrieval                           | Advanced | High     |
| S3-14 | Implement asynchronous large-query jobs with submission, status and result collection | Advanced | High     |
| S3-15 | Implement the event and dataset change feed for delta synchronisation                 | Advanced | Normal   |
| S3-16 | Publish the API deprecation path and implement safe version retirement behaviour      | Advanced | High     |
| S3-17 | Add automated API contract and backwards-compatibility tests                          | Advanced | High     |
| S3-18 | Implement per-consumer API usage metering and an administrator usage view             | Advanced | Normal   |
| S3-19 | Implement historical anomaly detection and anomaly review                             | Advanced | High     |
| S3-20 | Implement conflicting-submitter reconciliation and accepted-resolution workflow       | Advanced | High     |
| S3-21 | Carry accepted corrections through aggregates, caches, custom statistics and releases | Advanced | High     |
| S3-22 | Complete advanced end-to-end correctness and representative-scale performance testing | Advanced | High     |
| S3-23 | Implement production observability, structured logs, metrics and health checks        | Common   | High     |
| S3-24 | Complete the application-wide accessibility, responsiveness, UX and aesthetic polish  | Common   | High     |
| S3-25 | Complete the advanced security, failure-recovery and dependency review                | Common   | High     |
| S3-26 | Publish the complete advanced architecture, API, analyst and operations documentation | Advanced | High     |
| S3-27 | Run the advanced browser-level demonstration and stakeholder acceptance test          | Advanced | High     |
| S3-28 | Complete the Sprint 3 review, retrospective, evidence pack and milestone tag          | Common   | High     |

### Sprint 3 Expected Outcome

By the end of Sprint 3:

- Advanced custom statistics should be supported safely;
- live event ingestion should be supported;
- duplicate, late and out-of-order events should converge correctly;
- event processing should be replayable;
- historical as-of queries should be available;
- dataset releases should be comparable;
- large queries should be supported asynchronously where required;
- consumers should be able to follow change feeds;
- API compatibility and deprecation should be tested;
- usage reporting should be available;
- anomalies and conflicting submissions should be reviewable;
- corrections should propagate through downstream outputs;
- production observability should be available;
- accessibility, security and recovery should be reviewed; and
- stakeholder acceptance should be demonstrated.

---

### Refined Active Sprint 3 Plan — 15 September 2026

The original Sprint 3 catalogue above was created during Sprint 1 as the complete
future roadmap.

As required by this document's refinement process, that catalogue was reviewed
at Sprint 2 close-out against:

- actual implementation evidence;
- stakeholder / marker feedback;
- formal user-testing findings;
- representative-scale performance and deployment evidence;
- unresolved Basic/Intermediate correctness risks;
- the team retrospective; and
- available Sprint 3 capacity.

The detailed active Sprint 3 plan is recorded in:

[`evidence/sprints/sprint-3/2026-09-15-planning.md`](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/sprints/sprint-3/2026-09-15-planning.md)

and is tracked through Issue #577 and the Sprint 3 Gitea milestone.

#### Active priorities

The active Sprint 3 backlog prioritises:

- Sprint 2 carry-over #329, #513, #562-#566 and #571;
- accepted Sprint 2 review improvements #579-#582;
- repository-wide code coverage #578;
- Basic/Intermediate correctness #583-#597;
- user-testing setup #600 and feature-level user-feedback tasks #601-#607;
- the Intermediate acceptance gate #598;
- representative-scale performance re-validation #599;
- selected Advanced API work #608-#611 only after #598 passes;
- Advanced user validation #612; and
- Sprint 3 close-out #613.

#### Selected Advanced mapping

The four selected Advanced candidates map directly to the original Sprint 1
roadmap:

| Active issue | Original Sprint 3 item | Capability                                               |
| ------------ | ---------------------- | -------------------------------------------------------- |
| #611         | S3-13                  | Aggregate query endpoints beyond record retrieval        |
| #608         | S3-16                  | API deprecation path and safe version retirement         |
| #609         | S3-17                  | Automated API contract / backwards-compatibility testing |
| #610         | S3-18                  | Per-consumer API usage metering                          |

These four issues are selected Advanced stretch work.

They remain blocked by the Basic/Intermediate acceptance gate #598 and therefore
must not displace unfinished core correctness work.

The remaining Advanced catalogue is not being silently removed or represented
as completed. It remains future backlog to be reconsidered against actual
capacity and the state of the product.

## 13. Final Submission Planned Backlog

### Final Submission Goal

Release a stable, demonstrable and well-evidenced final product.

Final Submission is not planned as another major implementation sprint.

Its backlog is primarily concerned with:

- release verification;
- defects;
- hardening;
- documentation;
- evidence;
- reporting; and
- packaging.

At Sprint 3 close-out, the planned Final Submission backlog will be reviewed against the actual state of the system and converted into detailed Gitea issues.

### Complete Final Submission Backlog

| ID   | Planned Work                                                                                      | Tier   | Priority |
| ---- | ------------------------------------------------------------------------------------------------- | ------ | -------- |
| F-01 | Triage all open defects and resolve every release-blocking issue                                  | Common | High     |
| F-02 | Prepare production database migrations, backups and restore verification                          | Common | High     |
| F-03 | Verify production secrets, configuration and frontend, API, worker, cache and storage deployments | Common | High     |
| F-04 | Run the final performance, security, accessibility and cross-browser release audits               | Common | High     |
| F-05 | Complete the final requirements traceability matrix, limitations register and acceptance record   | Common | High     |
| F-06 | Complete database, third-party code, licence, testing and AI usage documentation                  | Common | High     |
| F-07 | Prepare the reproducible demonstration dataset and scripted product demonstration                 | Common | High     |
| F-08 | Prepare the group presentation and architecture and UX showcase                                   | Common | Normal   |
| F-09 | Prepare the group report, individual report and peer-review evidence packs                        | Common | Normal   |
| F-10 | Publish release notes, create the final version tag and assemble the submission package           | Common | High     |

### Final Submission Expected Outcome

The final submission should provide:

- a stable deployed application;
- no unresolved release-blocking defects;
- verified production configuration;
- verified database backup and recovery;
- complete automated and manual testing evidence;
- final security and accessibility evidence;
- final requirements traceability;
- complete public and repository documentation;
- reproducible demonstration data;
- group and individual reports;
- presentation material;
- release notes;
- the final milestone tag; and
- the complete submission package.

---

## 14. Future Backlog Refinement

The backlog documented in this file represents the project's complete planned development scope as understood during Sprint 1.

The Sprint 2, Sprint 3 and Final Submission items are deliberately documented before their corresponding detailed Gitea issues are created.

This provides a comprehensive development plan and roadmap during Sprint 1 while avoiding premature task refinement.

The planned refinement cycle is:

```text
SPRINT 1

Detailed Sprint 1 Gitea issues
+
Complete documented Sprint 2 backlog
+
Complete documented Sprint 3 backlog
+
Complete documented Final Submission backlog

        ↓ Sprint 1 close-out

Review Sprint 2 backlog
        ↓
Apply stakeholder feedback
        ↓
Apply implementation discoveries
        ↓
Split / combine / reprioritise where justified
        ↓
Create detailed Sprint 2 Gitea issues
        ↓
Assign labels, owners and Sprint 2 milestone

        ↓ Sprint 2 close-out

Review and refine Sprint 3 backlog
        ↓
Create detailed Sprint 3 Gitea issues

        ↓ Sprint 3 close-out

Review actual remaining release work
        ↓
Create detailed Final Submission Gitea issues
```

This is progressive refinement, not postponed planning.

The work itself is already identified in this roadmap.

Only its detailed implementation form is deferred until the relevant sprint approaches.

### 14.1 Reviewing the Future Backlog

Future backlog items must be reviewed before being converted into Gitea issues.

The review should consider:

- whether the requirement is still applicable;
- stakeholder feedback;
- lessons from completed work;
- new technical information;
- dependencies;
- defects;
- performance evidence;
- security findings;
- available team capacity; and
- whether the planned work should be divided or combined.

### 14.2 Recording Changes

The roadmap is allowed to evolve.

A planned future backlog item may be:

- clarified;
- split;
- combined;
- reprioritised;
- moved to another milestone;
- replaced by a better implementation approach; or
- removed where formally justified.

Material changes must not happen silently.

Where the roadmap changes materially, the team must record:

- what changed;
- why it changed;
- the evidence or stakeholder feedback supporting the change; and
- the effect on project scope or milestone targets.

This makes the original Sprint 1 plan and its later evolution traceable.

---

## 15. Backlog Maintenance Rules

The backlog is a living planning artifact.

When stakeholder feedback or implementation discoveries change required work:

1. review the relevant planned backlog item;
2. update an existing Gitea issue where one already exists;
3. create a new issue where the work becomes a separate actionable unit;
4. update dependencies;
5. reprioritise the Project board where necessary;
6. update the relevant milestone where justified;
7. record important requirement changes;
8. update architecture or ADR documentation where technical decisions change; and
9. update this document where the project roadmap changes materially.

Requirements must not be changed silently.

Duplicate issues must not be created merely to make a catalogue appear complete.

Where one existing issue legitimately satisfies multiple catalogue items, the relationship should be documented.

Where an issue becomes too large to review or complete comfortably, it should be split into smaller issues.

---

## 16. Completion of Issue #36

Issue #36 establishes and prioritises the complete project backlog and development roadmap.

The project backlog established under #36 has two forms:

1. **Current actionable work** — detailed Gitea issues for the active Sprint 1 planning horizon.
2. **Future planned work** — complete, prioritised Sprint 2, Sprint 3 and Final Submission backlog items documented in this file.

The distinction is intentional.

Closing #36 does not mean that future work is implemented.

It does not mean that every future backlog item already has a Gitea issue number.

It means that the complete development path has been:

- identified;
- organised by milestone;
- categorised by requirement tier;
- prioritised;
- documented;
- connected to the project roadmap; and
- given a defined future refinement process.

### Issue #36 Completion Checklist

- [x] the four project delivery periods are defined;
- [x] milestone goals are documented;
- [x] milestone expected outcomes are documented;
- [x] project-wide prioritisation rules are documented;
- [x] the complete Sprint 1 backlog is documented;
- [x] current Sprint 1 implementation work is mapped to Gitea issues;
- [x] Sprint 1 dependencies and priority order are documented;
- [x] the Basic vertical slice is traceable through Sprint 1 work;
- [x] the complete Sprint 2 backlog is documented;
- [x] all 40 planned Sprint 2 work areas are identified;
- [x] the complete Sprint 3 backlog is documented;
- [x] all 28 planned Sprint 3 work areas are identified;
- [x] the complete Final Submission backlog is documented;
- [x] all 10 planned Final Submission work areas are identified;
- [x] Basic, Intermediate, Advanced and Common work is distinguishable;
- [x] future backlog refinement timing is documented;
- [x] future Gitea issue creation timing is documented;
- [x] stakeholder and implementation feedback are explicitly included in the refinement process;
- [x] material roadmap changes are required to be recorded;
- [x] the relationship between the repository roadmap and Gitea tracking is defined.

Issue #36 may therefore be closed once:

- this document is reviewed;
- the associated Sprint 1 planning evidence is reviewed;
- the Pull Request containing the planning work passes the applicable checks; and
- the Pull Request is approved and merged.

Future Sprint 2, Sprint 3 and Final Submission issue creation is part of the normal progressive sprint-refinement process and does not require issue #36 to remain open.

---

## 17. Review Cadence

The project backlog should be reviewed:

- during sprint planning;
- during sprint close-out;
- after significant stakeholder feedback;
- when implementation discoveries materially affect future work;
- when an important architecture decision changes;
- when priorities or blockers change substantially; and
- before the next sprint's planned items are converted into detailed Gitea issues.

Routine status changes do not require this document to be rewritten.

Current execution status remains on the Gitea Project board.

The project roadmap should retain enough history to demonstrate how the development plan evolved over the semester.

---

## AI Declaration

The preceding document was planned, reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol] for backlog structuring, roadmap planning and documentation editing.

The project team remains responsible for verifying all issue mappings, requirements, milestone allocations, priorities, dependencies and planning decisions recorded in this document.

The Issue #577 Sprint 3 backlog refinement was reviewed and edited with the
assistance of ChatGPT-Web[GPT-5.6 Sol].
