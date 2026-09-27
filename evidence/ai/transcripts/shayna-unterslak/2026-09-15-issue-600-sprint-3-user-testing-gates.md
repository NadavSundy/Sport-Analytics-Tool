# Issue #600 — Sprint 3 User-Testing Task Bank, Facilitator Data and Feature-Gate Workflow

**Date:** 2026-09-15  
**Team member:** Shayna Unterslak  
**Tool:** ChatGPT Web  
**Model:** GPT-5.6 Sol  
**Purpose:** Repository review, user-testing process design, documentation generation, evidence scaffolding and Git/verification guidance.

## Request

Implement Issue #600 by extending the existing task-based Sprint 2 user-testing process for Sprint 3, while preserving the established task outcomes, S1–S4 severity, actionable-finding decisions, S1/S2 retesting, anonymised evidence and Gitea-linked traceability.

## AI-assisted work used

ChatGPT reviewed the existing protocol/task-bank/facilitator/evidence structure and generated documentation changes that:

- preserve the Issue #264 / PR #317 / ADR-013 task-based process;
- define Sprint 3 feedback issues as closure gates;
- keep implementation issues open in In Review / awaiting user validation until the linked gate closes;
- document `Cannot Begin Until` on the gate instead of reverse hard dependencies;
- add `PUB-06`, `SUB-07`, `REV-06`, `DATA-01`, `DATA-02`, and `API-01`–`API-04`;
- map gates #601–#607 and #612 to task groups;
- define safe facilitator scenarios for navigation/auth, public comparison, new fixtures, single-fixture packages, batch/back catalogue, corrections/provenance, dataset releases and API consumers;
- add disposable/staging/reset requirements and keep credentials/API keys outside Git;
- create the Sprint 3 evidence scaffold and update the testing indexes.

## Human review / adaptation required

The generated material must be reviewed against the repository state after application. Real task outcomes and findings must only be added from reviewed formal sessions.

## Verification

Run from the repository root:

```text
git diff --check
python -m mkdocs build --strict
```

Then inspect:

```text
git status
git diff -- docs/testing testing/user-testing evidence/user-testing docs/process evidence/ai
```

## Related evidence

- Issue #600
- `docs/testing/user-testing-protocol.md`
- `docs/testing/user-testing-task-bank.md`
- `testing/user-testing/SPRINT3_SCENARIOS.md`
- `testing/user-testing/sprint-3-scenario-record.md`
- `evidence/user-testing/sprint-3/sprint-3-user-testing-summary.md`
