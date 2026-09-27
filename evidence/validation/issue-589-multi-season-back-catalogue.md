# Issue #589 - Multi-season back-catalogue deployed acceptance

**Issue:** #589 - `feat(batch): support true multi-season back-catalogue ingestion`
**Implementation PR:** #683
**Acceptance date:** 27 September 2026
**Environment:** deployed development environment
**Technical/deployed acceptance:** PASS
**Issue closure:** close only if the linked user-feedback closure gate has already been satisfied elsewhere.

## Purpose

Issue #589 extends staged season ingestion so one back-catalogue package can contain fixtures from more than one season while preserving validation, review, publication, idempotency and item-level reporting.

This record captures the final deployed acceptance exercise after the dependent fixture and participant onboarding defects discovered during earlier runs were fixed.

## Implementation and automated evidence

PR #683 implemented the core multi-season contract and worker changes, including:

- optional fixture-level season references;
- package-level season fallback for existing single-season uploads;
- fixture-level season preservation through JSON, CSV and NDJSON staging;
- effective-season resolution per fixture rather than per package;
- preservation through normalisation/reference-package reconstruction; and
- automated coverage for two seasons, multiple fixtures per season, an invalid sibling item and deterministic replay.

The deployed exercises below verify the integrated behaviour on the development environment.

## Deployed acceptance run 1 - valid four-fixture multi-season catalogue

**Source file:** `issue-589-multiseason-v8-regression.json`
**Batch / receipt:** `318bc663-ab36-4f01-8e83-717c4885b0b7`
**Package version:** `1.1`

The staged package contained four fixtures across two seasons:

| Effective season | Fixture               | Date       |
| ---------------- | --------------------- | ---------- |
| 2025             | Thailand vs Singapore | 2025-02-10 |
| 2025             | Hong Kong vs Nepal    | 2025-02-11 |
| 2026             | Thailand vs Malaysia  | 2026-02-10 |
| 2026             | Malaysia vs Singapore | 2026-02-11 |

Observed validation/review result after participant onboarding and revalidation:

- total submitted items: 4;
- accepted: 4;
- rejected: 0;
- blocking errors: 0;
- duplicates: 0;
- conflicts: 0;
- unresolved: 0;
- invalid references: 0;
- resolved item references: 4; and
- final batch lifecycle: `Published`.

The published fixture overview for Thailand vs Singapore showed competition `ACC Eastern Region T20`, season `2025`, match type `T20`, start/end date `10 Feb 2025`, and teams Thailand/Singapore.

No `PACKAGE_ENVELOPE_MISMATCH` was raised for the legitimate change from the 2025 fixtures to the 2026 fixtures.

## Participant onboarding and revalidation

The first fresh deployed run reached `Awaiting review` rather than terminal rejection when the synthetic submitted participants were not yet members of the resolved fixture squads.

The reviewer workspace exposed 12 participant-onboarding tasks. The reviewer supplied durable participant identifiers in the supported registry-reference form, for example:

`cricsheet:participant:issue589sgpbowler1`

After the onboarding decisions were applied:

- the batch was re-queued for validation;
- it progressed back to `Awaiting review`;
- `Needs review` became 0;
- `References` became 0; and
- the four accepted items became ready for publication.

The reviewer then approved and published the batch.

## Replay / idempotency

The exact unchanged `issue-589-multiseason-v8-regression.json` file was submitted again after publication.

The platform returned the existing receipt:

`318bc663-ab36-4f01-8e83-717c4885b0b7`

with the original received timestamp rather than creating a second batch.

This demonstrates request-level idempotency for an unchanged replay and avoids a second publication/double count for the same catalogue.

## Deployed acceptance run 2 - one invalid sibling among valid items

**Source file:** `issue-589-multiseason-v9-one-invalid.json`
**Batch / receipt:** `aa579b2c-0dd3-4375-92f4-090af3ceffcf`
**Package version:** `1.1`

This package retained the same four-fixture, two-season structure and submitted a fresh next delivery for each fixture. Only the Malaysia vs Singapore item was deliberately invalid: its run total did not equal the sum of `offBat` and `extras`.

Observed result:

- total submitted items: 4;
- accepted: 3;
- rejected: 1;
- blocking errors: 0;
- duplicates: 0;
- conflicts: 0;
- unresolved: 0; and
- lifecycle before review decision: `Awaiting review - partial success`.

The reviewer UI explicitly stated:

> Only the accepted subset will publish.

and reported that approving would publish the 3 accepted records while the 1 rejected record remained unpublished and retained in the report.

After the review decision, the retained batch summary continued to report:

- accepted: 3;
- rejected: 1;
- blocking errors: 0;
- duplicates: 0;
- conflicts: 0;
- unresolved: 0; and
- one retained `PACKAGE_ITEM_INVALID` rejection.

This demonstrates that one invalid item is reported independently and does not hide or prevent the valid siblings from progressing through the partial-success review/publication path.

## Acceptance-criteria traceability

| #589 acceptance criterion                                               | Deployed/automated evidence                                                                           | Status        |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------- |
| One staged batch can contain fixtures from more than one season         | v8: 2025, 2025, 2026, 2026 in one package                                                             | PASS          |
| Season identity is represented at the correct fixture/package level     | Published fixture shows season 2025; package resolves both 2025 and 2026 fixtures                     | PASS          |
| Legitimate season changes are not rejected by envelope validation       | No `PACKAGE_ENVELOPE_MISMATCH` in v8/v9                                                               | PASS          |
| Idempotency remains correct across seasons                              | Exact v8 replay returned the original receipt                                                         | PASS          |
| Duplicate deliveries are not double-counted                             | Exact replay did not create a second batch/publication                                                | PASS          |
| Validation/review reports identify failures per fixture/item            | v9 retained one explicit rejected item while three siblings were accepted                             | PASS          |
| Publication can partially progress while preserving correct batch state | v9 reviewer explicitly offered accepted-subset publication and retained the rejected item             | PASS          |
| Batch summary reports accepted/rejected counts across seasons           | v8 4/0; v9 3/1 with zero unresolved/conflicts                                                         | PASS          |
| Tests include at least two seasons                                      | PR #683 automated tests plus v8/v9 deployed runs                                                      | PASS          |
| Tests include multiple fixtures per season                              | Two fixtures in 2025 and two in 2026                                                                  | PASS          |
| Tests include one invalid fixture/item among valid siblings             | v9                                                                                                    | PASS          |
| Replaying the same catalogue does not double-count                      | Exact v8 replay reused the original receipt                                                           | PASS          |
| BAT-02/BAT-03/BAT-04 and linked feedback gate                           | Must be evidenced by the linked user-testing record; not re-claimed by this technical acceptance file | EXTERNAL GATE |

## Final technical decision

The deployed technical acceptance for #589 passes.

The final environment demonstrates:

- true multi-season package ingestion;
- multiple fixtures per season;
- fixture/package season fallback and override behaviour;
- reviewer-controlled participant onboarding and revalidation;
- successful review and publication;
- idempotent unchanged replay;
- item-level failure reporting; and
- partial-success progression with the rejected item retained.

If the linked user-feedback closure gate is already complete, this evidence supports closing #589. If that gate is still open, #589 should remain open only for that external closure gate.

## AI Declaration

The acceptance-test planning, synthetic acceptance payload construction, debugging guidance and this evidence document were generated and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol]. The deployed actions and observed results were executed and reviewed by Shayna Unterslak.
