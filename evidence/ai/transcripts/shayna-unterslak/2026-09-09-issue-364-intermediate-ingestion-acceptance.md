# Provide Fix Instructions

**User:** Anonymous  
**Created:** 9/9/2026 17:54:54  
**Updated:** 9/9/2026 20:44:16  
**Exported:** 9/9/2026 20:45:11  
**Link:** [https://chatgpt.com/g/g-p-6a71ed6ea4d0819190118e1b9a94bea9/c/6aa1814d-21f4-83ea-894d-0a51f7af02a3](https://chatgpt.com/g/g-p-6a71ed6ea4d0819190118e1b9a94bea9/c/6aa1814d-21f4-83ea-894d-0a51f7af02a3)  

## Prompt:
9/9/2026, 7:58:37 PM

# Verify the complete Intermediate ingestion pipeline, recovery behavior and usability #364

**svgOpen**

opened last week by [Shayna](https://sdp.ms.wits.ac.za/Shayna) · 0 comments

[Shayna](https://sdp.ms.wits.ac.za/Shayna) ([image](https://sdp.ms.wits.ac.za/avatars/6d3166b50cdde4a6f8d368fa086e200a?size=80))

[**Shayna**](https://sdp.ms.wits.ac.za/Shayna) commented [last week](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/364#issue-1737)

**Member**

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/364#description)Description

Run the final integrated acceptance exercise across the API, database, worker and frontend. This issue should produce verification evidence and narrowly scoped defect fixes, not new product scope.

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/364#acceptance-criteria)Acceptance Criteria

- An authorized submitter uploads a representative whole season without database IDs.
- A back catalogue containing proposed fixtures can be staged.
- Invalid events produce a complete actionable report.
- Ambiguous participants require explicit mapping.
- Equivalent re-upload does not duplicate a batch, event or statistic.
- Reusing an idempotency key with changed content is rejected.
- Validation and publication resume after worker termination.
- Concurrent workers do not duplicate work.
- Staged data never appears publicly before approval.
- Approval publishes only intended accepted items; rejection publishes nothing.
- Corrections retain history and update dependent statistics.
- Statistic-to-submitter provenance can be demonstrated.
- Representative season-scale throughput meets an approved target.
- Payloads and credentials are absent from logs.
- Accessibility and responsive checks pass.
- Formal user-testing evidence from #417/#418 demonstrates that representative users can complete the relevant workflow without schema knowledge; [#364](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/364) does not require a separate participant session.
- Architecture, API, database, deployment, testing and user documentation is current.
- Every Intermediate brief requirement maps to verification evidence.

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/364#dependencies)Dependencies

- All preceding Intermediate ingestion issues.

## [svg](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/364#ai-declaration)AI Declaration

> The preceding issue was planned and edited with the assistance of Codex[GPT-5] and ChatGPT-Web[GPT-5.6 Sol].

now do this issue

## Response:
9/9/2026, 7:58:47 PM

> **Inspecting Repository for Issue 364**
>
>
> **Assessing verification scope**
>
> I’m checking the repository structure and existing test commands first. I’m treating this as a verification-focused change, not a new feature, and I’ll map each requirement to concrete evidence while identifying any missing coverage.
>
> **Assessed verification scope**
>
> 
>
> **Auditing Intermediate Ingestion Issue Acceptance Evidence**
>
>
> **Inspected repository evidence, validated batch ingestion criteria, and committed baseline**
>
> 
>
> **Searching the web**
>
>
> **Planning the patch**
>
> I’m treating this as a verification pass: I’ll inspect the repository, find existing coverage, and add focused evidence without expanding product scope. I’ll flag any requirements that still depend on unfinished performance or user-testing work.
>
> **Planned the patch**
>
> 
>
> **Searching the web**
>
>
> **Searching the web**
>
> 
>
> **Inspecting project scripts for verification setup**
>
>
> **Verified ingestion controls, documentation, tests, and representative fixture validation**
>
> 
>
> Worked for 11m 55s

Yes - I’ve done the #364 verification patch against the repo **with #363 applied**, because #364 explicitly depends on that provenance work.

[**Download issue-364-intermediate-ingestion-verification.patch**](sandbox:/mnt/data/issue-364-intermediate-ingestion-verification.patch)

I also verified:

```text
git apply --check: PASS
```

This is deliberately a **verification/evidence patch, not new product scope**, which matches the issue. It adds a dedicated integrated verifier, a real 70-fixture season contract test with no application database IDs, the full acceptance/evidence mapping, Intermediate-brief traceability, docs navigation and your AI register entry. The broader mapping is important because the Intermediate brief includes batch staging/recovery/review, corrections, aggregates, performance, API versioning, quotas/caching and reproducible dataset releases. `sport_analytics.pdf`

### Do this

Ideally merge #363 first, then:

```powershell
git switch main
git pull --ff-only

git switch -c test/364-intermediate-ingestion-acceptance

git apply --check .\issue-364-intermediate-ingestion-verification.patch
git apply .\issue-364-intermediate-ingestion-verification.patch

npm.cmd run format
git status
```

Then run the new dedicated acceptance exercise:

```powershell
npm.cmd run verify:intermediate-ingestion
```

That deliberately runs across:

```text
contracts
backend unit
backend API
worker
frontend
PostgreSQL integration
focused Playwright submission/review/correction journeys
OpenAPI
worker log-safety check
```

Then run the normal methodology gate too:

```powershell
npm.cmd run ci:local
```

### One important thing about whether #364 is "done"

**Not completely yet, and I don't want to fake those last two criteria.**

The repository you gave me currently has:

```json
{
  "schemaVersion": "1.0",
  "responses": []
}
```

for the imported formal user-testing evidence. So **#417/#418 have not yet supplied the evidence that #364 explicitly requires**.

There is also no recorded **approved Intermediate ingestion throughput target + final representative-season measurement**. I found the historical `0.28 matches/second` result from #175, but that is a historical corpus-import measurement, not something I am going to silently relabel as an approved #364 batch-worker target.

The patch therefore correctly leaves these as external close-out gates:

```text
1. #417/#418 formal user-testing evidence
2. representative season-scale ingestion throughput against an approved target
```

Everything else is set up to verify now.

### What I added

Among other things:

```text
scripts/verify-intermediate-ingestion.mjs
docs/testing/intermediate-ingestion-acceptance.md
evidence/validation/issue-364-intermediate-ingestion-acceptance.md
```

and the contracts now explicitly test a **70-fixture season package without application DB IDs**.

The validation matrix covers every #364 criterion, including:

```text
✓ whole-season/no-DB-ID contract
✓ proposed fixtures stage rather than silently create
✓ actionable complete validation reports
✓ explicit ambiguous participant mapping
✓ equivalent re-upload idempotency
✓ changed-content idempotency conflict
✓ validation/restart recovery evidence
✓ publication lease recovery
✓ concurrent worker protection
✓ no pre-approval public data
✓ accepted-only publication
✓ rejection publishes nothing
✓ correction history + statistic refresh
✓ #363 statistic → submitter provenance
✓ payload/credential log safety
✓ accessibility/responsiveness
✓ current architecture/API/DB/deployment/testing/user docs
✓ every Intermediate brief requirement mapped
```

That evidence-driven approach also lines up with the course's emphasis on actively following methodology and maintaining testing/documentation evidence. `project_briefs.pdf`

**Apply it, run `npm.cmd run verify:intermediate-ingestion`, and send me the first failure or the final output.** Then we'll fill the actual results into the #364 evidence file and deal with the throughput run as quickly as possible.

## Prompt:
9/9/2026, 8:14:48 PM

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> git apply --check .\issue-364-intermediate-ingestion-verification.patch
error: patch failed: evidence/ai/registers/shayna-unterslak.csv:38
error: evidence/ai/registers/shayna-unterslak.csv: patch does not apply
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

## Response:
9/9/2026, 8:15:00 PM

> **Inspecting CSV Patch Applicability**
>
>
> **Inspected repository and created a validated CSV-free patch**
>
> 
>
> Worked for 1m 7s

That failed only because your **#363 AI CSV row has changed since I generated the #364 patch**. The rest of the #364 patch is fine.

Use this version instead — it deliberately leaves the AI register alone:

[Download the corrected #364 patch](sandbox:/mnt/data/issue-364-intermediate-ingestion-verification-no-register.patch)

Apply it:

```powershell
git apply --check .\issue-364-intermediate-ingestion-verification-no-register.patch
git apply .\issue-364-intermediate-ingestion-verification-no-register.patch
```

I re-tested that corrected patch against the #363-based repository state and:

```text
git apply --check: PASS
```

Then add the #364 AI row separately to the **bottom** of:

```text
evidence/ai/registers/shayna-unterslak.csv
```

Use this row:

```csv
"2026-09-09","Shayna Unterslak","ChatGPT Web","GPT-5.6 Sol","Verification planning; test orchestration; repository audit; documentation; evidence mapping","Issue #364: verify the complete Intermediate ingestion pipeline, recovery behavior and usability","Integrated verification harness covering contracts, backend unit/API, worker, frontend, PostgreSQL, focused Playwright and OpenAPI checks; worker log-safety audit; Issue #364 acceptance runbook and evidence matrix; complete Intermediate brief-to-evidence mapping","Reviewed the current repository and existing batch, worker, review, correction, provenance, performance, cache, API consumer, aggregate and dataset-release evidence. Local verification, representative season throughput measurement and formal #417/#418 user-testing evidence remain to be recorded before Issue #364 can be closed.","evidence/ai/transcripts/shayna-unterslak/2026-09-09-issue-364-intermediate-ingestion-acceptance.md; evidence/validation/issue-364-intermediate-ingestion-acceptance.md; docs/testing/intermediate-ingestion-acceptance.md; Issue #364; branch and Pull Request references pending"
```

Then:

```powershell
npm.cmd run format
npm.cmd run verify:intermediate-ingestion
```

Send me the first failure/output and we’ll finish #364 quickly.

## Prompt:
9/9/2026, 8:19:03 PM

yayyy!
but should we integrate this with ci/cd? like so it doesnt all run allways etc?

[Attachment: Pasted text(20260909-181854).txt]

## Response:
9/9/2026, 8:19:19 PM

> **Assessing CI integration**
>
> I’m distinguishing routine change validation from full integrated acceptance. Since the verifier largely duplicates existing lanes, I’d keep it as a manual or gated milestone command, optionally triggered only by ingestion-related changes rather than every CI run.
>
> **Assessed CI integration**
>
> 
>
> **Inspected current CI configuration, documentation, and scripts**
>
> 
>
> Worked for 54s

Yes - but **not by making `verify:intermediate-ingestion` run on every PR**.

Your existing CI is already change-aware and intelligently selects backend/database/worker/frontend/E2E lanes. The new verifier deliberately reruns nearly all of them - your successful run executed 135 contract tests, 181 backend unit tests, 153 API tests, 22 worker tests, 125 frontend tests, 145 DB tests and 13 focused Playwright tests. `Pasted text.txt` Putting that command directly into normal CI would largely undo the optimisation work you already did in #348/#383.

I’d structure it like this:

- **Normal PRs:** keep the existing change-aware CI exactly as it is.
- **`verify:intermediate-ingestion`:** keep this as the named, end-to-end **acceptance gate** for the Intermediate ingestion capability.
- **CI/CD integration:** add a dedicated **manual `workflow_dispatch` workflow** called something like `Intermediate Ingestion Acceptance`. That gives you a proper hosted-CI evidence run whenever you need it - #364 now, before Sprint 2 closeout, or after a major ingestion change - without hammering the runners on every ordinary PR.
- **Do not duplicate it on `main` push:** PR CI has already established quality before merge, and your current deployment flow intentionally avoids rerunning authoritative suites after merge.

So the architecture becomes:

```text
ordinary change
      ↓
ci-change-plan.mjs
      ↓
only affected CI lanes
      ↓
quality gate
      ↓
merge

major ingestion acceptance / #364
      ↓
manual "Intermediate Ingestion Acceptance"
      ↓
verify:intermediate-ingestion
      ↓
whole pipeline evidence
```

That is actually stronger methodology-wise: **routine regression CI** and **milestone/integrated acceptance testing** are different things, and you're documenting them as such.

I would also make the manual workflow upload or retain the command output as evidence if your Gitea runner supports artifacts, but I would **not** make #364 bigger by changing the change-routing planner just to recognise this one feature area. That would be unnecessary CI architecture work for an issue whose brief explicitly says “verification evidence and narrowly scoped defect fixes, not new product scope.”

So yes: **one tiny workflow file is worth adding**. Something along these lines:

```yaml
name: Intermediate Ingestion Acceptance

on:
  workflow_dispatch:

jobs:
  verify:
    runs-on: ubuntu-24.04
    timeout-minutes: 35

    env:
      NODE_ENV: test
      KNIP_DISABLE_RAW_TRANSFER: '1'
      SUPABASE_URL: https://example.invalid
      SUPABASE_PUBLISHABLE_KEY: test-publishable-key

    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Chromium
        run: npx playwright install --with-deps chromium

      - name: Verify complete Intermediate ingestion pipeline
        run: npm run verify:intermediate-ingestion
```

One caveat: before I turn that into a patch, I’d make it conform exactly to your existing hosted Playwright/Postgres setup rather than blindly using `playwright install`, because your CI already has specific browser caching and PostgreSQL behaviour.

**My recommendation: yes, add a manual acceptance workflow, but leave the normal change-aware CI alone.** That gives you the right balance between comprehensive #364 evidence and not making every PR painfully expensive.

If you want, I can give you the **tiny CI integration patch now**, using your existing workflow conventions so it fits cleanly rather than duplicating infrastructure.

## Prompt:
9/9/2026, 8:21:00 PM

yes, check zip, all docs, etc, and confi=orm to how we have done ti so that it is optimised ci/cd etc

## Response:
9/9/2026, 8:21:06 PM

> **Inspecting Repository Archive Contents**
>
>
> **Designing CI patch**
>
> I’m checking the existing verification workflow and documentation so the new manually triggered job matches established conventions. I’m weighing a dedicated workflow against script changes, with optimization centered on reuse rather than duplicating expensive setup.
>
> **Designed CI patch**
>
> 
>
> **Inspecting required CI files and acceptance documentation**
>
>
> **Refining workflow scope**
>
> I’m keeping the acceptance check separate from the normal merge gate, since it should remain manually triggered and avoid deployment or duplicate coverage work. I’ll document that boundary clearly while preserving existing CI behavior.
>
> **Refined workflow scope**
>
> 
>
> **Reviewing intermediate ingestion CI integration**
>
>
> **Inspected, implemented, documented, and tested CI and architecture updates**
>
> 
>
> Worked for 12m 17s

Yes - I checked the ZIP, the existing change-aware planner, `ci.yml`, Playwright configuration, local-CI orchestration, deployment workflows, CI regression tests, and the relevant architecture/testing/deployment docs. I found a few stale Intermediate-status statements as well, so I fixed those rather than adding a workflow while leaving contradictory documentation behind.

[Download the #364 CI/CD integration patch](sandbox:/mnt/data/issue-364-ci-integration.patch)

Apply it on top of the #364 patch you already applied:

```powershell
git apply --check .\issue-364-ci-integration.patch
git apply .\issue-364-ci-integration.patch

npm.cmd run format
npm.cmd run test:ci-routing
```

I reconstructed your repo with #363 + the #364 patch and verified `git apply --check` successfully. I also ran the complete CI-routing regression suite against it: **36/36 passed**, including the three new acceptance-workflow tests.

The design now fits your existing CI/CD rather than fighting it. Normal PRs still go through your existing change-aware `Sport Analytics CI / quality` gate. The new **Intermediate Ingestion Acceptance** workflow is **manual-only** (`workflow_dispatch`) - no `pull_request`, no `push`, no deployments, and no duplicate coverage. When deliberately run, it uses the same Ubuntu 24.04/Node 22 setup, the same pinned Playwright 1.62.1 cache, the proven **2-worker** setting, one `npm ci`, and one production frontend build reused by Playwright. It then invokes your #364 integrated verifier. So it consumes zero runner time unless someone explicitly requests the full Intermediate acceptance exercise.

I deliberately **did not modify `ci-change-plan.mjs`**. That would have been unnecessary complexity. Your normal routing remains exactly as #348 designed it. A change to this new workflow itself will still trigger full PR CI because your conservative planner already treats `.gitea/workflows/*` as full-validation changes - which is exactly what you want for CI infrastructure.

I also audited the docs and found several genuinely stale statements. The patch corrects them: `system-architecture.md` still said file/batch ingestion, participant aggregates and exports were future work; it described workers as future and Redis as the current Intermediate cache design. `azure-backend.md` still said the worker and batch receipt were future work. `batch-ingestion-pipeline.md` still described the worker as future. The backend module README listed dataset releases, API consumers and review/corrections as future modules even though they exist. Those are now reconciled with the actual repository. I also corrected one old testing line saying hosted Playwright uses four workers - your actual optimized CI uses **two**.

Finally, I updated the #364 evidence record with the run you just completed: **135 contracts, 181 backend unit, 153 API, 22 worker, 125 frontend, 145 PostgreSQL + 2 normal skips, 13 focused Playwright, OpenAPI, evidence-reference and worker log-safety checks all passed**. `Pasted text.txt`

After the quick routing test above, run:

```powershell
npm.cmd run ci:local
```

You **do not need to rerun `verify:intermediate-ingestion`** - you already ran it successfully and that result is now recorded.

One expected thing: because this PR adds a `.gitea/workflows/` file, your planner will intentionally select **full CI for this PR once**. After it merges, ordinary PRs go straight back to optimized change-aware routing. The new full Intermediate acceptance suite runs only when someone manually chooses **Intermediate Ingestion Acceptance**.

After `ci:local` passes, we can deal with the remaining real #364 close-out items: **throughput measurement and #417/#418 user-testing evidence**.

## Prompt:
9/9/2026, 8:35:11 PM

PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool> git apply --check .\issue-364-ci-integration.patch
error: patch failed: docs/testing/intermediate-ingestion-acceptance.md:28
error: docs/testing/intermediate-ingestion-acceptance.md: patch does not apply
error: patch failed: evidence/validation/issue-364-intermediate-ingestion-acceptance.md:37
error: evidence/validation/issue-364-intermediate-ingestion-acceptance.md: patch does not apply
PS C:\Users\shayn\OneDrive\Desktop\Sport-Analytics-Tool>

[Attachment: Pasted markdown(20260909-183502).md]

## Response:
9/9/2026, 8:35:15 PM

> **Revising the patch**
>
> I’m rebuilding the change against the documentation currently provided, while avoiding the two files whose context no longer matches. I’m checking the remaining hunks so the revised patch applies cleanly without overwriting newer edits.
>
> **Revised the patch**
>
> 
>
> **Inspecting Current Docs and Patch Files**
>
>
> **Applying safe fixes**
>
> I’m narrowing the revision to the files that still match the current state, then I’m handling the two mismatched documents separately so newer content stays intact and the patch remains easy to apply.
>
> **Applied safe fixes**
>
> 
>
> **Creating core patch for CI integration**
>
>
> **Inspected repository patches and verified CI documentation integration**
>
> 
>
> Worked for 3m 32s

Yep - the failure is because those two #364 docs have already diverged from the exact version I built the original CI patch against. Your current acceptance guide confirms that it still has the verifier section but not yet the hosted-workflow section. `Pasted markdown.md`

I’ve fixed this properly rather than giving you another fragile line-number patch.

[Download corrected CI core patch](sandbox:/mnt/data/issue-364-ci-integration-core.patch)

[Download #364 doc-sync script](sandbox:/mnt/data/issue-364-sync-ci-docs.py)

Run from repo root:

```powershell
git apply --check .\issue-364-ci-integration-core.patch
git apply .\issue-364-ci-integration-core.patch

python .\issue-364-sync-ci-docs.py
```

The script updates the two conflicting files by **semantic headings instead of line numbers**, so it won't care about the formatting changes:

```text
docs/testing/intermediate-ingestion-acceptance.md
evidence/validation/issue-364-intermediate-ingestion-acceptance.md
```

I tested the combination against a reconstructed repo with **#363 + your existing #364 work**, and the resulting files exactly match the intended CI-integrated versions.

Then delete the helper script - it is **not repository code**:

```powershell
Remove-Item .\issue-364-sync-ci-docs.py
```

Then:

```powershell
npm.cmd run format
npm.cmd run test:ci-routing
```

You should get the new routing tests too; my reconstructed run had **36/36 passing**.

Then do:

```powershell
npm.cmd run ci:local
```

You **do not need to rerun**:

```powershell
npm.cmd run verify:intermediate-ingestion
```

because that already passed comprehensively. The evidence file now records that successful run.

So after this, the setup is:

```text
Normal PR
→ optimized change-aware CI
→ only relevant lanes

#364 / major ingestion acceptance
→ manual "Intermediate Ingestion Acceptance"
→ full integrated ingestion verifier

main push
→ normal optimized deployment behavior
```

No full ingestion suite on every PR, no duplicate deployments, no duplicate coverage. This is the version I would keep.

## Prompt:
9/9/2026, 8:43:46 PM

transcript and push time?

[Attachment: Pasted text(20260909-184334).txt]

## Response:
9/9/2026, 8:43:50 PM

Yes - **push time**. Your full local CI is green, including the new CI-routing tests, E2E, database, docs, deployment helpers and hygiene. `Pasted text.txt`

Use this transcript name:

```text
evidence/ai/transcripts/shayna-unterslak/2026-09-09-issue-364-intermediate-ingestion-acceptance.md
```

Export/save this whole #364 ChatGPT conversation there.

Then make sure your AI CSV row points to that exact transcript path. If the row is already there from earlier, just update the final evidence wording to say the integrated verifier and full local CI passed.

Stage:

```powershell
git add .gitea/workflows/intermediate-ingestion-acceptance.yml
git add apps/backend/src/modules/README.md
git add docs
git add evidence/validation/issue-364-intermediate-ingestion-acceptance.md
git add evidence/ai/registers/shayna-unterslak.csv
git add evidence/ai/transcripts/shayna-unterslak/2026-09-09-issue-364-intermediate-ingestion-acceptance.md
git add mkdocs.yml
git add package.json
git add packages/contracts/src/tests/season-upload.test.ts
git add scripts
git add tests/ci/intermediate-ingestion-acceptance.test.mjs

git status
```

Check you have **not** accidentally staged unrelated exports or patch files.

Commit:

```powershell
git commit -m "test(ingestion): verify intermediate pipeline acceptance" -m "Adds the integrated Intermediate ingestion acceptance harness, manual optimized CI workflow, season-scale contract verification, evidence mapping, documentation reconciliation and CI regression coverage for #364." -m "Assisted-by: ChatGPT-Web[GPT-5.6 Sol]"
```

Then:

```powershell
git push -u origin test/364-intermediate-ingestion-acceptance
```

### PR

**Title:**

```text
test(ingestion): verify Intermediate pipeline acceptance
```

**Description:**

```markdown
## Summary

Adds the final integrated verification harness and evidence framework for the Intermediate ingestion pipeline under #364.

### Changes

- add `verify:intermediate-ingestion` acceptance harness
- verify season-package contracts without application database IDs
- exercise contracts, API, backend, worker, frontend, PostgreSQL and focused browser journeys
- add worker log-safety verification
- add complete #364 acceptance-criteria evidence mapping
- map every Intermediate project-brief requirement to verification evidence
- add a manual-only `Intermediate Ingestion Acceptance` hosted workflow
- preserve normal change-aware CI without running the full acceptance suite on ordinary PRs
- add CI regression tests for the manual acceptance workflow
- reconcile stale architecture, deployment, testing and technology documentation
- record local integrated-verification and CI results

## Validation

`npm run verify:intermediate-ingestion` - PASS

- Contracts: 135 passed
- Backend unit: 181 passed
- Backend API: 153 passed
- Worker: 22 passed
- Frontend: 125 passed
- PostgreSQL integration: 145 passed, 2 expected performance-plan tests skipped
- Focused Playwright: 13 passed
- OpenAPI: passed
- worker log-safety verification: passed

`npm run ci:local` - PASS

- CI routing: 36/36 passed
- formatting/hygiene/lint/typecheck/build: passed
- deployment helper tests: 19/19 passed
- full Playwright: 42/42 passed
- strict MkDocs build: passed
- PostgreSQL integration: passed

## Remaining #364 close-out gates

This PR intentionally does not manufacture external evidence.

Still required before #364 itself is closed:

- formal representative-user evidence from #417/#418
- representative season-scale ingestion throughput against the approved target

## AI Declaration

Verification planning, test orchestration, documentation, CI integration and debugging were completed with assistance from ChatGPT-Web[GPT-5.6 Sol].

Transcript:
`evidence/ai/transcripts/shayna-unterslak/2026-09-09-issue-364-intermediate-ingestion-acceptance.md`

Refs #364
```

Important: use **`Refs #364`**, not `Closes #364`, because the two external acceptance gates are still outstanding.

So: **transcript → commit → push → PR now.**



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)