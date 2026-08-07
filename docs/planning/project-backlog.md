# Project Backlog and Milestone Plan

| Document Information    | Details                                                   |
| ----------------------- | --------------------------------------------------------- |
| Project                 | Sport Analytics Tool                                      |
| Related Issue           | #36                                                       |
| Methodology             | Lightweight Scrumban                                      |
| Planning Target         | Advanced-tier feature completeness by the end of Sprint 3 |
| Final Submission Target | Hardening, evidence, documentation and release packaging  |
| Last Updated            | 7 August 2026                                             |
| Status                  | Active planning document                                  |

---

## 1. Purpose

This document records the high-level project backlog, milestone allocation and prioritisation approach for the Sport Analytics Tool.

It supports issue #36 by providing a persistent repository record of:

- the agreed milestone outcomes;
- the current Sprint 1 backlog;
- existing Gitea issues mapped to project requirements;
- work that still requires refinement or a dedicated Gitea issue;
- dependencies between foundation and implementation work;
- the planned Sprint 2, Sprint 3 and Final Submission scope; and
- the rules used when refining future work.

This document does not replace Gitea.

Gitea Issues, Milestones and the Project board remain the authoritative source for:

- issue status;
- assignees;
- acceptance criteria;
- dependencies;
- board position;
- Pull Requests; and
- completion evidence.

This document acts as a planning index and milestone snapshot.

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

Sprint 1 work is refined first because it represents the current delivery period.

Sprint 2 and Sprint 3 work may remain at roadmap level until refinement one sprint ahead.

Future work must not be moved to `Ready` merely because it appears in this document.

An issue may move to `Ready` only once it satisfies the project Definition of Ready, including:

- a clear purpose;
- an understood expected outcome;
- acceptance criteria;
- identified dependencies;
- required stakeholder clarification;
- an appropriate assignee;
- a scope small enough to complete within the sprint; and
- an understood verification approach.

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
2. work required for the current sprint;
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

Basic functionality must remain reliable before significant effort is redirected toward Intermediate or Advanced functionality.

---

## 4. Milestone Outcomes

### Sprint 1 — Working Basic Vertical Slice

Sprint 1 targets a deployed and documented Basic vertical slice.

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

Sprint 1 must also establish the technical, testing, documentation and deployment foundations required by later work.

### Sprint 2 — Complete Basic and Intermediate

Sprint 2 targets:

- completion of any remaining Basic requirements; and
- completion of the Intermediate feature tier.

This includes:

- file-based and batch submissions;
- resumable and idempotent processing;
- review and publication workflows;
- event corrections and audit history;
- competition, season and career aggregates;
- selective recomputation;
- performance testing and optimisation;
- API versioning;
- API keys, quotas and rate limits;
- caching;
- external API integration;
- dataset releases;
- formal user testing; and
- Intermediate documentation and testing.

### Sprint 3 — Advanced Feature Completion

Sprint 3 targets the Advanced feature tier.

This includes:

- analyst-defined custom statistics;
- safe and versioned statistic definitions;
- full-history statistic evaluation;
- live event ingestion;
- duplicate, late and out-of-order event handling;
- deterministic replay;
- temporal and as-of-date statistics;
- dataset release comparisons;
- aggregate query APIs;
- asynchronous large-query jobs;
- change feeds;
- API deprecation and backwards-compatibility testing;
- usage metering;
- anomaly detection;
- conflicting-submitter reconciliation;
- downstream correction propagation;
- production observability; and
- Advanced testing and documentation.

### Final Submission — Hardening and Release

No major new feature scope should normally be introduced during Final Submission.

The period is reserved primarily for:

- defect resolution;
- release hardening;
- production verification;
- database backup and restore verification;
- security testing;
- accessibility testing;
- performance testing;
- browser compatibility;
- final documentation;
- requirements traceability;
- known limitation records;
- demonstration preparation;
- reports;
- presentation material;
- release notes;
- version tagging; and
- submission packaging.

---

## 5. Existing Project and Foundation Issues

The following issues already establish the repository, infrastructure, governance and technical foundations of the project.

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

These issues must not be duplicated merely because a later planning item describes related work.

Where later implementation issues extend an existing foundation issue, the relationship should be recorded as a dependency or predecessor.

---

## 6. Sprint 1 Requirement-to-Issue Mapping

The Sprint 1 planning catalogue contains 36 work areas.

The following table records the current verified mapping between those work areas and Gitea issues.

Where multiple issues are listed, they collectively satisfy or support the catalogue item.

| Catalogue ID | Sprint 1 Work                                                                                               | Gitea Mapping                                 |
| ------------ | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| S1-01        | Confirm sport, professional competition scope, fixture definition, event vocabulary and required statistics | #37                                           |
| S1-02        | Clarify Basic, Intermediate and Advanced acceptance decisions with the stakeholder                          | Pending dedicated mapping                     |
| S1-03        | Create requirements traceability matrix and requirement change log                                          | Pending dedicated mapping                     |
| S1-04        | Produce complete system architecture, data flow, deployment design and development roadmap                  | #38, follow-up #73                            |
| S1-05        | Record architecture decisions for caching, background jobs, file storage and live ingestion                 | #55                                           |
| S1-06        | Produce information architecture, user journeys and responsive wireframes                                   | #56                                           |
| S1-07        | Define accessible design system and reusable frontend component baseline                                    | #57                                           |
| S1-08        | Define stable identifiers and shared API response, error, filtering, sorting and pagination contracts       | #58                                           |
| S1-09        | Create OpenAPI baseline and API versioning and deprecation conventions                                      | #59                                           |
| S1-10        | Implement repeatable database migrations and development seed tooling                                       | #60                                           |
| S1-11        | Implement competition, season, competitor, participant and fixture database schema                          | #46                                           |
| S1-12        | Implement application account, role, approved-submitter and scope database schema                           | #43                                           |
| S1-13        | Implement submission, ordered-event, provenance and correction database schema                              | #61, building on #27                          |
| S1-14        | Implement backend database repository and transaction foundation                                            | #62                                           |
| S1-15        | Create representative development seed and reference fixture dataset                                        | #63, supported by #28                         |
| S1-16        | Configure managed authentication provider and account authentication foundation                             | #14                                           |
| S1-17        | Implement account synchronisation, profile API and role-based authorisation                                 | #44                                           |
| S1-18        | Implement reusable authentication, role, approval and scope authorisation                                   | #44, with submission scope enforcement in #51 |
| S1-19        | Implement frontend authentication state, protected routes and authenticated API client                      | #64                                           |
| S1-20        | Build Create Account, Sign In, Account, Sign Out and authentication navigation                              | #39                                           |
| S1-21        | Build accessible sign-up and sign-in forms                                                                  | #39, supported by #57                         |
| S1-22        | Build forgotten-password and password-reset flow                                                            | #65                                           |
| S1-23        | Implement secure account deletion across authentication and application data                                | #66                                           |
| S1-24        | Implement administrator APIs for submitter approval, revocation and scope assignment                        | #45                                           |
| S1-25        | Build administrator submitter approval and scope-management interface                                       | #45                                           |
| S1-26        | Define executable delivery submission schema and valid/invalid validation examples                          | #49                                           |
| S1-27        | Implement event validation with detailed and structured rejection messages                                  | #50                                           |
| S1-28        | Implement approved-submitter event submission with provenance and scope enforcement                         | #51                                           |
| S1-29        | Implement public fixture and ordered-event APIs with filtering and pagination                               | #47 and #67                                   |
| S1-30        | Implement Basic event-derived fixture statistics and public statistics API                                  | #52                                           |
| S1-31        | Build first public competition, fixture, event and statistics browsing experience                           | #48 and #54                                   |
| S1-32        | Add backend and frontend tests for the Basic vertical slice                                                 | #68, supported by testing foundation #72      |
| S1-33        | Repair Azure deployment workflows for the current monorepo and add deployed smoke checks                    | #69, building on #15 and #17                  |
| S1-34        | Automate MkDocs deployment from Gitea to Cloudflare Pages                                                   | #29, building on #11                          |
| S1-35        | Publish Sprint 1 setup, architecture, API, testing documentation and evidence                               | #70                                           |
| S1-36        | Conduct Sprint 1 stakeholder review, retrospective and milestone tag                                        | #71                                           |

---

## 7. Additional Sprint 1 Implementation Issues

The following implementation issues form the main Sprint 1 product work.

### Account, Authentication and Authorisation

| Issue | Work                                                                         |
| ----- | ---------------------------------------------------------------------------- |
| #14   | OAuth/OIDC authentication foundation                                         |
| #39   | Frontend authentication pages and navigation controls                        |
| #43   | Account, role, approved-submitter and scope database schema                  |
| #44   | Account synchronisation, profile API and role-based authorisation            |
| #45   | Administrator submitter approval and scope management                        |
| #64   | Frontend authentication state, protected routes and authenticated API client |
| #65   | Forgotten-password and password-reset flow                                   |
| #66   | Secure account deletion across authentication and application data           |

Issue #66 currently contains legacy Firebase terminology in its title.

Because ADR-004 and the current architecture use Supabase Auth, #66 should be renamed before implementation to:

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

Future backlog issues must therefore use the current Supabase Auth terminology and must not introduce Firebase as a parallel authentication implementation unless a later approved ADR explicitly supersedes ADR-004.

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

### Priority F — Verification and Sprint Close-out

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
- the sprint review must be completed;
- known limitations must be recorded;
- required checks must pass for the approved milestone state; and
- the Sprint 1 milestone tag must identify the reviewed `main` commit.

---

## 10. Sprint 1 End-to-End Trace

The main Sprint 1 product flow can now be traced directly to Gitea issues.

### 1. Define the Sport

```text
#37
```

Confirm T20 cricket terminology, competition scope, fixtures, events and required statistics.

### 2. Establish Architecture

```text
#38
#55
#58
#59
#73
```

Define the system boundaries, service interactions, API conventions and technical decisions.

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

Support account authentication, frontend auth state, account resolution and role-based access.

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

Compute fixture statistics from accepted event data rather than treating statistics as independent source data.

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

Sprint 2 targets completion of all remaining Basic functionality and the complete Intermediate tier.

Planned work includes:

### Remaining Basic Functionality

- remaining public competition and participant APIs;
- remaining administration CRUD operations;
- public browsing improvements;
- administrator management pages;
- JSON and CSV uploads;
- submission history;
- submitter workflow improvements;
- event corrections;
- statistic provenance;
- exports;
- external API integration;
- complete Basic end-to-end acceptance testing;
- accessibility testing;
- security testing; and
- formal user testing.

### Intermediate Functionality

- batch submission design;
- staging;
- asynchronous processing;
- accepted/rejected batch reports;
- idempotent processing;
- resumable processing;
- review and publication workflow;
- conflicting-event checks;
- correction history;
- season aggregates;
- career aggregates;
- competition aggregates;
- selective recomputation;
- golden reference results;
- representative-scale performance testing;
- database optimisation;
- explicit API versioning;
- consumer API keys;
- rate limits;
- quotas;
- caching;
- versioned dataset releases;
- release downloads;
- Intermediate integration testing; and
- Intermediate documentation.

These items remain part of the committed roadmap.

They should be converted into or mapped against Gitea issues during Sprint 2 refinement.

They remain in `Backlog` until they satisfy the Definition of Ready.

---

## 12. Sprint 3 Planned Backlog

Sprint 3 targets completion of the Advanced feature tier.

The Advanced backlog includes:

- custom-statistic definition language;
- statistic-definition versioning;
- safe statistic execution;
- full-history custom-statistic evaluation;
- custom-statistic APIs;
- custom-statistic frontend;
- statistic provenance;
- correction propagation;
- live event ingestion;
- duplicate live-event handling;
- late and out-of-order event handling;
- deterministic replay;
- temporal history;
- as-of-date statistics;
- dataset release comparison;
- aggregate query APIs;
- asynchronous large-query jobs;
- change feeds;
- API deprecation mechanisms;
- contract compatibility testing;
- consumer usage reporting;
- anomaly detection;
- conflicting-submitter reconciliation;
- downstream correction propagation;
- Advanced correctness and performance testing;
- production observability;
- application-wide accessibility and UX polish;
- security and recovery review;
- Advanced technical documentation; and
- stakeholder acceptance testing.

These items remain in the project roadmap but should not be marked `Ready` until they have been refined into actionable issues.

---

## 13. Final Submission Planned Backlog

The Final Submission phase includes:

1. triage and resolve release-blocking defects;
2. verify production migrations, backups and restore procedures;
3. verify production secrets and deployment configuration;
4. complete performance, security, accessibility and browser audits;
5. finalise requirements traceability and the known-limitations register;
6. finalise database, third-party, licence, testing and AI documentation;
7. prepare a reproducible demonstration dataset and scripted demonstration;
8. prepare the group presentation;
9. complete group report, individual reports and peer-review evidence; and
10. produce release notes, the final version tag and submission package.

The Final Submission period is not intended to become a fourth major feature-development sprint.

---

## 14. Backlog Maintenance Rules

The backlog is a living planning artifact.

When stakeholder feedback or implementation discoveries change the required work:

1. update the relevant Gitea issue where possible;
2. create a new issue where the work is genuinely separate;
3. update issue dependencies;
4. reprioritise the Project board where necessary;
5. record important requirement changes;
6. update architecture or ADR documentation where technical decisions change; and
7. update this document where milestone scope changes materially.

Requirements must not be changed silently.

Duplicate issues must not be created merely to make the catalogue appear complete.

Where one existing issue legitimately satisfies multiple catalogue items, that relationship should be documented.

Where an issue becomes too large to review or complete comfortably within a sprint, it should be split into smaller issues.

---

## 15. Remaining Work for Issue #36

Issue #36 represents the creation and prioritisation of the overall project backlog.

The current checkpoint has established:

- [x] the four delivery-period outcomes;
- [x] the project prioritisation rules;
- [x] the existing project-foundation issue mapping;
- [x] the Sprint 1 catalogue;
- [x] the current Sprint 1 Gitea issue mappings;
- [x] the dependency order for Sprint 1;
- [x] the Basic vertical-slice trace;
- [x] the Sprint 2 roadmap;
- [x] the Sprint 3 roadmap;
- [x] the Final Submission roadmap;
- [x] current Supabase Auth terminology;
- [x] testing, deployment and documentation close-out work;
- [ ] S1-02 has a verified dedicated Gitea issue;
- [ ] S1-03 has a verified dedicated Gitea issue;
- [ ] issue #66 has been renamed to remove legacy Firebase terminology;
- [ ] Sprint 2 issues are fully refined and mapped before Sprint 2 begins;
- [ ] Sprint 3 issues are fully refined and mapped before Sprint 3 begins;
- [ ] Final Submission tasks are mapped before final release planning;
- [ ] milestone allocation and ownership are reviewed by the team.

Until the remaining roadmap is refined, documentation Pull Requests updating this planning artifact should reference:

```text
Refs #36
```

rather than automatically closing the backlog issue.

---

## 16. Review Cadence

The backlog should be reviewed:

- during Sprint planning;
- after significant stakeholder feedback;
- during standups when priorities or blockers change;
- before moving work from `Backlog` to `Ready`;
- when an architecture decision materially changes planned work; and
- during sprint close-out.

The planning document does not need to be rewritten after every small issue-status change.

Routine workflow status remains on the Gitea Project board.

---

## AI Declaration

The preceding document was planned, generated and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].

The project team remains responsible for verifying all issue mappings, milestone allocations, requirements, dependencies and prioritisation decisions recorded in this document.
