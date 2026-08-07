# Project File Structure Documentation

**User:** Anonymous  
**Created:** 8/5/2026 11:18:23  
**Updated:** 8/5/2026 11:19:13  
**Exported:** 8/7/2026 12:51:17  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3-sdp/c/6a72ffb0-b9f0-83ea-884e-daede06ed762](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3-sdp/c/6a72ffb0-b9f0-83ea-884e-daede06ed762)  

## Prompt:
8/5/2026, 11:18:20 AM

give me the things to add to the project that i did - all the file structure stuff

sinmilar to the below
Logo
Issues
Pull Requests
Milestones
Explore
git-push-pray
/
Sport-Analytics-Tool
Internal
Code
Issues
Pull Requests
Actions
1
Packages
Projects
1
Releases
Wiki
Activity
Settings
Add Git and project methodology documentation #2
Closed
opened 14 hours ago by Shayna · 0 comments

Shayna commented 14 hours ago
Member
Description
Add the approved Git Methodology and Project Methodology documents to the repository and link them from the main README.

Motivation
The project requires documented and consistently applied Git and project methodologies. Storing these documents in the repository provides a version-controlled record of the team’s agreed development processes.

Acceptance Criteria
A docs directory exists
docs/git-methodology.md exists
docs/project-methodology.md exists
The main README.md links to both methodology documents
Both Markdown documents render correctly in Gitea
The changes are reviewed through a Pull Request
The Pull Request is merged into main
Dependencies
None.

Evidence
The linked branch, commits and merged Pull Request will provide evidence of completion.

AI Declaration
The preceding issue was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Thinking].

 Shayna added this to the Sprint 1 milestone 14 hours ago
 Shayna self-assigned this 14 hours ago
 Shayna added this to the Sport-Analytics-Tool-Proj project 14 hours ago
 Shayna moved this to Ready in  Sport-Analytics-Tool-Proj on 14 hours ago
 Shayna added the 
area: documentation
type: documentation
 labels 14 hours ago
 Shayna moved this to In Progress in  Sport-Analytics-Tool-Proj on 14 hours ago
 Shayna referenced this issue from a commit 14 hours ago
docs: add development methodologies
 Dean referenced this issue 14 hours ago
docs: add development methodologies #3
 Shayna referenced a pull request that will close this issue 14 hours ago
#2 Add development methodology documentation #4
 Shayna moved this to In Review in  Sport-Analytics-Tool-Proj on 14 hours ago
 Shayna moved this to Done in  Sport-Analytics-Tool-Proj on 14 hours ago
 Shayna closed this issue 14 hours ago

Write
Preview
Leave a comment
Drop files or click here to upload.
area: documentation
type: documentation
Sprint 1
Sport-Analytics-Tool-Proj

Shayna
1 Participants

Notifications
Due Date
No due date set.

yyyy/mm/dd
Dependencies
No dependencies set.

Reference: git-push-pray/Sport-Analytics-Tool#2
 
Powered by Gitea
Version: 1.24.7 Page:
103ms
Template:
28ms
Licenses
API

## Response:
8/5/2026, 11:18:23 AM

## Issue Title

**Add initial repository structure and architecture documentation**

## Description

Create and document the initial monorepo-style file structure for the Sport Analytics Tool.

The repository will be organised into separate frontend, backend, shared, documentation, testing, infrastructure, and automation areas. Placeholder files and README documents will be added so that each major directory is preserved in Git and its purpose is clear to team members.

This task establishes the project foundation before feature development begins.

## Motivation

The project brief requires a **non-monolithic frontend and backend**, Git-compatible version control, CI/CD, a hand-written HTTP API, testing, documentation, and an organised application structure. The Milestone 1 rubric also awards marks for an organised file structure, repository READMEs, development guides, system design, and supporting implementation. `project_briefs (4).pdf`

Establishing the structure early will:

- Separate frontend and backend responsibilities.
- Provide a clear location for the hand-written API.
- Give every team member a consistent development environment.
- Reduce merge conflicts and misplaced files.
- Prepare the repository for testing, CI/CD, deployment, and documentation.
- Provide evidence for the Milestone 1 version-control, development-plan, documentation, and implementation criteria.

## Planned Repository Structure

```text
Sport-Analytics-Tool/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── styles/
│   │   ├── types/
│   │   └── utils/
│   ├── tests/
│   └── README.md
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── types/
│   │   ├── utils/
│   │   └── validators/
│   ├── tests/
│   │   ├── integration/
│   │   └── unit/
│   └── README.md
│
├── shared/
│   ├── contracts/
│   ├── schemas/
│   ├── types/
│   └── README.md
│
├── database/
│   ├── migrations/
│   ├── seeds/
│   ├── schemas/
│   └── README.md
│
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── database/
│   ├── deployment/
│   ├── development/
│   ├── methodology/
│   ├── requirements/
│   ├── security/
│   ├── testing/
│   ├── ai/
│   └── file-structure.md
│
├── tests/
│   ├── end-to-end/
│   ├── fixtures/
│   ├── performance/
│   └── README.md
│
├── infrastructure/
│   ├── docker/
│   ├── deployment/
│   └── README.md
│
├── scripts/
│   └── README.md
│
├── .gitea/
│   ├── issue_template/
│   ├── pull_request_template.md
│   └── workflows/
│
├── .env.example
├── .gitignore
├── README.md
└── LICENSE
```

## Acceptance Criteria

- [ ] A separate `frontend/` directory exists.
- [ ] A separate `backend/` directory exists.
- [ ] The frontend and backend are structured as independent applications.
- [ ] A `shared/` directory exists for contracts, schemas, and types shared across application boundaries.
- [ ] Shared code does not contain backend business logic or directly couple the frontend to the database.
- [ ] A `database/` directory exists for migrations, seed data, schema documentation, and database-related resources.
- [ ] A `docs/` directory exists with appropriate documentation categories.
- [ ] `docs/file-structure.md` explains the repository structure and the responsibility of each major directory.
- [ ] A `tests/` directory exists for end-to-end, performance, and cross-application testing.
- [ ] Frontend and backend unit or integration tests remain within their respective application directories.
- [ ] An `infrastructure/` directory exists for deployment and container configuration.
- [ ] A `scripts/` directory exists for repository-level development and automation scripts.
- [ ] A `.gitea/` directory exists for workflow and contribution templates.
- [ ] A root `.env.example` documents required environment-variable names without containing real secrets.
- [ ] A root `.gitignore` excludes dependencies, build output, local environment files, logs, and other generated files.
- [ ] Empty directories contain a README or suitable placeholder so they are tracked by Git.
- [ ] The root `README.md` links to the file-structure documentation.
- [ ] All Markdown files render correctly in Gitea.
- [ ] The structure supports a hand-written HTTP API rather than generated database endpoints.
- [ ] The structure does not treat Supabase-generated endpoints as the project API.
- [ ] The changes are submitted through a feature or chore branch.
- [ ] The changes are reviewed through a Pull Request.
- [ ] CI checks pass before the Pull Request is merged.
- [ ] The Pull Request is merged into `main`.

## Dependencies

None.

This task should be completed before substantial frontend, backend, database, and API feature development begins.

## Evidence

The following will provide evidence of completion:

- Linked issue.
- Feature branch.
- Repository file tree.
- Added README and Markdown documentation files.
- Meaningful Git commits.
- Pull Request discussion and review.
- Successful CI run.
- Merged Pull Request.
- Updated project board status.

## Relevant Requirements and Rubric Criteria

- Git-compatible version control.
- Organised repository and file structure.
- Separate, non-monolithic frontend and backend.
- Hand-written HTTP API.
- Testing structure.
- CI/CD preparation.
- Public documentation preparation.
- Milestone 1 Version Control: **10%**.
- Milestone 1 Documentation Site: **10%**.
- Milestone 1 Getting Started / Development Guides: **5%**.
- Milestone 1 Initial Design and Development Plan: **20%**.
- Milestone 1 Implementation: **20%**. `project_briefs (4).pdf`

## Risks and Constraints

- The `shared/` directory must not become an undeclared middle-layer application or a second backend.
- The frontend must communicate with the backend through the team’s HTTP API.
- The frontend must not directly access protected database tables.
- Supabase may be used as a database or authentication provider, but its generated REST endpoints must not replace the team’s hand-written API.
- Secrets, passwords, service-role keys, tokens, and production connection strings must never be committed.
- Placeholder folders must later be replaced with meaningful implementation and documentation.
- An organised structure alone is not enough for the Advanced rubric level; the team must consistently use it and all members must make meaningful contributions.

## AI Declaration

The preceding issue was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Thinking].

The AI policy requires the tool, model, and purpose of AI assistance to be attributed. Code generated with AI must additionally be declared in the relevant commit message. `ai_policy.pdf`



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)