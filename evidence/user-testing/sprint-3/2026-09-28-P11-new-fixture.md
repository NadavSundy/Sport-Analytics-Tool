# Sprint 3 User-Testing Session - P11

## Session details

| Field                     | Record                                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| User-feedback issue       | #603 - genuinely new fixture submission and reviewer onboarding                                                 |
| Date                      | 2026-09-28                                                                                                      |
| Participant               | P11 (anonymous; not a developer who implemented this workflow)                                                  |
| Roles exercised           | Submitter; reviewer                                                                                             |
| Relevant experience       | Not supplied                                                                                                    |
| Environment               | `https://sport-analytics-tool-web.pages.dev/`                                                                   |
| Deployed commit / release | Not supplied                                                                                                    |
| Browser/device            | Google Chrome on Windows                                                                                        |
| Facilitation              | Intervention was given for #770: the facilitator explained the documented bug and how to bypass it for testing. |

Participant identity, personal email address, credentials, tokens and API keys
are not retained in this record.

## Readiness and prepared state

The facilitator reported that #571, #583, #483, #584, #585, #586, #587, #705
and #708 were deployed and usable before the session.

| Item                              | Record                                                                                                          |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Disposable competition            | United Arab Emirates tour of Malaysia                                                                           |
| New fixture absent before testing | Yes                                                                                                             |
| Valid package                     | `1552897-season-upload-valid.json`                                                                              |
| Valid package SHA-256             | `53450bd1e75bd5e33b7f74f6b42a177e9317989f8d6f6fc9fa95a25a03837d3f`                                              |
| Valid submission reference        | `a0c22e42-caec-4112-91a9-aa4641eec1ea`                                                                          |
| Valid submission checksum         | `940ef87d8def61bc0a36f2013cf00f3caff3ee1b70101236923bb75c8de5da84`                                              |
| Package version                   | `1.1`                                                                                                           |
| Invalid package                   | `1552897-season-upload-invalid.json`                                                                            |
| Invalid package SHA-256           | `2d91a905cc0095eca28b52fe20758fc3e09e33cb5e2b3d7230f7da015c62dc17`                                              |
| Invalid submission reference      | `cdca808d-68bf-4b0f-aa34-cdc82ee5ea28`                                                                          |
| Invalid submission checksum       | `b690d2911e2628c1f9cf5f4de156a76595f429d0556b2e52d28c2458630791b1`                                              |
| Submitter account                 | Administrator account with all competition scopes, used in the submitter role; credentials supplied out-of-band |
| Reviewer account                  | Administrator account; credentials supplied out-of-band                                                         |
| Reset/recreate plan               | Not supplied in retained facilitator notes                                                                      |

The valid submission reached review. The facilitator reported that the fixture
was onboarded and approved/published. The exact final UI status text was not
separately supplied.

## Task outcomes

| Task ID | Outcome | Observation                                                                                                                                                         |
| ------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AUTH-01 | Success | No additional observation was supplied by the facilitator.                                                                                                          |
| AUTH-02 | Success | No additional observation was supplied by the facilitator.                                                                                                          |
| SUB-01  | Success | No additional observation was supplied by the facilitator.                                                                                                          |
| SUB-03  | Success | No additional observation was supplied by the facilitator.                                                                                                          |
| SUB-04  | Success | No additional observation was supplied by the facilitator.                                                                                                          |
| SUB-07  | Success | The valid new-fixture submission reached review.                                                                                                                    |
| REV-01  | Success | No additional observation was supplied by the facilitator.                                                                                                          |
| REV-02  | Success | No additional observation was supplied by the facilitator.                                                                                                          |
| REV-06  | Partial | #770 allowed a player name to be used as a durable identifier and submit an invalid request. The facilitator showed how to bypass the documented issue for testing. |

## Finding and decision

| Finding ID | Task ID | Observation                                                                                             | Severity | Decision | Decision reason                                                                                                                                                                                      | Gitea issue | Retest                                                                      |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------- | -------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------- |
| P11-F01    | REV-06  | Participant onboarding accepted a player name as a durable identifier and submitted an invalid request. | S3       | Defer    | The valid workflow reached review, onboarding and publication using the supported path. The team selected this as a non-blocking validation/UX follow-up to be completed and retested independently. | #770        | Not required for this deferred S3 finding; independent #770 retest pending. |

## Post-session assessment

**Final gate result: Accepted with documented limitations.**

P11 completed the selected authentication, submitter, validation, new-fixture
and reviewer-discovery tasks successfully. The valid new-fixture submission
reached review and the fixture was onboarded and approved/published. `REV-06`
remains Partial because the facilitator intervened to explain and bypass the
documented #770 durable-identifier problem.

The team reclassified P11-F01 as an S3 deferred follow-up. #770 remains open
for independent completion and retest; it does not block this gate's recorded
accepted-with-limitations result. The deployed commit/release SHA and the
scenario reset/recreate procedure were not retained in the facilitator notes.

The user-feedback gate releases #571, #583, #483, #584, #585, #586, #587,
#705 and #708 for closure only where each issue's own remaining technical
Definition of Done is satisfied.

## Evidence review

- [x] Participant identity is anonymised.
- [x] Credentials, tokens and personal information are absent.
- [x] Every attempted task has an individual outcome.
- [x] The finding is linked to its task, severity and decision.
- [x] The S3 deferred finding has an explicit reason and issue link.
- [x] The facilitator's intervention and Partial result are retained.
- [ ] Deployed commit/release SHA was not supplied.
- [ ] Reset/recreate procedure was not supplied.

## AI Declaration

This anonymised evidence record was organised from facilitator-provided notes
with the assistance of Codex[GPT-5]. The facilitator and team remain
responsible for the outcomes, severity, decision and gate result.
