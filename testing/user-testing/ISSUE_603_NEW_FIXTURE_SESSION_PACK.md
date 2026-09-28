# Issue #603 Facilitator Session Pack: New Fixture Submission and Onboarding

Use this pack to prepare and run the Sprint 3 #603 user-feedback gate. It is a
facilitator aid, not session evidence: complete the evidence record only from
what a representative participant and facilitator actually observe.

## Scope and result boundary

The goal is to establish whether an approved submitter can propose a fixture
that is genuinely absent from the platform and whether a reviewer can safely
understand, onboard, approve and publish it through the normal product flow.

This pack covers `AUTH-01`, `AUTH-02`, `SUB-01`, `SUB-07`, `REV-01`, `REV-02`
and `REV-06`. Add `SUB-03` or `SUB-04` only when the prepared invalid/recovery
scenario is actually attempted. Record every attempted task separately as
Success, Partial or Failure. Do not infer an outcome from API logs, automated
tests or a facilitator dry run.

The final #603 result may be **Accepted**, **Accepted with documented
limitations**, or **Not accepted** only after reviewed evidence supports it.

## Do not start until this is true

- The linked implementation work (#571, #583, #483, #584, #585, #586, #587,
  #705 and #708 where applicable) is deployed, technically reviewed and usable
  for the selected tasks.
- The exact deployed URL and served commit/release have been recorded. A home
  page response alone is not proof that the new-fixture workflow is deployed.
- A project-owned, disposable/restorable test competition is ready. The
  proposed fixture is confirmed absent immediately before `SUB-07`.
- A valid current-contract new-fixture package and a single-purpose invalid
  variant are prepared. Record each file path and SHA-256 checksum in the
  scenario record; do not retain credentials in it.
- The approved submitter account has the test competition in its scope, and a
  separate reviewer/admin account can perform the onboarding decision.
- The team has recorded how the proposal, created fixture, staging record and
  any published result can be safely reset or recreated.
- The reviewer sees a pre-staged or participant-created scenario without the
  facilitator having to repair it during the participant's task.

If any item is missing, record #603 as **Not started** or **Blocked** in the
planning note. Do not substitute a production fixture or internal database
knowledge for a missing scenario.

## Setup record

Copy [Sprint 3 scenario record](sprint-3-scenario-record.md) and complete it
as `S3-NEWFIX-01`. It must include:

| Record        | Minimum safe value                                                                          |
| ------------- | ------------------------------------------------------------------------------------------- |
| Environment   | URL and served commit/release                                                               |
| Accounts      | Anonymous account labels; role; competition scope; credentials supplied out-of-band         |
| Data          | Disposable competition; absent proposal identifier; package paths/checksums; expected state |
| Reset         | Approved reset/recreate method and owner                                                    |
| Evidence path | Proposed `evidence/user-testing/sprint-3/YYYY-MM-DD-PXX-new-fixture.md` path                |

Do not include names, emails, passwords, OAuth tokens, API keys, database URLs
or screenshots that expose them.

## Participant prompts

Read these goals as written or clarify their meaning without revealing the
navigation or controls. Do not tell the participant where to click.

| Task      | Neutral prompt                                                                                                                              | Observe                                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `AUTH-01` | Sign in with the project test identity supplied by the facilitator and determine when the application considers you signed in.              | Discoverability and authentication-state clarity.                                                                   |
| `AUTH-02` | Determine whether your account is allowed to submit for the supplied test competition.                                                      | Scope/permission understanding without internal IDs.                                                                |
| `SUB-01`  | You want to submit cricket data for the supplied competition. Find where you would begin.                                                   | Submitter-function discoverability.                                                                                 |
| `SUB-07`  | You have a valid package for a fixture that is not yet in the platform. Submit or propose it, then explain its state and what happens next. | Existing-versus-new distinction; readable metadata; scope; validation/review; receipt/status; duplicate protection. |
| `REV-01`  | As a reviewer, find the work that is waiting for your attention.                                                                            | Review-queue discoverability.                                                                                       |
| `REV-02`  | Examine the staged submission and decide what information matters before making a review decision.                                          | Report/validation/reference understanding.                                                                          |
| `REV-06`  | Review the proposed new fixture and take the appropriate action so it can proceed or be returned. Explain the resulting state.              | New-proposal distinction; provenance; duplicate checks; create/link/return consequences; publication state.         |

If the participant asks for help, record the exact intervention. Mark that
task Partial or Failure as appropriate; never coach the participant to a
Success result.

## Capture during the session

For every task attempted, record the outcome, a concise anonymised observation,
whether intervention was requested/given and any finding ID. Give every finding
an `F01`, `F02`, etc. identifier with its Task ID and severity.

| Task ID | Outcome | Observation / participant wording | Intervention | Finding ID |
| ------- | ------- | --------------------------------- | ------------ | ---------- |
| AUTH-01 |         |                                   |              |            |
| AUTH-02 |         |                                   |              |            |
| SUB-01  |         |                                   |              |            |
| SUB-07  |         |                                   |              |            |
| REV-01  |         |                                   |              |            |
| REV-02  |         |                                   |              |            |
| REV-06  |         |                                   |              |            |

Use S1–S4 severity for every usability or functional finding. Every S1, S2 or
otherwise actionable finding must have an explicit outcome: a bug/UX/feature
issue, an existing issue link, accepted/fixed, deferred with reason, or
rejected/no-change with reason. Accepted S1/S2 changes require a retest on the
corrected build, preferably with the same Task ID.

## Evidence and final decision

After the facilitator reviews notes for privacy, save one anonymised session
record under `evidence/user-testing/sprint-3/` using the repository naming
convention. Update the Sprint 3 summary from that reviewed evidence only.

Before calling #603 accepted, confirm:

- every attempted task has an individual outcome;
- findings have severity and actionable findings have disposition;
- accepted S1/S2 findings have linked fix and retest evidence;
- the session record identifies the tested environment/build and prepared
  scenario without secrets;
- the final result states accepted, accepted with documented limitations or not
  accepted; and
- it names which linked implementation issues are released for closure, subject
  to their own technical Definition of Done.

## AI declaration

This facilitator-only pack was drafted with Codex[GPT-5]. It contains no
participant responses, findings, outcomes or acceptance decision; those must
come from reviewed facilitator evidence.
