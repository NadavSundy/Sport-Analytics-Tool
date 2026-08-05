# ADR-001: Initial Repository Setup Before Governance Enforcement

- **Status:** Accepted
- **Date:** 2026-08-05
- **Participants:** Git Push Pray
- **Related Issues:** #7, #8

## Context

The repository was initially created before the approved Git Methodology and Project Methodology were fully operational.

The initial project scaffold established the repository structure, including the frontend, backend, shared contracts, database folders, documentation, testing structure, CI configuration, deployment planning and evidence directories.

However, the initial scaffold was committed directly to `main` without:

- a preceding Gitea issue;
- a dedicated issue branch;
- a Pull Request;
- a recorded peer review; or
- branch protection being configured.

No issue was created for the initial scaffold before the commit was made.

Branch protection had not yet been configured because the required repository administrator access was unavailable.

The scaffold provides a useful project foundation and should not be removed solely because the approved methodology was not yet being enforced.

## Decision

The team will not delete, revert or rewrite the existing Git history.

The initial repository scaffold will be treated as a one-time pre-methodology setup deviation.

The deviation will be documented transparently rather than attempting to recreate or conceal the original work.

From Issue #7 onward, all significant project work must follow the approved workflow:

```text
Gitea issue → branch → atomic commits → Pull Request → peer review → merge
```

Repository governance files and templates will be aligned with the approved Git Methodology and Project Methodology before the team begins parallel setup work.

Branch protection is tracked separately in Issue #8 and will remain blocked until repository administrator access becomes available.

## Alternatives Considered

### Rewrite the Existing Git History

This option was rejected because rewriting shared history could remove useful evidence, disrupt other team members and create unnecessary technical risk.

### Revert the Scaffold and Recreate It Through an Issue and Pull Request

This option was rejected because the scaffold already provides a useful project foundation. Recreating the same files would add work without improving the project.

### Leave the Deviation Undocumented

This option was rejected because it would create an inaccurate record of how the repository was established and would weaken the team’s evidence of methodology compliance.

### Document the Deviation and Apply the Methodology Prospectively

This option was selected because it preserves an honest repository history while ensuring that all future work follows the approved process consistently.

## Advantages

- Existing project work is preserved.
- The repository history remains accurate.
- The deviation is documented transparently.
- The team can begin following the approved methodology immediately.
- Future work will provide clear traceability between issues, branches, commits and Pull Requests.
- The team avoids unnecessary disruption caused by rewriting shared history.

## Disadvantages

- The initial scaffold does not provide complete evidence of the approved workflow.
- The initial scaffold cannot be linked retrospectively to a preceding issue.
- Branch protection remains unenforced until administrator access is available.

## Consequences

- The initial scaffold remains part of the repository history.
- The initial scaffold will not be treated as evidence of full methodology compliance.
- Issue #7 will be used to align repository governance and templates.
- All future significant work must begin with a Gitea issue.
- All future development work must use a branch linked to the relevant issue.
- Commits must reference the relevant issue where applicable.
- Changes to `main` must be reviewed through a Pull Request.
- At least one team member other than the author must review and approve each Pull Request.
- Issue #8 must be completed once repository administrator access is granted.
- Any future methodology deviation must be documented and justified.

## Follow-Up Actions

- [ ] Align the Gitea issue templates with the approved Project Methodology.
- [ ] Align the Pull Request template with the approved Git Methodology.
- [ ] Add a general task issue template.
- [ ] Add a `.gitattributes` file to enforce consistent line endings.
- [ ] Create and track a separate issue for protecting `main`.
- [ ] Configure branch protection once administrator access is available.
- [ ] Require the team to follow the approved workflow for all future significant work.
- [ ] Review compliance during the Sprint 1 close-out.

## Verification

This decision will be considered successfully implemented when:

- Issue #7 has been completed through the approved issue, branch, commit, Pull Request and review workflow;
- the updated issue and Pull Request templates have been merged into `main`;
- later work uses linked Gitea issues, branches and Pull Requests;
- the initial setup deviation remains documented in the repository; and
- branch protection has either been configured or remains visibly tracked as blocked.

## Review Date

This decision will be reviewed during the Sprint 1 close-out.

The review will confirm whether:

- Issue #7 followed the approved methodology;
- later team members used linked issues, branches and Pull Requests;
- the repository templates were used consistently; and
- branch protection was configured or remains visibly blocked.

## AI Declaration

The preceding document was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Thinking].