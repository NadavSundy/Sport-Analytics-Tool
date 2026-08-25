# Dependencies

The complete selected technology and direct-dependency inventory is maintained in [Technology Stack](technology-stack.md). This page records the policy for adding, installing and reviewing dependencies.

## Selection principles

A dependency must have:

- a clear project purpose;
- acceptable licensing for the project;
- active maintenance/security support appropriate to its role;
- a cost/risk lower than implementing and maintaining the capability safely within the team; and
- documentation explaining why it exists.

Major framework, hosting, authentication, database or architecture changes require a Gitea issue and an ADR where the decision materially affects the system.

## Authoritative version records

- Workspace `package.json` files define the team's **direct** JavaScript dependencies and accepted version ranges.
- The committed `package-lock.json` defines the exact resolved dependency graph used by `npm ci`.
- `requirements-docs.txt` defines the Python documentation dependency range.
- The technology-stack document records the purpose and motivation of the selected direct packages and services.

For clean-clone validation and CI-equivalent installation, use:

```bash
npm ci
```

Do not regenerate the lock file casually during unrelated work.

## Monorepo maintenance checks

Knip and syncpack cover two dependency risks that normal builds, tests and lint rules do not make
obvious:

- Knip detects unused files, dependencies, exports and types across the root package and npm
  workspaces.
- syncpack detects dependency-version drift across the root, frontend, backend and shared-contract
  package manifests.

Run both checks before opening a Pull Request:

```bash
npm run hygiene
```

They can also be run independently while reviewing a finding:

```bash
npm run hygiene:knip
npm run hygiene:dependencies
```

syncpack discovers the current `apps/*` and `packages/*` manifests from the root npm workspace
configuration. `.syncpackrc.json` records the configuration schema, while `syncpack lint` applies
its default single-version policy, including exact matches for local workspace packages.

`knip.json` adds only two root-workspace exceptions to automatic discovery: the backend-artifact
smoke checker is an entry point executed directly by the deployment workflow, and Wrangler is kept
as a dependency because the documented Cloudflare Pages deployment command invokes its CLI. These
narrow settings must not be replaced with broad file or dependency ignores to silence new findings.

## Direct dependency review

Before each milestone:

- inspect direct dependencies for continued use;
- run `npm run hygiene` and review every reported file, dependency, export or version mismatch;
- review vulnerability findings according to actual dependency path and exploitability;
- remove unused packages;
- document newly added third-party libraries, services and copied/adapted code;
- verify licence/attribution requirements;
- record significant decisions in an ADR; and
- rerun applicable checks after upgrades.

Do not run `npm audit fix --force` without reviewing the proposed breaking changes.

## TypeScript compatibility

TypeScript is pinned to `5.5.4` because the selected `@typescript-eslint` line supports TypeScript versions below `5.6.0`. TypeScript and `@typescript-eslint` must be reviewed together when upgraded.

## Transitive dependencies

A package appearing only in `package-lock.json` or `node_modules` is not automatically a technology deliberately selected by the team. Transitive packages are still part of the software supply chain and must be considered during security/licence review, but they should not be misrepresented as architecture choices.

For example, a Cloudflare-related transitive package pulled in by another dependency does not mean the project selected that package as its PostgreSQL architecture. Direct selections are established by the workspace manifests and repository configuration.

## Copied or adapted third-party code

If a team member copies or substantially adapts code, a template or a snippet from outside the repository, record:

- source/author or project;
- URL or other source identifier;
- licence where applicable;
- what was copied/adapted;
- where it appears in the repository; and
- why reuse was appropriate.

Normal use of an installed npm package is documented through the dependency and technology records rather than as copied source code.

## AI Declaration

The preceding document was reviewed and expanded with the assistance of ChatGPT-Web[GPT-5.6 Sol].
