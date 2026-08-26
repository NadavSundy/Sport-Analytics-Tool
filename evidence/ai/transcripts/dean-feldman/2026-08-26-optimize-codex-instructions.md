# Optimize Codex Instructions

**User:** Anonymous  
**Created:** 8/26/2026 20:49:14  
**Updated:** 8/26/2026 20:50:37  
**Exported:** 8/26/2026 21:16:10  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6a8f3525-f918-83e9-9124-e788797e415f](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6a8f3525-f918-83e9-9124-e788797e415f)  

## Prompt:
8/26/2026, 8:49:12 PM

adjust this to be the most token and time efficent and aware

[Attachment: Pasted markdown.md]

## Response:
8/26/2026, 8:49:12 PM

> **Streamlining agent guidance**
>
> I’m consolidating repeated rules, making context gathering task-driven, and preserving critical requirements: scoped edits, verification, explicit approvals, documentation updates, and attribution.
>
> **Streamlined agent guidance**
>
> 
>
> Worked for 15s

Recommended outcome: replace the current instructions with a **single compact, priority-ordered rule set**. The existing version is strong, but repeats the push/PR gate, AI register requirements, completion checks, scope rules, and terminology several times, which wastes context on every Codex turn. `Pasted markdown.md`

I’ve kept the important safeguards while making context loading **lazy and task-specific**. This still preserves the course requirement that AI-generated code be attributed with tool/model information and that submitted work be verified. `ai_policy.pdf` It also protects the project requirements around handwritten APIs, architecture, testing, documentation, security, and Git methodology. `project_briefs (4).pdf`

**document: **

# Dean Feldman - Local Codex Instructions
## Sport Analytics Tool

These instructions apply to Dean's local Codex workflow.

## 1. Primary rule

Implement **only the supplied Gitea issue**.

The issue description and acceptance criteria define scope and "done".

Do not add unrelated:
- features;
- refactors;
- cleanup;
- dependency upgrades;
- architecture changes;
- documentation rewrites;
- future backlog work.

If useful out-of-scope work is discovered, report it as follow-up work instead of implementing it.

If an out-of-scope change appears necessary, stop and explain why.

---

## 2. Efficient context loading

Work from the repository root.

Before editing:

1. Check:
   - `git status`
   - current branch
   - relevant recent history

2. Obtain the issue requirements.
   - If only an issue number is supplied, use available local/Gitea context.
   - If the requirements cannot be obtained reliably, ask Dean.
   - Never guess acceptance criteria.

3. Read only the repository context needed for the task.

Always establish the applicable rules from:
- `README.md`
- `docs/git-methodology.md`

Load other documentation **only when relevant**:

| Change | Read |
|---|---|
| UI/frontend | `docs/design/`, relevant architecture docs |
| backend/API | `docs/api/`, relevant architecture docs |
| database | `docs/database/`, relevant ADRs |
| auth/security | `docs/security/`, relevant ADRs |
| data/events | `docs/data/` |
| deployment/CI | `docs/deployment/` |
| testing | `docs/development/testing.md` |
| architecture decision | relevant `docs/adr/` |
| AI records | `docs/ai/usage.md`, `evidence/ai/registers/README.md` |

If `gitea-export/ai-project-context.md` exists, use it when tracker/project context is useful.

The live checkout is authoritative for code.
Gitea is authoritative for current tracker state.

Do not repeatedly reread unchanged files during the same task unless necessary.

Prefer targeted search, existing tests, and relevant file inspection over reading entire directories.

The generated `gitea-export/` directory must remain uncommitted.

Never request, expose, store, or commit a Gitea token.

Only refresh authenticated Gitea exports when Dean explicitly requests it and secure authentication is available.

---

## 3. Git workflow

Follow `docs/git-methodology.md`.

Never develop directly on `main`.

Before a new issue:
- update `main`;
- create one branch for the issue.

Branch format:

`<type>/<issue-number>-<short-description>`

Use only repository-approved branch types.

Normal commits must reference:

`Refs #<issue-number>`

Codex may make **as many local commits as useful without asking permission**.

Keep commits:
- issue-scoped;
- logically focused;
- accurately attributed;
- consistent with repository methodology.

Do not rewrite existing history unless required and safe.

Never force-push `main`.

---

## 4. Push / PR permission gate

**Never push or create a Pull Request without Dean's explicit approval.**

Requests such as:
- implement;
- complete;
- finish;
- commit;
- prepare;
- get ready for review

do **not** grant push/PR permission.

When local work is ready, report:

- implementation summary;
- acceptance criteria satisfied;
- commits;
- changed files;
- tests/checks actually run;
- documentation changes;
- AI register status;
- known limitations;
- remaining Definition of Done work.

Then ask exactly:

**May I push the branch and create the Pull Request?**

Do not push or create the PR until Dean approves.

Approval to push/create a PR does **not** grant permission to merge or close the issue.

---

## 5. Implementation rules

Before editing a file, it must contribute to:
- an acceptance criterion; or
- an applicable Definition of Done requirement.

Prefer the smallest correct change.

Inspect existing implementation and tests first and follow established patterns.

Do not:
- opportunistically refactor;
- reformat unrelated files;
- rename unrelated code;
- introduce unnecessary dependencies;
- change schemas unnecessarily;
- change public interfaces unnecessarily;
- implement adjacent backlog features;
- weaken tests.

Preserve backwards compatibility unless the issue requires otherwise.

Handle relevant validation and errors.

Do not invent requirements.

---

## 6. Architecture constraints

Respect repository architecture, approved ADRs, and COMS3011A requirements.

In particular:

- frontend and backend remain separate;
- application data goes through the team's handwritten HTTP API;
- do not introduce generated application-data endpoints;
- do not create another backend;
- do not replace the established authentication architecture;
- do not introduce conflicting technology unnecessarily.

If the issue conflicts with an approved architecture/security decision or compulsory course requirement, stop and report the conflict.

---

## 7. Testing and validation

Behaviour changes require relevant tests.

Use existing project frameworks and conventions.

Determine commands from repository configuration/documentation; do not invent commands.

During implementation:
- run the narrowest useful tests first.

Before review:
- run all applicable tests/checks reasonably affected by the change.

This may include:
- tests;
- lint;
- formatting;
- type-check;
- build;
- static analysis;
- `git diff --check`.

Never claim a check passed unless it was actually executed successfully.

Never disable, delete, skip, or weaken tests merely to obtain a passing result.

If a required check cannot run, state why.

---

## 8. Documentation

Update documentation only when the issue changes a documented:
- behaviour;
- API;
- database schema;
- security rule;
- setup process;
- dependency;
- deployment process;
- testing procedure;
- architecture/interface.

Do not rewrite unrelated documentation.

Follow repository AI-writing rules and the COMS3011A AI policy where applicable.

---

## 9. AI attribution

Codex-generated or materially Codex-modified code must be attributed in the relevant commit.

Use:

```text
<type>(<scope>): <imperative description>

Refs #<issue-number>

Assisted-by: Codex[ACTUAL MODEL USED]
```

Use the **exact active model**.

Never guess the model or copy it from previous work.

If the exact model cannot be established, stop before committing affected code and ask Dean.

Only list AI tools/models actually involved in that commit.

---

## 10. Dean's AI register

Material Codex work retained in the repository must be recorded in Dean's AI register.

Default path:

`evidence/ai/registers/dean-feldman.csv`

If `evidence/ai/registers/README.md` defines another current Dean-specific path, use it.

Never modify another member's register.

Follow the register README exactly.

At minimum:
- preserve the header;
- quote every field;
- use `YYYY-MM-DD`;
- use semicolons inside fields instead of commas;
- preserve valid CSV;
- preserve trailing newline;
- record only actual tools/models/work;
- never invent transcripts, commits, PRs, tests, or verification.

Tool:

`Codex`

Model:

exact active model.

Verification/adaptation may contain only checks that actually occurred.

Do not claim Dean personally reviewed or verified work unless Dean explicitly confirms it.

Update the register as retained Codex work changes and include the update in an appropriate local commit.

Before requesting push/PR permission, verify the register accurately covers retained material Codex work.

---

## 11. Final local review

Before saying the implementation is ready:

1. Re-read the issue and acceptance criteria.
2. Review changed files and commits.
3. Confirm every change is in scope.
4. Check for accidental unrelated changes.
5. Run applicable validation.
6. Confirm required docs are current.
7. Confirm architecture/course requirements remain satisfied.
8. Confirm AI attribution is correct.
9. Confirm Dean's AI register is current and valid.
10. Inspect `git status`.
11. Run `git diff --check` where applicable.

Report any deliberately unimplemented follow-up work separately.

---

## 12. Completion terminology

If implementation, validation, local commits, documentation, and AI records are ready but the branch has not yet been pushed/reviewed, say:

**Implementation ready for review**

Do not describe the Gitea issue as complete until the repository's Definition of Done has actually been satisfied.

Typical remaining steps are:
- Dean permission;
- push;
- PR creation;
- human/peer review;
- CI;
- merge;
- issue closure.

Never fabricate evidence, tests, commits, reviews, PRs, stakeholder feedback, contributions, or AI records.

### Why this version is better

The largest saving comes from changing **“read all these files before every implementation”** into **progressive context loading**. Codex gets the issue, Git methodology, and immediately relevant documentation instead of repeatedly consuming architecture, security, data, testing, AI, database, and deployment documentation for an unrelated small task.

I also consolidated the original repeated rules into one location each: **push permission once, AI register once, attribution once, completion once**. The behavioural safeguards are effectively unchanged.

One further optimization I would make in the actual repo is to keep this file short and let it defer to `docs/git-methodology.md` and `evidence/ai/registers/README.md` rather than duplicating their exact formatting rules. That prevents this prompt becoming stale when repository methodology changes. `Pasted markdown.md`

## Prompt:
8/26/2026, 8:50:34 PM

does this include it can make as many commits as it one

## Response:
8/26/2026, 8:50:33 PM

Yes. It explicitly says:

> **“Codex may make as many local commits as useful without asking permission.”**

So Codex can make **unlimited reasonable local commits** while working on the issue. `Pasted markdown.md`

The only permission gate is for:
- `git push`
- creating the Pull Request

It must ask you before either of those. It does **not** need to ask before each commit.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)