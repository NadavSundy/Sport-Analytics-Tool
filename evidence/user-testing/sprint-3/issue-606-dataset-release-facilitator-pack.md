# Issue #606 Dataset Release Facilitator Pack

> **Preparation only.** This pack does not record a participant session, task
> result, finding, acceptance decision or release-readiness result. Complete
> the blank fields only from the deployed build and real facilitator/participant
> observations.

## Scope

| Item                         | Prepared value                                             |
| ---------------------------- | ---------------------------------------------------------- |
| User-feedback issue          | #606                                                       |
| Linked implementation issues | #562; #596; #597                                           |
| Scenario ID                  | `S3-DATA-01`                                               |
| Participant role             | Analyst or data-oriented user                              |
| Task IDs                     | `DATA-01`; `DATA-02`                                       |
| Future session evidence path | `evidence/user-testing/sprint-3/YYYY-MM-DD-PXX-analyst.md` |

## Readiness record

Record actual values immediately before the session. Do not begin if the release
catalogue or any required release artefact is unavailable.

| Check                                    | Actual value / result |
| ---------------------------------------- | --------------------- |
| Deployed environment URL                 |                       |
| Deployed commit or release               |                       |
| Catalogue URL                            |                       |
| Selected release version                 |                       |
| Release scope                            |                       |
| Schema and field-description location    |                       |
| SHA-256 checksum                         |                       |
| Artifact download/read path              |                       |
| Browser and device                       |                       |
| Anonymous participant ID                 | `PXX`                 |
| Prepared reproducibility question        |                       |
| Expected source fields for that question |                       |

- [ ] The catalogue lists the selected immutable release.
- [ ] The release detail presents its version, scope, schema/field descriptions and checksum.
- [ ] The participant can obtain/read the JSON artefact without authentication or mutation.
- [ ] The chosen question can be answered from the release's documented event fields.
- [ ] No participant name, email address, credential, token or API key appears in this pack or future session evidence.

## Facilitator introduction

Read this before the tasks:

> We are testing the application, not you. There are no right or wrong answers.
> Please work through the tasks naturally and say what you are thinking. I will
> not normally tell you where to click because we want to see whether the
> application communicates the workflow clearly.

Clarify wording if needed, but do not explain navigation, point to controls, or
identify expected fields while a task is in progress.

## Task cards

### DATA-01 - Find and understand a versioned dataset release

Give the participant only this task:

> You want a stable dataset snapshot for an analysis that must be repeatable
> later. Find an available dataset release and determine its version, scope,
> schema/documentation, checksum and how to obtain it.

Observe discoverability; whether version and scope are clear; whether schema,
field descriptions and checksum are findable; whether the participant
distinguishes the release from an ad-hoc export; and whether download/use
instructions are sufficient.

### DATA-02 - Judge reproducibility

Use the prepared question from the readiness record. Give the participant only:

> Using this versioned release, determine whether it contains enough documented
> information to reproduce the requested statistic later. Explain which release
> artefacts or fields you would rely on.

Observe whether documentation answers questions; whether the participant
identifies needed event data; whether version/checksum establishes confidence in
the snapshot; and whether undocumented assumptions block reproducibility.

## Capture requirements

After the session, copy actual notes into the session template and retain a
separate `Success`, `Partial`, or `Failure` outcome for each attempted Task ID.
For each finding, record its Task ID, impact-based `S1`-`S4` severity and final
`Accept`, `Defer`, or `Reject` disposition. An accepted `S1` or `S2` requires a
retest on the corrected build before #606 can close.

Update the Sprint 3 summary only after evidence has been reviewed for personal
information and credentials.

## What must be supplied to complete the issue

1. The live environment URL and deployed commit/release.
2. A working public catalogue entry and one selected release's version, scope,
   schema/field-documentation location, checksum and artefact path.
3. One small reproducibility question and the source fields the facilitator
   expects to be relevant.
4. An anonymous participant ID, broad role/relevant experience, browser/device,
   and session date.
5. The participant's uncoached observations and separate outcome for `DATA-01`
   and `DATA-02`.
6. For every finding: severity, decision and reason; linked issue/PR; and, for
   accepted `S1`/`S2`, retest results.

## AI Declaration

This preparation-only facilitator pack was drafted with the assistance of
Codex[GPT-5] and must be completed from real facilitator and participant evidence.
