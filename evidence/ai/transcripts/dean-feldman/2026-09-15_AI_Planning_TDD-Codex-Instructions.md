# Adjust To TDD

**User:** Anonymous  
**Created:** 9/15/2026 19:27:18  
**Updated:** 9/15/2026 19:40:11  
**Exported:** 9/21/2026 14:35:01  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6aa97ff6-4ebc-83ea-bfc0-5dc852469d51](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6aa97ff6-4ebc-83ea-bfc0-5dc852469d51)  

## Prompt:
9/15/2026, 7:27:41 PM

adjust this to use TDD

[Attachment: Pasted markdown.md]

## Response:
9/15/2026, 7:27:45 PM

> **Rewriting coding-agent guidance for TDD**
>
>
> **Rewrote coding-agent guidance for TDD**
>
> 
>
> Worked for 25s

Adjusted the Codex instructions so **TDD is now the default workflow for every behavioural code change**. The original scope, Git, PR permission, AI attribution, and repository rules are preserved. `Pasted markdown.md`

Main changes:
- Mandatory **Red → Green → Refactor** cycle.
- Bug fixes require a **failing regression test before the fix**.
- Production code should not be written before the relevant failing test.
- Explicit guidance on choosing unit vs API/integration vs UI vs E2E tests.
- Codex must record the actual **Red command/result and Green command/result**.
- Passing tests cannot be weakened or rewritten merely to match incorrect behaviour.
- Documentation/config-only changes are exempt where executable TDD is not meaningful.
- Final review now verifies acceptance-criterion coverage and TDD evidence.
- PR-readiness report must include the TDD evidence.

[Download the TDD-adjusted Codex instructions](sandbox:/mnt/data/codex-instructions-tdd.md)

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/15/2026, 7:29:32 PM

also adjust it to be the most efficenit for codex 5hr limit while ensuring the full issue scope is completed

## Response:
9/15/2026, 7:29:45 PM

> **Optimizing execution**
>
> I’m updating the instructions for efficient completion within five hours. I’ll emphasize rapid scope mapping, risk-first implementation, focused testing, timed checkpoints, minimal context overhead, and a clear fallback when the full issue cannot be completed safely.
>
> **Optimized execution**
>
> 
>
> Worked for 10s

Updated it for **TDD + Codex 5-hour efficiency without sacrificing issue scope**.

Key changes:
- Added a **5-hour execution strategy** with time budgets for scope lock, TDD implementation, validation, docs/AI attribution, and final audit.
- Added an **acceptance-criteria scope ledger** so Codex cannot accidentally finish only the easiest parts.
- Made **full issue completion the optimization target**, not maximum test count or refactoring.
- Added **time-pressure rules**: optional refactors and cleanup are cut first; acceptance criteria are never silently dropped.
- Added a **validation funnel**: new test → affected module → workspace → full CI, avoiding repeated expensive suites.
- Added guidance to **front-load risky blockers** such as migrations, auth, external APIs, deployment, and contracts.
- Added a **20–30 minute blocker rule** so Codex can continue independent work instead of burning the entire session on one problem.
- At 60 minutes remaining, Codex stops optional refactoring; at 30 minutes remaining, it makes only required scope/validation changes.
- Final review now explicitly reconciles **every acceptance criterion** against implementation, TDD evidence, validation, docs, and AI records.

[Download the optimized TDD + 5-hour Codex instructions](sandbox:/mnt/data/codex-instructions-tdd-5hr-optimized.md)

This should be substantially better for long Codex issue runs because it minimizes unnecessary context loading and repeated full-suite execution while protecting the complete issue scope.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/15/2026, 7:39:48 PM

so hts one will wokr on TDD?

## Response:
9/15/2026, 7:39:57 PM

Yes. The latest version is explicitly designed to make Codex use **TDD for behavioural code changes**.

It requires this sequence:

1. **Red** — write the test first and run it to prove it fails for the expected reason.
2. **Green** — make the smallest production-code change needed to pass it.
3. **Refactor** — clean up only while keeping the tests green.
4. Repeat for **every acceptance criterion**.

For bugs, it specifically requires:

> failing regression test → implement fix → prove regression test passes

It also prevents Codex from saying it followed TDD without evidence: it must record the actual **Red command/result** and **Green command/result**.

The 5-hour optimization does **not** weaken TDD. Instead, it makes Codex save time by using narrow tests first:

`single test → affected test file/module → workspace/package → full CI`

The only things exempt from strict Red/Green TDD are changes where a meaningful executable test doesn't exist, such as documentation-only or some non-behavioural configuration changes.

Most importantly, the acceptance-criteria ledger means Codex should not use the 5-hour limit as an excuse to finish only part of the issue.

[Use this version](sandbox:/mnt/data/codex-instructions-tdd-5hr-optimized.md)

So for a normal issue, the intended Codex flow is essentially:

```text
Read issue
→ list every acceptance criterion
→ identify existing implementation/tests
→ write failing test for AC1
→ implement AC1
→ pass test
→ repeat for AC2, AC3...
→ run broader affected tests
→ docs/AI attribution
→ verify every AC is complete
→ report ready for review
```

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)