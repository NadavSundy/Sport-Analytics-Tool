# Prioritize Event Correction

**User:** Anonymous  
**Created:** 8/27/2026 15:29:18  
**Updated:** 8/27/2026 15:34:53  
**Exported:** 8/28/2026 17:18:00  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6a903ba2-8084-83ea-9f2b-0eaf5b8784af](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6a903ba2-8084-83ea-9f2b-0eaf5b8784af)  

## Prompt:
8/27/2026, 3:29:14 PM

[Implement authorised event correction with automatic statistic refresh](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/267)

\#267 opened yesterday by [Shayna](https://sdp.ms.wits.ac.za/Shayna)

[svg Sprint 2](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/milestone/12)

svg 0 / 9

[**area: api**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=42)

[**area: data**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=43)

[**area: database**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=32)

[**priority: high**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=37)

[**tier: basic**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=45)

[**type: feature**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=46)

[Dean](https://sdp.ms.wits.ac.za/Dean) ([image](https://sdp.ms.wits.ac.za/avatars/92d04236912dc4945217b1b981a7c50a?size=56))

svg

[Implement JSON and CSV file-upload submissions through the shared validation pipeline](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/265)

\#265 opened yesterday by [Shayna](https://sdp.ms.wits.ac.za/Shayna)

[svg Sprint 2](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/milestone/12)

svg 0 / 10

[**area: api**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=42)

[**area: data**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=43)

[**area: infrastructure**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=30)

[**priority: high**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=37)

[**tier: basic**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=45)

[**type: feature**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=46)

[Dean](https://sdp.ms.wits.ac.za/Dean) ([image](https://sdp.ms.wits.ac.za/avatars/92d04236912dc4945217b1b981a7c50a?size=56))

svg

[Allow rejected or revoked submitters to request access again and flag previous revocations](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/256)

\#256 opened 2 days ago by [Shayna](https://sdp.ms.wits.ac.za/Shayna)

[svg Sprint 2](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/milestone/12)

[svg docs(planning): record initial Sprint 2 plan #260](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/pulls/260)

svg 0 / 11

[**area: api**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=42)

[**area: database**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=32)

[**area: frontend**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=35)

[**priority: high**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=37)

[**tier: basic**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=45)

[**type: bug**](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues?labels=1)

[Dean](https://sdp.ms.wits.ac.za/Dean) ([image](https://sdp.ms.wits.ac.za/avatars/92d04236912dc4945217b1b981a7c50a?size=56))

Whichonesof these are next, hjelp me make a brnahc fo rit

## Response:
8/27/2026, 3:29:16 PM

> **Searching the web**
>
>
> **Prioritizing next work**
>
> I’m comparing dependencies and impact. Since the event correction now enables refreshed stats and submissions are already validated, I’m checking whether authentication is independent. My likely next choice is 256 if it blocks users; otherwise 267 offers the clearest downstream value.
>
> **Selecting the next task**
>
> I’m choosing issue 267 first because it directly delivers the project’s core correction-and-refresh behavior and creates a foundation for later history work. I’d branch from updated main as `feat/267-event-correction-stat-refresh`.
>
> **Prioritized and selected the next task**
>
> 
>
> **Searching the web**
>
> 
>
> Worked for 25s

**Do #267 next**: **Implement authorised event correction with automatic statistic refresh**.

Of the three, I’d prioritise them:

1. **#267 - Event correction + automatic statistic refresh** ← **next**
2. **#265 - JSON/CSV file-upload submissions**
3. **#256 - Re-request submitter access / revoked flag**

### Why #267 first

This is directly one of the **core Basic-tier requirements** in the Sport Analytics brief:

> Correcting an event should be enough to bring every statistic derived from that event back in line, without anything being re-entered manually. `sport_analytics (1).pdf`

That makes #267 much more than a normal feature: it validates the central architecture of the project - **events → derivation → statistics**. It also contributes strongly to Sprint 2's **Core Features (25%)** and **API (15%)** criteria. `project_briefs (4).pdf`

#265 is also compulsory Basic-tier work because the brief explicitly requires submissions to work through uploaded files or direct submission and be validated against the event schema. `sport_analytics (1).pdf` But I would do it immediately **after #267**.

#256 is important because broken submitter access can interfere with the approved-submitter requirement, but it is primarily fixing the access workflow rather than proving the core event/statistics architecture.

### Make the branch

From the repository root:

```bash
git checkout main
git pull origin main

git checkout -b feat/267-event-correction-stat-refresh
```

Then verify:

```bash
git branch --show-current
git status
```

You should see:

```text
feat/267-event-correction-stat-refresh
```

### Before you start Codex

Give Codex **issue #267 only**, and have it inspect the existing event/derivation/database implementation before changing anything. This issue needs particular care around:

- authorisation: only permitted users can correct events;
- updating the **event**, not manually editing statistics;
- automatically recomputing every affected statistic;
- database consistency/transactions;
- validation and useful HTTP errors;
- API tests proving correction works;
- tests proving unauthorised correction fails;
- tests proving statistics actually change after correction;
- preserving traceability back to the original event/submission.

**Do not let #267 turn into #265 as well.** File upload is a separate issue and PR.

If AI generates code, remember the COMS3011A policy requires the actual AI tool/model to be attributed in the relevant commit. `ai_policy.pdf`

**Next command:**

```bash
git checkout main && git pull origin main && git checkout -b feat/267-event-correction-stat-refresh
```

Then send me the **full description + acceptance criteria for #267**, and I can check its scope/dependencies and give you the exact Codex prompt to implement it.

## Prompt:
8/27/2026, 3:31:02 PM

-Tool> git status 
On branch feat/267-event-correction-stat-refresh 
Changes not staged for commit: 
  (use "git add <file>..." to update what will be committed) 
  (use "git restore <file>..." to discard changes in working directory) 
        modified:   .gitignore 
        modified:   AGENTS.md 
 
no changes added to commit (use "git add" and/or "git commit -a") 
PS C:\Users\deanf\Downloads\Sport-Analytics-Tool> git add . 
PS C:\Users\deanf\Downloads\Sport-Analytics-Tool> git status 
On branch feat/267-event-correction-stat-refresh 
Changes to be committed: 
  (use "git restore --staged <file>..." to unstage) 
        modified:   .gitignore 
        modified:   AGENTS.md 
 
PS C:\Users\deanf\Downloads\Sport-Analytics-Tool> s
whyt did it add it, i thought theignore means it wontnode_modules/
dist/
build/
coverage/
.venv/
.env
.env.*
!.env.example
*.log
.DS_Store
.vscode/
.idea/
*.local

playwright-report/
test-results/
coverage/
test-results/

# ---> Node
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*
.pnpm-debug.log*

# Diagnostic reports (https://nodejs.org/api/report.html)
report.[0-9]*.[0-9]*.[0-9]*.[0-9]*.json

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Directory for instrumented libs generated by jscoverage/JSCover
lib-cov

# Coverage directory used by tools like istanbul
coverage
*.lcov

# nyc test coverage
.nyc_output

# Grunt intermediate storage (https://gruntjs.com/creating-plugins#storing-task-files)
.grunt

# Bower dependency directory (https://bower.io/)
bower_components

# node-waf configuration
.lock-wscript

# Compiled binary addons (https://nodejs.org/api/addons.html)
build/Release

# Dependency directories
node_modules/
jspm_packages/

# Snowpack dependency directory (https://snowpack.dev/)
web_modules/

# TypeScript cache
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Optional stylelint cache
.stylelintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variable files
.env
.env.development.local
.env.test.local
.env.production.local
.env.local

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next
out

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
# Comment in the public line in if your project uses Gatsby and not Next.js
# https://nextjs.org/blog/next-9-1#public-directory-support
# public

# vuepress build output
.vuepress/dist

# vuepress v2.x temp and cache directory
.temp
.cache

# vitepress build output
**/.vitepress/dist

# vitepress cache directory
**/.vitepress/cache

# Docusaurus cache and generated files
.docusaurus

# Serverless directories
.serverless/

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port

# Stores VSCode versions used for testing VSCode extensions
.vscode-test

# yarn v2
.yarn/cache
.yarn/unplugged
.yarn/build-state.yml
.yarn/install-state.gz
.pnp.*


# Downloaded Cricsheet data
data/cricsheet/downloads/
data/cricsheet/matches/
data/cricsheet/manifest.json
data/cricsheet/summary.json

# Python-generated files
__pycache__/
*.py[cod]

# Local Gitea issue snapshots (may contain internal project information)
/gitea-export/
/.gitea-export.tmp.*/

# Generated Azure deployment artifacts
/.deployment/

# Allow the documented database-test environment template
!apps/backend/.env.test.example

# Generated MkDocs output
/site/

# Local Codex instructions 
AGENTS.md

## Response:
8/27/2026, 3:31:13 PM

> **Handling tracked files**
>
> I’m distinguishing between ignoring a file and removing it from Git’s index. Since `AGENTS.md` is already tracked, I’m considering whether to untrack it while keeping the local copy, then commit the updated ignore rule separately from feature work.
>
> **Handled tracked files**
>
> 
>
> Worked for 11s

**Recommended outcome: keep `AGENTS.md` local and make sure it cannot accidentally get into your #267 PR.** What happened is normal Git behaviour: `.gitignore` **does not apply to files that Git is already tracking**.

You added:

```gitignore
# Local Codex instructions
AGENTS.md
```

but because `AGENTS.md` was already tracked, this:

```powershell
git add .
```

still staged it.

First, unstage both files so we can clean this up safely:

```powershell
git restore --staged AGENTS.md .gitignore
```

Check whether Git already tracks `AGENTS.md`:

```powershell
git ls-files AGENTS.md
```

If it prints:

```text
AGENTS.md
```

then that confirms the issue.

### Best option for your current #267 branch

Because removing `AGENTS.md` from the repository would be an **unrelated repository-hygiene change** in your event-correction PR, I would **not** `git rm --cached` it on this feature branch.

Instead, tell your local Git installation not to treat your personal changes to it as normal working-tree changes:

```powershell
git update-index --skip-worktree AGENTS.md
```

Then:

```powershell
git status
```

`AGENTS.md` should disappear from the modified-files list.

You can now decide what to do with `.gitignore`. Since the `AGENTS.md` rule only becomes useful once the file is actually removed from repository tracking, I would also restore that unrelated `.gitignore` change for now:

```powershell
git restore .gitignore
```

Then verify:

```powershell
git status
```

Ideally, before starting #267, you should see:

```text
On branch feat/267-event-correction-stat-refresh
nothing to commit, working tree clean
```

### If you want `AGENTS.md` permanently removed from Git

That is a separate repo-level change:

```powershell
git rm --cached AGENTS.md
git add .gitignore
git commit -m "chore(git): keep local agent instructions untracked"
```

That commit would delete `AGENTS.md` from the repository for **everyone**, while leaving your local copy on disk because of `--cached`. After that, `.gitignore` actually prevents future `git add .` commands from adding it again.

I recommend doing that in a **separate branch/PR**, not mixing it into #267.

For right now, run:

```powershell
git restore --staged AGENTS.md .gitignore
git update-index --skip-worktree AGENTS.md
git restore .gitignore
git status
```

Then paste the output of `git status` and we can make sure your #267 branch is completely clean before Codex starts working.

## Prompt:
8/27/2026, 3:31:47 PM

-Tool> git restore --staged AGENTS.md .gitignore
PS C:\Users\deanf\Downloads\Sport-Analytics-Tool> git ls-files AGENTS.md
AGENTS.md
PS C:\Users\deanf\Downloads\Sport-Analytics-Tool>

## Response:
8/27/2026, 3:31:52 PM

Perfect — that confirms it: **`AGENTS.md` is already tracked by Git**, so `.gitignore` cannot stop it from being staged.

For this #267 branch, keep it local without altering the repo history. Run:

```powershell
git update-index --skip-worktree AGENTS.md
git restore .gitignore
git status
```

Expected result: `AGENTS.md` should disappear from `git status`, and ideally the branch becomes clean.

If `git status` still shows anything, paste the output and I’ll tell you exactly what to do next.

## Prompt:
8/27/2026, 3:32:52 PM

so now from now on i can do git add . and it wont push the file

## Response:
8/27/2026, 3:32:58 PM

Yes — with `skip-worktree` set, your normal local edits to `AGENTS.md` should no longer be picked up by:

```bash
git add .
```

So your normal workflow can be:

```bash
git add .
git status
git commit ...
git push ...
```

and `AGENTS.md` should stay out of the commit.

Two important details:

- `git push` only pushes **commits**, not uncommitted/staged files.
- `skip-worktree` is a **local Git setting**, not a permanent repository rule. A merge, checkout, rebase, or certain Git operations can potentially affect it.

You can verify it anytime with:

```bash
git ls-files -v AGENTS.md
```

If you see:

```text
S AGENTS.md
```

then `skip-worktree` is active.

For maximum safety, still glance at:

```bash
git status
```

before every commit.

Long term, the proper permanent solution is to remove `AGENTS.md` from tracking in a separate PR and keep:

```gitignore
AGENTS.md
```

in `.gitignore`. Then `git add .` truly cannot add it back under normal use.

## Prompt:
8/27/2026, 3:33:43 PM

surely i need to add somethin to my gitignore?
node_modules/
dist/
build/
coverage/
.venv/
.env
.env.*
!.env.example
*.log
.DS_Store
.vscode/
.idea/
*.local

playwright-report/
test-results/
coverage/
test-results/

# ---> Node
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*
.pnpm-debug.log*

# Diagnostic reports (https://nodejs.org/api/report.html)
report.[0-9]*.[0-9]*.[0-9]*.[0-9]*.json

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Directory for instrumented libs generated by jscoverage/JSCover
lib-cov

# Coverage directory used by tools like istanbul
coverage
*.lcov

# nyc test coverage
.nyc_output

# Grunt intermediate storage (https://gruntjs.com/creating-plugins#storing-task-files)
.grunt

# Bower dependency directory (https://bower.io/)
bower_components

# node-waf configuration
.lock-wscript

# Compiled binary addons (https://nodejs.org/api/addons.html)
build/Release

# Dependency directories
node_modules/
jspm_packages/

# Snowpack dependency directory (https://snowpack.dev/)
web_modules/

# TypeScript cache
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Optional stylelint cache
.stylelintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variable files
.env
.env.development.local
.env.test.local
.env.production.local
.env.local

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next
out

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
# Comment in the public line in if your project uses Gatsby and not Next.js
# https://nextjs.org/blog/next-9-1#public-directory-support
# public

# vuepress build output
.vuepress/dist

# vuepress v2.x temp and cache directory
.temp
.cache

# vitepress build output
**/.vitepress/dist

# vitepress cache directory
**/.vitepress/cache

# Docusaurus cache and generated files
.docusaurus

# Serverless directories
.serverless/

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port

# Stores VSCode versions used for testing VSCode extensions
.vscode-test

# yarn v2
.yarn/cache
.yarn/unplugged
.yarn/build-state.yml
.yarn/install-state.gz
.pnp.*


# Downloaded Cricsheet data
data/cricsheet/downloads/
data/cricsheet/matches/
data/cricsheet/manifest.json
data/cricsheet/summary.json

# Python-generated files
__pycache__/
*.py[cod]

# Local Gitea issue snapshots (may contain internal project information)
/gitea-export/
/.gitea-export.tmp.*/

# Generated Azure deployment artifacts
/.deployment/

# Allow the documented database-test environment template
!apps/backend/.env.test.example

# Generated MkDocs output
/site/

## Response:
8/27/2026, 3:33:55 PM

Yes — **you should add `AGENTS.md` to `.gitignore`**, but there are two separate mechanisms here.

At the bottom of `.gitignore`, add:

```gitignore
# Local Codex instructions
/AGENTS.md
```

The leading `/` means specifically the `AGENTS.md` in the repository root.

However, because `AGENTS.md` is **currently tracked**, that `.gitignore` rule alone does nothing to it. That's why we enabled:

```bash
git update-index --skip-worktree AGENTS.md
```

So right now:

- `skip-worktree` protects your local `AGENTS.md` changes.
- `.gitignore` should contain `/AGENTS.md` for the **future**, once the file is untracked.
- To make the solution permanent, eventually run `git rm --cached AGENTS.md` and commit that change.

### For your current #267 branch

I would **not mix this repository-hygiene change into #267**. Keep `skip-worktree` active and work on the event-correction issue.

Verify:

```bash
git ls-files -v AGENTS.md
```

You want:

```text
S AGENTS.md
```

### Then make a separate hygiene PR later

From `main`:

```bash
git checkout main
git pull origin main
git checkout -b chore/ignore-local-agents
```

Add to `.gitignore`:

```gitignore
# Local Codex instructions
/AGENTS.md
```

Then:

```bash
git update-index --no-skip-worktree AGENTS.md
git rm --cached AGENTS.md
git add .gitignore
git status
```

You should see roughly:

```text
modified: .gitignore
deleted:  AGENTS.md
```

That **doesn't delete your local `AGENTS.md` file**; `--cached` only removes it from Git tracking.

After that change is merged, `git add .` will naturally ignore `AGENTS.md` without needing `skip-worktree`.

So: **yes, add `/AGENTS.md` — but do it together with untracking the file, preferably in its own PR.**

## Prompt:
8/27/2026, 3:34:45 PM

k which issue we doing next?

## Response:
8/27/2026, 3:34:48 PM

Do **#267 - Implement authorised event correction with automatic statistic refresh** next.

That should stay your priority because it directly satisfies the project’s core Basic-tier requirement that correcting an event must automatically bring all derived statistics back into line, without manual re-entry. `sport_analytics (1).pdf` It also contributes strongly to Sprint 2’s **Core Features (25%)** and **API (15%)** marks. `project_briefs (4).pdf`

Your branch is already correct:

```bash
feat/267-event-correction-stat-refresh
```

So the next action is just to start #267 implementation.

After #267, I’d do:

1. **#265 - JSON/CSV file-upload submissions**
2. **#256 - rejected/revoked submitter re-request flow**

If you paste the full description and acceptance criteria for **#267**, I can turn it into a tight Codex implementation prompt and a test checklist.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)