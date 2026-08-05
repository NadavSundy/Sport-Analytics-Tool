# Git Methodology

| Document Information | Details                       |
| -------------------- | ----------------------------- |
| Project              | Sport Analytics Tool          |
| Platform             | Gitea                         |
| Methodology          | GitHub Flow adapted for Gitea |
| Document Version     | 1.0                           |
| Date                 | 4 August 2026                 |
| Status               | Approved for Use              |
| Team                 | Git Push Pray                 |

## 1. Purpose

This document defines the Git methodology that will be followed throughout the development of the Sport Analytics Tool.

The methodology establishes:

- when commits must be created;
- how commit messages must be written;
- when branches must be created;
- how branches must be named;
- when branches may be merged;
- the requirements that must be met before merging;
- when project versions must be created; and
- how project versions must be named.

The purpose of the methodology is to maintain an organised repository, support effective collaboration, reduce merge conflicts, enable code review and provide traceability between requirements and their implementation.

All team members are required to apply this methodology consistently across all project repositories.

## 2. Selected Methodology

The team will use **GitHub Flow adapted for Gitea**.

Under this methodology:

1. `main` contains the latest reviewed and working version of the project.
2. Each significant unit of work begins as a Gitea issue.
3. A short-lived branch is created for the issue.
4. Development is completed through small, meaningful commits.
5. The branch, commits and Pull Request reference the issue.
6. A Pull Request is reviewed before it is merged.
7. Approved work is merged into `main`.
8. Important milestone states are identified using Git tags.

This methodology was selected because it provides sufficient control, traceability and peer review without introducing unnecessary permanent branches or administrative processes.

A more complex methodology, such as Git Flow, would require additional `develop`, `release` and `hotfix` branches. These branches are not necessary for the size, duration or release structure of this project.

The selected methodology is therefore intended to remain lightweight enough to be followed consistently by all team members.

## 3. The `main` Branch

The `main` branch represents the latest integrated, reviewed and working version of the project.

The following rules apply to `main`:

- Direct development on `main` is prohibited.
- Direct pushes to `main` are prohibited.
- Changes may only enter `main` through an approved Gitea Pull Request.
- `main` must remain in a buildable and working state.
- Force pushes to `main` are prohibited.
- Required automated checks must pass before a Pull Request may be merged.
- Milestone version tags may only be created from `main`.

The `main` branch will be protected using Gitea’s branch-protection settings where these settings are available.

## 4. Gitea Issues and Traceability

Every significant development task must begin as a Gitea issue.

An issue must contain:

- a clear title;
- a description of the required work;
- acceptance criteria;
- an assigned team member;
- the relevant sprint milestone; and
- appropriate labels.

Examples of work that requires an issue include:

- implementing a feature;
- fixing a bug;
- creating or changing an API endpoint;
- changing the database schema;
- adding automated tests;
- configuring infrastructure or CI/CD;
- completing substantial documentation; and
- performing a technical investigation that will influence development.

Very small corrections, such as correcting a spelling error, may be included in an existing relevant issue.

Each significant change will follow the traceability chain below:

```text
Gitea issue → branch → commits → Pull Request → merge
```

For example, work related to issue `#12` would be recorded as follows:

```text
Issue:        #12 Validate event submissions
Branch:       feat/12-validate-event-submissions
Commit body:  Refs #12
Pull Request: #12 Validate event submissions
PR body:      Closes #12
```

This process allows the team to trace completed work back to its original requirement, implementation, review and final integration.

## 5. When to Create a Branch

A branch must be created when a team member begins work on a Gitea issue involving code, tests, configuration or substantial documentation.

Before creating a branch:

1. The related Gitea issue must exist.
2. The issue must have a clear description.
3. The issue must contain acceptance criteria.
4. The issue must have an assignee.
5. The issue must be assigned to the relevant sprint milestone.
6. The developer must update their local copy of `main`.

The branch must be created from the latest version of `main`.

```bash
git switch main
git pull origin main
git switch -c feat/12-validate-event-submissions
```

A branch should normally address one Gitea issue.

Where two issues cannot reasonably be separated, both issue numbers must be identified in the Pull Request description.

Branches must be short-lived. A normal branch should be completed within five working days. A branch may not remain open beyond the sprint in which it was created unless the delay and reason are recorded in the related issue.

If a branch becomes too large to review effectively, the work must be divided into smaller issues and branches.

## 6. How to Name Branches

Branch names must follow this format:

```text
<type>/<issue-number>-<short-description>
```

The approved branch types are:

| Type       | Purpose                                          |
| ---------- | ------------------------------------------------ |
| `feat`     | New functionality                                |
| `fix`      | Correction of incorrect behaviour                |
| `docs`     | Documentation changes                            |
| `test`     | Test creation or modification                    |
| `refactor` | Code restructuring without a change in behaviour |
| `chore`    | Maintenance, setup or configuration              |
| `ci`       | Continuous integration or deployment changes     |

Examples include:

```text
feat/12-validate-event-submissions
fix/18-prevent-duplicate-statistics
docs/21-add-api-documentation
test/24-test-event-validation
refactor/31-extract-statistics-service
chore/7-configure-project
ci/9-add-backend-pipeline
```

Branch names must:

- use lowercase letters;
- contain the related issue number;
- separate words using hyphens;
- contain no spaces;
- use a concise but meaningful description; and
- reflect the main purpose of the branch.

## 7. When to Commit

A commit must be created whenever one small, logically complete unit of work has been completed.

Each commit must:

- represent one identifiable change;
- relate to the issue assigned to the branch;
- leave the affected section of the project in a working state;
- not knowingly introduce compilation or build failures;
- not knowingly cause existing tests to fail;
- exclude unrelated changes; and
- be understandable independently of later commits.

Examples of suitable commits include:

- creating the fixture database model;
- adding event-schema validation;
- implementing one API endpoint;
- correcting one calculation error;
- adding tests for one endpoint;
- updating the setup instructions for one service.

A commit must not combine unrelated work. For example, a single commit should not contain an unrelated API feature, user-interface redesign and documentation rewrite.

Developers must commit regularly and must not wait until an entire sprint or large feature has been completed before creating a commit.

Temporary commits may be used while work is in progress. However, commits with unclear messages such as `WIP`, `fix stuff` or `more changes` must not remain in a branch submitted for final review.

## 8. How to Write Commit Messages

The team will use a simplified Conventional Commit format.

The required format is:

```text
<type>(<scope>): <description>
```

The scope may be omitted when it does not provide useful additional information:

```text
<type>: <description>
```

### 8.1 Approved Commit Types

| Type       | Purpose                                           |
| ---------- | ------------------------------------------------- |
| `feat`     | Adds new functionality                            |
| `fix`      | Corrects incorrect behaviour                      |
| `docs`     | Changes documentation only                        |
| `test`     | Adds or modifies tests                            |
| `refactor` | Restructures code without changing behaviour      |
| `chore`    | Changes maintenance, setup or configuration files |
| `ci`       | Changes the CI/CD process                         |

### 8.2 Commit Message Requirements

The commit description must:

- begin with a lowercase verb;
- state what the commit accomplishes;
- be concise but specific;
- use the imperative form; and
- avoid vague descriptions.

Acceptable commit messages include:

```text
feat(api): add event submission endpoint
fix(stats): prevent duplicate events from affecting totals
test(api): add invalid event submission cases
docs(setup): document local database configuration
ci: run backend tests on pull requests
```

Unacceptable commit messages include:

```text
updated files
fixed things
more work
changes
final version
stuff
```

### 8.3 Linking Commits to Issues

Every normal development commit must reference the related Gitea issue in its commit body.

```text
feat(api): validate submitted event structure

Refs #12
```

The issue will normally be closed by the Pull Request rather than by an individual commit. This ensures that the issue remains open until all associated work has been reviewed and merged.

Merge commits, automated dependency commits and automatically generated revert commits are exempt from the normal issue-reference requirement where a manual reference would not be appropriate.

### 8.4 AI-Assisted Code

Where AI-generated code is included in a commit, the commit body must include the required tool and model attribution.

```text
feat(api): validate submitted event structure

Refs #12
Assisted-by: ChatGPT-Web[GPT-5.6 Thinking]
```

Only tools and models genuinely used in producing the code contained in that commit may be listed.

---

## 9. When to Open a Pull Request

A Pull Request must be opened when the work on a branch is ready for review.

Before opening a Pull Request, the author must:

1. review the changes personally;
2. update the branch with the latest version of `main`;
3. resolve all merge conflicts;
4. run the relevant tests locally;
5. remove debugging code and unnecessary temporary files;
6. confirm that the issue’s acceptance criteria have been addressed;
7. update relevant documentation;
8. confirm that no credentials or sensitive information have been committed; and
9. include the required AI attribution where applicable.

A draft Pull Request may be opened earlier when feedback is required before the work is complete. A draft Pull Request must be clearly identified and may not be merged.

The Pull Request title must contain the related issue number:

```text
#12 Validate event submissions
```

The Pull Request description must include:

```markdown
## Purpose

Explain why the change is required.

## Changes

Summarise the main changes made.

## Testing

Explain how the change was tested.

## Known Limitations

List any remaining limitations, or state that none are known.

## Related Issue

Closes #12
```

## 10. When to Merge

A branch may only be merged after its Pull Request has completed the required review and verification process.

A developer may not merge their own Pull Request without approval from at least one other team member.

The team will use **merge commits** when merging Pull Requests into `main`.

Merge commits were selected because they preserve:

- the individual development commits;
- the identity of the feature branch;
- the Pull Request as a distinct unit of work; and
- the relationship between the issue and its implementation.

After a Pull Request has been merged:

1. The related Gitea issue must be closed.
2. The completed branch must be deleted from Gitea.
3. The associated Project board item must be moved to `Done`.
4. Any incomplete or follow-up work must be recorded as a new issue.

## 11. Requirements for Merging

A Pull Request may be merged only when all the following requirements have been satisfied.

### 11.1 Issue and Scope

- The Pull Request is linked to at least one Gitea issue.
- The issue’s acceptance criteria have been met.
- The Pull Request contains no unrelated changes.
- Any approved change in scope has been recorded in the issue.

### 11.2 Description

- The purpose of the change is explained.
- The main implementation changes are summarised.
- The testing process is described.
- Known limitations are documented.
- The related issue is identified using `Closes #<issue-number>`.

### 11.3 Review

- The author has reviewed their own changes.
- At least one team member other than the author has reviewed the Pull Request.
- At least one approval has been recorded.
- All reviewer comments have been answered.
- All requested changes have been implemented or formally resolved.
- The reviewer has confirmed that the implementation matches its stated purpose.

### 11.4 Testing and Quality

- All relevant automated tests pass.
- Existing tests continue to pass.
- All required CI checks pass.
- Formatting, linting and type-checking checks pass where configured.
- The affected application or service builds successfully.
- Deployment checks pass where the change affects deployment.
- No unresolved merge conflicts remain.
- No credentials, secrets or sensitive information are included.
- No unnecessary generated or temporary files are included.

### 11.5 Documentation

- Relevant technical documentation has been updated.
- Setup instructions have been updated where necessary.
- API documentation has been updated where an endpoint or schema changed.
- Database documentation has been updated where the schema changed.
- AI assistance has been declared where required.

A Pull Request that does not meet every applicable requirement must not be merged.

## 12. When to Create a Version

A project version will be created when the team reaches a formal assessed milestone and the corresponding code has been reviewed and stabilised.

Versions will be created for:

- Sprint 1;
- Sprint 2;
- Sprint 3; and
- the final submission.

A version may only be created when:

1. All work included in the milestone has been merged into `main`.
2. The milestone version builds successfully.
3. All required automated checks pass.
4. The team has reviewed the milestone state.
5. Known defects and limitations have been documented.
6. The exact commit being submitted has been confirmed.
7. The repository documentation accurately reflects the submitted state.

The version will be recorded using an annotated Git tag created from `main`.

## 13. How to Name Versions

The project will use descriptive milestone versioning.

The primary version tags will be:

```text
sprint-1
sprint-2
sprint-3
final-submission
```

If an authorised correction is required after a milestone version has been created, the corrected version will use a numbered revision:

```text
sprint-1.1
sprint-1.2
```

An existing tag may not be moved, renamed or overwritten. A new tag must be created so that the original submitted version remains available.

Descriptive milestone versioning was selected because the project’s most significant development versions correspond directly with its assessed milestones. This makes versions clear to both the development team and project assessors.

## 14. Standard Development Workflow

All significant work must follow the process below:

1. Create a Gitea issue.
2. Add a description and acceptance criteria.
3. Assign the issue to a team member and sprint milestone.
4. Update the local `main` branch.
5. Create a branch containing the issue number.
6. Complete the work using small, atomic commits.
7. Reference the issue in each applicable commit.
8. Test and review the work locally.
9. Open a Pull Request linked to the issue.
10. Obtain approval from another team member.
11. Resolve all review comments.
12. Ensure all required checks pass.
13. Merge the Pull Request into `main` using a merge commit.
14. Close the issue.
15. Delete the completed branch.
16. Move the Project board item to `Done`.
17. Create a version tag when the relevant milestone is complete.

## 15. Methodology Review and Change Control

This methodology is intended to remain in use for the duration of the project.

The team will not change the methodology merely because another process appears more convenient or because individual team members prefer a different workflow. Consistent use is necessary to maintain an understandable repository history and provide reliable evidence of the team’s development process.

The methodology may only be changed where there is clear evidence that the current process is causing significant or repeated problems. Examples include:

- repeated merge conflicts caused by the workflow;
- substantial delays in reviewing or integrating work;
- a Gitea limitation that prevents the methodology from being followed;
- a process requirement that creates unnecessary work without providing value;
- difficulty tracing issues to their implementation; or
- a project change that makes the existing methodology unsuitable.

Before changing the methodology:

1. The problem must be discussed by the full team.
2. Evidence of the problem must be identified.
3. The proposed change and its expected benefit must be explained.
4. The change must be approved by a majority of the team.
5. The decision must be recorded in the project documentation.
6. This document must be updated with a new version number and effective date.
7. The revised process must be applied consistently from that date onward.

Changes will not be applied retrospectively. Work completed before the effective date of a methodology change will remain governed by the version of the methodology in effect at that time.

Minor wording corrections that do not alter the actual development process may be made without following the full change procedure.

## AI Declaration

The preceding document was planned, generated, reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Thinking].
