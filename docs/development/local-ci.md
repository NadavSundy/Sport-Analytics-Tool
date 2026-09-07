# Local CI validation

The repository provides optional local commands for reproducing the same
change-aware validation plan used by hosted Gitea CI.

Local CI is intended to give developers faster feedback before pushing.
It is **not required before a push**, and hosted Gitea CI remains the final
authoritative quality gate.

## Which command should I use?

For normal development:

```bash
npm run ci:local
```

This runs the relevant CI checks directly in your current environment.

For closer Linux/hosted-CI parity:

```bash
npm run ci:docker
```

This runs the same change-aware plan inside an isolated Ubuntu 24.04 Docker
environment.

### Recommended usage

| Situation                                          | Command                                             |
| -------------------------------------------------- | --------------------------------------------------- |
| Quick check before pushing                         | `npm run ci:local`                                  |
| Developing directly on Ubuntu/Linux                | `npm run ci:local`                                  |
| Windows/macOS and want higher hosted-CI confidence | `npm run ci:docker`                                 |
| Reproducing a Linux-specific hosted CI failure     | `npm run ci:docker`                                 |
| Do not want to run local CI                        | Push normally; hosted CI still validates the branch |

Neither command is mandatory.

## Change-aware behaviour

Both commands reuse the repository's existing CI change planner.

Only validation relevant to the current branch changes is selected.

For example:

- documentation-only changes can avoid application/database/browser suites;
- frontend implementation changes can select frontend and browser validation;
- backend implementation changes can select backend and database validation;
- CI infrastructure or dependency changes conservatively select full
  validation.

The local commands do not maintain a separate set of routing rules from hosted
CI.

## Native local CI

Run:

```bash
npm run ci:local
```

Native local CI:

1. compares the current branch with `origin/main`;
2. calculates the existing hosted CI change plan;
3. validates required repository structure;
4. runs CI-routing regression tests;
5. validates that `package.json` and `package-lock.json` are compatible;
6. installs `requirements-docs.txt` before a selected strict MkDocs build; and
7. runs only the checks selected by the change plan.

Native dependency validation uses:

```text
npm ci --dry-run --ignore-scripts --no-audit --no-fund
```

This catches lockfile drift without deleting or rebuilding the developer's
existing `node_modules`.

### Operating-system parity

Ubuntu/Linux provides the closest native match to the hosted Gitea environment.

Windows and macOS are still useful for fast feedback, but operating-system
differences can affect:

- filesystem behaviour;
- shell behaviour;
- native dependencies;
- executable permissions;
- platform-specific packages.

If a Windows/macOS native result is questionable, use:

```bash
npm run ci:docker
```

## Database validation

When database validation is selected, native local CI uses the repository's
disposable embedded PostgreSQL 16 runtime.

Docker is therefore **not required** for:

```bash
npm run ci:local
```

The database instance is isolated and temporary.

## Docker local CI

Run:

```bash
npm run ci:docker
```

Docker local CI provides closer parity with hosted CI by using:

- Ubuntu 24.04;
- Node.js 22;
- Playwright 1.62.1;
- an isolated Linux dependency installation;
- the same change-aware validation plan.

Docker must be running before this command is used.

The first run can take longer because the parity image and browser layers may
need to be downloaded and built. Later runs can reuse Docker's cached image
layers.

The host repository is copied into an isolated container workspace without
copying host `node_modules`.

Inside that workspace a real:

```text
npm ci
```

is performed, matching the clean dependency-install behaviour used by hosted
CI without modifying the developer's host installation.

## Optional pre-push hook

Developers who want local CI to run automatically before their own pushes can
opt in with:

```bash
npm run hooks:install
```

The hook runs:

```text
npm run ci:local
```

before a push is sent to Gitea.

If local CI fails, the push is stopped so the failure can be fixed before using
hosted CI capacity.

The hook is **optional** and is not installed automatically.

Developers who do not install it can continue to push normally.

To remove the hook:

```bash
npm run hooks:remove
```

To check whether the repository hook path is configured:

```bash
git config --local --get core.hooksPath
```

When installed, it should report:

```text
.githooks
```

## Troubleshooting

### Docker command cannot start

Confirm Docker Desktop or the Docker daemon is running:

```bash
docker info
```

If Docker is unavailable, use:

```bash
npm run ci:local
```

instead.

### Native CI passes but hosted CI fails

Operating-system differences can still occur.

Reproduce the branch in the Linux parity environment:

```bash
npm run ci:docker
```

Hosted Gitea CI remains the final source of truth.

### Lockfile validation fails

If local CI reports that `package.json` and `package-lock.json` are not in
sync, update the lockfile intentionally:

```bash
npm install
```

Review the resulting dependency changes before committing them.

Then rerun:

```bash
npm run ci:local
```

### Database validation fails

Native local CI uses disposable embedded PostgreSQL 16.

The developer does not need to manually start PostgreSQL or Docker for
`npm run ci:local`.

Review the first database error rather than starting an unrelated PostgreSQL
instance.

## Normal workflow

A developer can choose any of these workflows.

### Fast optional feedback

```text
make changes
    ↓
npm run ci:local
    ↓
git push
    ↓
hosted CI
```

### Higher Linux parity

```text
make changes
    ↓
npm run ci:docker
    ↓
git push
    ↓
hosted CI
```

### No local CI

```text
make changes
    ↓
git push
    ↓
hosted CI
```

All three workflows are supported.

Local CI exists to reduce avoidable hosted-CI feedback cycles, not to introduce
a new mandatory development gate.

## AI declaration

This document was created with assistance from
ChatGPT-Web[GPT-5.6 Sol].

AI assistance was used to help structure the local CI workflow guidance,
Docker/native parity explanation, optional pre-push usage and troubleshooting
steps. The documented commands and behaviour were reviewed and verified against
the repository implementation by the student.

The automatic MkDocs dependency-installation behaviour was updated with the
assistance of Codex[GPT-5].
