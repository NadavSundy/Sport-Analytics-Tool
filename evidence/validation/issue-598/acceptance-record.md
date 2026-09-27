# Issue #598 deployed acceptance record

## Session metadata

| Field                        | Value                                                                                                                                                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Start                        | 2026-09-27 16:00 SAST (UTC+2)                                                                                                                                                                                  |
| Tester                       | Dean Feldman                                                                                                                                                                                                   |
| Environment                  | Deployed Sprint 3 environment                                                                                                                                                                                  |
| Frontend                     | https://sport-analytics-tool-web.pages.dev                                                                                                                                                                     |
| API base                     | https://statsthegame-dev-api.calmground-aa50efe2.southafricanorth.azurecontainerapps.io/api/v1                                                                                                                 |
| Browser / OS                 | Google Chrome / Windows                                                                                                                                                                                        |
| Local candidate commit       | `1091ad097abb6435199a4686a9779640ed7b0d8f`                                                                                                                                                                     |
| Deployed build identity      | Pending: health and frontend returned HTTP 200 but expose no commit/version metadata.                                                                                                                          |
| Source                       | `1552923.json` — SHA-256 `db4ae07fc60df288ac66d4510212930813df495d0c012aa7533cb3d086614559`                                                                                                                    |
| Generated package            | `packages/1552923-v1.1.json` — SHA-256 `c560b41bce5ca40f53b7bb65410e57c5f3238d0179854d4f2dc36720143ff678`; `seasonUploadPackageSchema` validation passed locally (v1.1; 1 fixture; 2 innings; 251 deliveries). |
| Direct database intervention | Not permitted for the accepted path; outcome pending.                                                                                                                                                          |

## Scenario ledger

| Scenario                           | Required evidence                                                                    | Status                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------- |
| A. New-fixture ingestion           | New-fixture check; v1.1 receipt; review; publication; statistics; replay; correction | Blocked: participant-onboarding POST 422 |
| B. Multi-season back-catalogue     | #589 deployed evidence tied to the deployed build, or an executed retest             | Pending                                  |
| C. Partial/rejected recovery       | #589 deployed evidence or an executed recovery check                                 | Pending                                  |
| D. Correction and logical identity | History; stable event identity; corrected statistics; resolvability                  | Pending                                  |
| E. Selective recomputation         | Supported observability evidence for affected scopes only                            | Pending                                  |
| F. Aggregate provenance            | Aggregate traced to event(s) and submission/batch                                    | Pending                                  |
| G. Consumer controls               | Key handling; quota/rate limit statuses and headers; shared topology result          | Pending                                  |
| H. Dataset release                 | Version; schema; fields; checksum; coherent snapshot; reproducible download          | Pending                                  |
| I. Representative scale            | Applicable #565 evidence or documented deployment acceptance run                     | Pending                                  |
| J. No DB intervention              | Explicit statement that the accepted path used no direct DB edits                    | Pending                                  |

### Scenario A — New fixture end-to-end ingestion

**Status:** BLOCKED

**Fixture:** Kenya vs Botswana — Africa Continental Cup — 17 September 2026

**Expected:** A valid v1.1 new-fixture proposal is produced for the completed
match, preserving Kenya as the winning team.

**Actual:** The deployed workflow rejected the generated proposal:

`fixtures.0.proposal.winner: Name the winning team when the outcome is won.`

The source fixture records Kenya as the winner. The deployed new-fixture
workflow therefore failed before staging/submission.

**Data impact:** No package was staged or published.

**Intermediate blocker:** Yes.

**Required follow-up:** Fix the new-fixture winner propagation, redeploy, and
rerun Scenario A using the same fixture.

The blocker has now been manually reproduced by the tester on the deployed
application.

### Scenario A — Post-fix rerun

**Receipt:** `978e7d8f-70f0-432e-9a52-b3ad80f6bee7`

**Upload checkpoint:** PASS

The deployed application accepted the Kenya vs Botswana package and issued a durable receipt.

**Staging / review checkpoint:** FAIL

The batch entered `Failed` during background processing instead of `Awaiting review`.

The review UI still exposes reviewer-actionable unresolved work:

- 23 participant onboarding decisions outstanding;
- 1 unresolved new-fixture proposal;
- canonical fixture creation is required.

However, all reviewer actions are disabled because the batch lifecycle is `Failed`.

**Expected:** Reviewer-actionable unresolved fixture/participant references should leave the batch in a reviewable state so the reviewer can create/onboard the missing canonical entities and trigger revalidation.

**Actual:** Batch is terminally `Failed`, so no reviewer action is possible.

**Intermediate blocker:** Yes.

**Data impact:** Package received but not published.

**Live reviewer evidence:** The deployed [review workspace](https://sport-analytics-tool-web.pages.dev/reviews/batches/978e7d8f-70f0-432e-9a52-b3ad80f6bee7) was captured on 27 September 2026. It displays `Failed`, 24 needs-review items (23 participant onboarding decisions plus one fixture proposal), 251 submitted items, and the guidance: “Background processing failed. No reviewer action is currently possible.”

**Ownership check:** #695 and #729 describe earlier terminal-before-review failures but are closed. Neither owns this deployed `Failed` state with visible, disabled reviewer actions; no duplicate issue was created.

### Scenario A â€” authoritative rerun after #754, #757 and #763

**Authoritative package:** `1552923-season-upload-schema-extras-fixed.json` â€” SHA-256
`766f7799d71b049eb1726121c0188ef868ea1510f2857553fe2a5e11e9e23c1b`.
The raw Cricsheet source SHA-256 is
`db4ae07fc60df288ac66d4510212930813df495d0c012aa7533cb3d086614559`.
The package remains unchanged and contains 251 physical delivery events (Kenya
124; Botswana 127), with `outcome: won` and `winner: Kenya`.

**Corrected acceptance blockers:** #754 winner propagation is deployed and passed;
#757 reviewer-actionable state preservation is deployed and smoke-verified by receipt
`771ff2d4-7518-4c3b-a0af-7bf8af86047b`; #763 established and fixed deterministic
physical-delivery-position persistence collisions. The #763 diagnostic receipt
`9915bc4b-a24f-4685-b177-3fa7dab0e51b` failed attempts 1â€“5 with
`batch_item_batch_natural_key`; the subsequent rerun did not reproduce it.

**Active receipt:** `ed797e8a-9645-4a39-b1b1-228250e00e43`.

**Worker evidence:** revision `statsthegame-dev-batch-worker--0000055`, attempt 1,
`itemCount: 251`, `sourceFaultCount: 0`, `finalState: awaiting_review`, duration
8305 ms. This is a PASS for authoritative staging, validation and review reachability.

**Review evidence:** 251 submitted items; one fixture; 23 participant onboarding
tasks; all 23 decisions entered. Canonical-reference completion, publication,
statistics, replay and correction remain unexecuted.

**Current blocker:** submitting all 23 onboarding decisions made an authenticated
POST to `/api/v1/batches/ed797e8a-9645-4a39-b1b1-228250e00e43/participants` and
returned HTTP 422:

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "The onboarding decisions are invalid." } }
```

The deployed API revision observed was `statsthegame-dev-api--0000015`. The request
reached the API; its exact payload and the invalid decision/rule have not yet been
captured. This is an Intermediate blocker; root cause and owning issue are pending
investigation. No package, database, or deployed data was altered to bypass it.

## Failure protocol

For a failure, add the timestamp, deployed build evidence, package/checksum,
expected and actual result, safe screenshot/log reference, owning issue, and
whether it blocks Intermediate completeness. Stop that scenario. Do not alter
production behaviour or weaken its assertion.

## Final outcome

**OPEN / IN PROGRESS.** Scenario A passes through authoritative 251-event staging,
validation and `Awaiting review`, but is blocked at participant-onboarding submission.
Do not claim reference completion, publication, statistics, replay, correction or
final #598 acceptance until the 422 is diagnosed, fixed if product-owned, and rerun.

## AI declaration

This acceptance record was prepared with the assistance of Codex[GPT-5].
