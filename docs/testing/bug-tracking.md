# Bug Tracking

The Sport Analytics Tool uses Gitea Issues together with a dedicated Bug Tracker project board to continuously record, resolve, and verify defects throughout development.

This process provides traceability from the initial discovery of a defect through implementation, testing, verification, and closure.

## When to Log a Bug

A bug should be logged when incorrect or unexpected behaviour is discovered during:

- development;
- automated testing;
- API and integration testing;
- browser and end-to-end testing;
- user testing;
- stakeholder review;
- deployment; or
- production verification.

Where practical, defects should be recorded rather than fixed silently. This preserves evidence of problems discovered during development and provides a traceable history of how they were resolved.

## Bug Tracker

The project uses a dedicated Gitea project board named:

**Sport Analytics — Bug Tracker**

Bugs move through the following workflow:

**Reported → In Progress → Ready for Verification → Closed**

The Gitea `Uncategorized` section is not considered part of the bug workflow. New bugs should be moved to `Reported`.

### Reported

The defect has been identified and recorded as a Gitea issue.

The issue should contain enough information for another team member to understand and reproduce the problem.

### In Progress

A team member is actively investigating or correcting the defect.

The issue should be assigned to the person working on the fix and moved to `In Progress`.

### Ready for Verification

A fix has been implemented, but the bug is not yet considered resolved.

The original reproduction steps must be repeated and relevant tests should be run before the issue is closed.

Where practical, verification should be performed by another team member.

### Closed

The defect has been verified as resolved and can no longer be reproduced.

The issue may then be closed and moved to `Closed`.

## Bug Classification

Every bug should use the `bug` label.

It should also have:

- one `severity:` label; and
- at least one relevant `area:` label.

### Severity

| Label                | Meaning                                                                     |
| -------------------- | --------------------------------------------------------------------------- |
| `severity: critical` | Security risk, data loss, or the system is unusable                         |
| `severity: high`     | Important functionality is broken or normal use is blocked                  |
| `severity: medium`   | Functionality is affected, but a workaround exists or the impact is limited |
| `severity: low`      | Minor, cosmetic, or low-impact defect                                       |

Severity describes the **impact of the defect**.

### Area

Existing repository area labels are used to identify the affected component. These include:

- `area: api`
- `area: backend`
- `area: data`
- `area: database`
- `area: documentation`
- `area: frontend`
- `area: infrastructure`

More than one area label may be applied where a defect crosses component boundaries.

### Priority

The existing `priority:` labels may also be applied where useful.

Priority and severity are different:

- **severity** describes how serious the defect is;
- **priority** describes how urgently the team intends to address it.

A priority label is therefore optional and does not replace the required severity label.

## Bug Reports

The repository provides a reusable Bug issue template.

A bug report should contain:

- a clear summary;
- motivation and impact;
- relevant environment information;
- steps to reproduce;
- expected behaviour;
- actual behaviour;
- severity;
- affected area;
- dependencies where relevant; and
- supporting evidence where available.

Evidence may include:

- screenshots;
- logs;
- failing automated tests;
- browser console output;
- API responses;
- recordings; or
- reproduction examples.

## Fixing Bugs

Work that fixes a bug should reference the corresponding Gitea issue.

For example:

`Refs #123`

Using `Refs` rather than automatically closing the issue allows the bug to remain open after implementation until verification has been completed.

The issue should move from:

**In Progress → Ready for Verification**

once the fix has been implemented.

Where practical, a regression test should be added to prevent the same defect from silently reappearing.

Existing automated tests must continue to pass and unrelated behaviour should not be changed by the fix.

## Verification

A bug should not be closed solely because its implementation has been merged.

Before closure:

1. repeat the original reproduction steps;
2. confirm that the expected behaviour now occurs;
3. run relevant automated tests;
4. confirm that no related regression has been introduced;
5. confirm that relevant documentation has been updated where required; and
6. record the verification outcome on the issue.

Once verification succeeds, the issue can be closed and moved to the `Closed` column.

If verification fails, the issue should return to `In Progress`.

## Regression Testing

A regression test should be added where practical when fixing a defect.

The purpose of the regression test is to demonstrate that:

1. the original defect is corrected; and
2. the same behaviour will be detected automatically if it reappears later.

A regression test may not be appropriate for every defect, such as a minor documentation issue. Where one is not added, the issue should still record how the fix was verified.

## Traceability

The intended bug lifecycle is:

**Defect discovered → Bug issue → Reported → In Progress → Fix/PR → Ready for Verification → Verification/regression testing → Closed**

This creates a continuous record of defects discovered and resolved throughout the project and links bug tracking with the project's development and testing processes.

## Continuous Use

The Bug Tracker is intended to be used throughout the remainder of the project rather than only during dedicated testing periods.

Defects discovered during feature development, automated testing, user feedback, stakeholder reviews, deployment, and later regression testing should all use the same process.

This allows the project team to maintain a consistent and auditable history of product quality over time.

---

**AI Declaration:** The preceding document was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
