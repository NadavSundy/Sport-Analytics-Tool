# Issue #879: verify README, getting-started, documentation-site and technology-stack content

Session log, Friday 9 October 2026. Prepared with Claude Web (Claude Opus 5.5). This is a
structured record of the session prepared by the assistant at the author's request; it is not a
verbatim export of the chat.

---

## 1. Request

> Complete this issue on a separate branch. Give me a patch file with no commits as I need to git add
> and git commit locally to gitea. Remember Test driven development

**Issue summary (#879, opened by Shayna):** review the README, Getting Started / developer guides,
documentation site and technology stack against the final implementation (Sprint 1 Documentation
Site, Getting Started / Dev Guides and Tech Stack rubric items; Milestone 4 Tools). Acceptance
criteria: accurate README overview; setup that works from a clean checkout; clear prerequisites and
environment variables; understandable repository structure; current and motivated technology stack;
a prominent, working public documentation link; stale setup instructions and broken links fixed;
development and code-quality tools documented; findings corrected or opened as follow-up issues; AI
attribution retained. Depends on the final documentation restructuring (#878), which was confirmed
merged (#895, #897, #902, #910) before work began.

---

## 2. Investigation

| Step                                                              | Finding                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Read README, CONTRIBUTING, `CLAUDE.md`, root `package.json`       | README tree omitted `packages/batch-processing`, `packages/object-storage` and `testing/`, with misaligned columns; the overview did not mention the shipped natural-language query feature; the public docs link appeared only near the end of the README.                      |
| Compared README documentation paths with `mkdocs.yml` navigation | Three labels were stale ("Architecture & Data", "Deployment & Operations", "Project Process & Evidence"); Methodology and Final Submission were missing. `docs/index.md`, `docs/getting-started.md` and `docs/README.md` repeated the old labels.                                  |
| Scanned onboarding docs for relative links and `npm run` commands | All relative links resolved; every documented command exists in the root or the named workspace manifest.                                                                                                                                                                      |
| Compared each `.env.example` with the environment documentation   | `WORKER_HEALTH_INTERVAL_MS` and `WORKER_HEALTH_TIMEOUT_MS` were undocumented. The README and setup guide never created `apps/worker/.env`; the README said the local worker needs Service Bus, Blob and Azure identity, although it defaults to the local `database` transport. |
| Compared the technology stack with every workspace manifest       | Frontend uses `@supabase/auth-js`, not `supabase-js`; stale ranges for `@vitejs/plugin-react`, `tsx`, `@azure/storage-blob` and worker `pg`/Zod; shared server packages, Ajv, ajv-formats, Pino, Lighthouse, chrome-launcher and source-map were unrecorded.                  |
| Rendered tables                                                   | The Node.js row's `^20.19.0 \|\| >=22.12.0` split the row into extra columns.                                                                                                                                                                                                   |
| Inspected root files and scripts                                  | `FILE_TREE.txt` was an August snapshot; `knip`, `npm` and `sport-analytics-tool@0.1.0` were accidental empty files; `MIGRATION_GUIDE.md` read as current setup instructions; `test:e2e:api-explorer-live` targeted the retired App Service host.                               |
| Checked live URLs                                                 | Documentation site and frontend loaded; the coverage page existed. The backend health URL could not be fetched from the assistant's environment.                                                                                                                              |

---

## 3. Test-driven change

`tests/deployment/final-documentation-review.test.mjs` (21 tests, run by `npm run test:deployment`)
was written before any documentation change. 18 tests failed on `main` for the intended reasons; three
(links resolve, npm commands exist, AI attribution retained) passed and act as regression guards.
During the red phase the public-link test was tightened after it passed accidentally on the coverage
badge URL, and the tree test was corrected to accept `apps/…` entries for the `apps` directory.

| Area                     | Change                                                                                                                                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| README                   | Prominent documentation, application and setup links; updated overview; complete aligned tree; worker env file and local-worker guidance; tooling summary; documentation paths matching the navigation; AI declaration line. |
| Docs site pages          | Navigation labels corrected in `docs/index.md`, `docs/getting-started.md` and `docs/README.md`; shared-package guides added; `site_url` added to `mkdocs.yml`.                                                                |
| Setup guide              | Worker and shared-package rows, worker env file and run step, package build step, hygiene gate, corrected `npm run check` contents, local CI and Git hook.                                                                     |
| Technology stack         | Every direct dependency range reconciled; shared server packages section; testing and profiling tools added; local-CI row; repaired Node.js row.                                                                                |
| Environment / structure  | Worker health variables documented in `docs/deployment/azure-worker.md`; repository-structure tree corrected.                                                                                                                  |
| Stale material           | `FILE_TREE.txt` and three empty root files deleted; `MIGRATION_GUIDE.md` marked historical; API-explorer live script moved to the Container Apps host.                                                                         |
| AI evidence              | Register row added to `evidence/ai/registers/liora-rosenberg.csv`; this session record.                                                                                                                                         |

---

## 4. Corrections made during the session

- A statement that every application `dev` script builds the shared packages was corrected after
  checking the manifests: only the backend and worker do; the frontend does not.
- New tech-stack claims (Ajv formats, Pino in logging tests, `@supabase/auth-js`, the worker's use of
  contracts) and README claims (docs deployment on merge to `main`, internal-only worker ingress) were
  checked against the workflow files, Bicep and source before being kept.

---

## 5. Verification run by the assistant

- `npm ci` from a clean clone — succeeded.
- `node --test tests/deployment/final-documentation-review.test.mjs` — 21 passed.
- `npm run check` — passed, including 103 deployment tests and every workspace suite.
- `npm run hygiene`, `npm run structure:check`, `npm run format:check` — passed.
- `python -m mkdocs build --strict` — passed; the Node.js row renders with four columns and the
  canonical URL is `https://sports-analytics-tool.pages.dev/`.
- The patch was applied with `git apply --index` to a clean `main` (555e2cdf) and the new tests passed.
  No commits were made.

## 6. Limitations

- The backend health URL could not be fetched from the assistant's environment, and
  `npm run test:e2e:api-explorer-live` was not run against the Container Apps host.
- Deleting `FILE_TREE.txt` and the empty root files is a judgement the team may revert.
- A clean-clone run of the setup guide by a second team member and author review are still required.
