# Issue #12 developer onboarding verification

This record captures clean-clone verification of the developer onboarding guide. Issue #12 must remain open until the documented setup has been independently followed and any discovered problems have been corrected.

## Guide under test

- `README.md`
- `docs/development/setup.md`
- `apps/frontend/README.md`
- `apps/backend/README.md`
- `database/README.md`
- `packages/contracts/README.md`
- `docs/README.md`
- `tests/README.md`
- `infra/README.md`
- `scripts/README.md`
- `evidence/README.md`
- `docs/environment.md`
- `docs/development/technology-stack.md`

## Author verification

**Verifier:** Pending
**Date:** Pending
**Commit tested:** Pending
**Operating system:** Pending
**Shell / terminal:** Pending
**Editor / IDE (if used):** Pending

### Tool versions

```text
Git: Pending
Node.js: Pending
npm: Pending
Python: Pending
```

### Clean-clone checklist

- [ ] Repository cloned into a new directory
- [ ] Issue #12 branch checked out
- [ ] `npm ci` completed successfully
- [ ] Backend `.env` created from `.env.example`
- [ ] Frontend `.env` created from `.env.example`
- [ ] Required environment values were understandable and obtainable
- [ ] Contracts build succeeded
- [ ] Backend start command worked
- [ ] Backend health endpoint responded
- [ ] Frontend start command worked
- [ ] Frontend loaded in the browser
- [ ] Database migration/seeding/testing guidance was understandable
- [ ] `npm run test:database:local` succeeded against the isolated Docker PostgreSQL database
- [ ] Testing, infrastructure, scripts and evidence entry-point READMEs matched the repository
- [ ] `npm run check` succeeded
- [ ] Python virtual environment/documentation dependencies installed
- [ ] `python -m mkdocs build --strict` succeeded
- [ ] No secret or generated file was accidentally staged

**Problems found:** Pending

**Corrections made:** Pending

**Result:** Pending

## Independent team-member verification

This section must be completed after the documentation is ready for review. The independent verifier should start from a genuinely clean clone rather than an existing working directory.

**Verifier:** Liora
**Date:** 2026-08-24
**Pull Request / commit tested:** Branch `docs/12-validate-developer-onboarding` (fresh clone from origin)
**Operating system:** Windows (host: BaristaBabes)
**Shell / terminal:** Windows PowerShell (5.x — `&&` operator not supported; commands run with `;` or on separate lines instead)
**Editor / IDE (if used):** Not recorded

### Tool versions

```text
Git: (as bundled with Windows install used for clone)
Node.js: v24.13.1
npm: 11.8.0
Python: 3.13.7
```

### Verification checklist

- [x] Clean clone succeeded
- [x] `npm ci` succeeded without modifying `package-lock.json` (549 packages installed)
- [x] Environment-file instructions were clear (`.env` copied from `.env.example` for both apps)
- [x] Backend setup/run instructions worked (`npm run dev:backend`, health endpoint reachable) — required manually running `npm run build --workspace=@sport-analytics/contracts` first; this step is not obvious from a first read of setup.md
- [x] Frontend setup/run instructions worked (`npm run dev:frontend`, served at localhost:5173)
- [x] Shared-contract instructions worked (`npm run build --workspace=@sport-analytics/contracts` succeeded)
- [ ] Database setup/migration/seeding/testing guidance was clear — not fully assessed; Docker-based workflow not exercised (see below)
- [ ] `npm run test:database:local` worked against the isolated Docker PostgreSQL database — **not verified**: Docker Desktop is not installed on this machine, so this step could not be run. `npm run test:database` (non-Docker variant) was attempted instead and correctly failed with a clear `DATABASE_URL_TEST is required` error, confirming the documented behaviour for that command.
- [x] Testing, infrastructure, scripts and evidence entry points were clear
- [x] Repository checks worked (`npm run check`: structure, format, lint, typecheck, unit/api/frontend/contracts tests, openapi lint, and build all passed)
- [x] Python virtual environment/documentation dependencies installed (`pip install -r requirements-docs.txt` clean)
- [x] MkDocs local/strict-build instructions worked (`python -m mkdocs build --strict`, 0 errors)
- [x] Common-problem guidance was sufficient for any issue encountered, with the exceptions noted below
- [x] Technology-stack documentation matched the repository observed by the verifier

**What was unclear or failed:**
1. Windows PowerShell 5.x does not support the `&&` operator used in some command examples; needed to substitute `;` or run commands on separate lines. Worth a Windows-specific callout in the docs.
2. `python3` is not a recognized command on this Windows machine; `python` is the correct invocation here. Docs should clarify this varies by platform.
3. Building `packages/contracts` before running `dev:backend`/`dev:frontend` is required on a fresh clone (no automatic postinstall/build step), or both dev servers fail with `Cannot find module '@sport-analytics/contracts/dist/index.js'`. This should be made more prominent/earlier in the getting-started flow rather than easy to miss.
4. `npm run test:database:local` requires Docker Desktop to be separately installed (not bundled with Node/npm); this is documented as a prerequisite, but running `docker info` without Docker installed gives a plain "not recognized" error rather than pointing back to the install instructions — a doc cross-reference here would help.
5. `.venv\Scripts\Activate.ps1` may need `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` first if PowerShell script execution is disabled by default; not currently documented for Windows users.

**Changes requested:**
- Make the "build contracts before running dev servers" step more prominent for first-time setup, not just present later in the doc.
- Add a short Windows-specific PowerShell note (`&&` unsupported in Windows PowerShell 5.x; `python3` vs `python`; execution-policy note for venv activation).
- Consider linking the Docker "not installed" failure mode back to install instructions.

**Retest after corrections:** Not yet performed — pending doc updates above.

**Final result:** Pass, with the Docker-based database workflow (`npm run test:database:local`) unverified due to Docker Desktop not being available on the verifier's machine. All other documented setup, run, and check commands succeeded from a genuinely clean clone.

## Evidence references

- Issue #12
- Draft/final Pull Request: Pending
- Independent verifier PR comment or review: Pending
- Relevant commits: Pending

## Appendix: AI-assisted automated smoke test

This section is supplementary evidence only. It does **not** satisfy the "second team
member follows the guide" acceptance criterion, which requires genuine human execution
per the AI Declaration below. It records an automated dry-run of the documented commands,
performed by Claude (Anthropic) in a sandboxed Linux container, to catch problems before
human verification.

**Environment:** Linux sandbox, Node.js v22.22.2, npm 10.9.7, Python 3.12.3

**Not tested:** Docker was unavailable in the sandbox, so `npm run test:database:local`
(the isolated Docker PostgreSQL integration test) was not exercised.

| Step | Result |
|---|---|
| `npm ci` | ✅ 556 packages, no lockfile drift |
| Backend/frontend `.env` from `.env.example` | ✅ instructions unambiguous |
| `npm run structure:check` | ✅ 30 required files |
| `npm run format:check` | ✅ |
| `npm run lint` (all workspaces) | ✅ |
| Contracts build | ✅ |
| `npm run typecheck` (all workspaces) | ✅ |
| `npm run test:unit` | ✅ 88/88 |
| `npm run test:frontend` | ✅ 97/97 |
| `npm run test:contracts` | ✅ 71/71 |
| `npm run test:deployment` | ✅ 4/4 |
| `npm run build` | ✅ |
| `npm run openapi:lint` | ✅ |
| `npm run dev:backend` → `/api/v1/health` | ✅ 200 OK |
| `npm run dev:frontend` → `localhost:5173` | ✅ 200 OK |
| Docs venv + `pip install -r requirements-docs.txt` | ✅ clean |
| `python -m mkdocs build --strict` | ✅ no warnings/errors |

**Observation:** `site/` (generated MkDocs output) is not currently listed in `.gitignore`,
though `docs/README.md` states it must not be committed — worth confirming this is intentional.

## AI Declaration

The verification template was generated with the assistance of ChatGPT-Web[GPT-5.6 Sol]. Verification outcomes must be entered from actual human execution and must not be generated or inferred by AI. The Appendix above was generated by Claude (Anthropic) and is explicitly labeled as an automated, non-human smoke test; it is supplementary evidence and does not satisfy the human verification requirement.
