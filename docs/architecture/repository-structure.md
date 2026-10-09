# Repository structure

## Design decision

Use an npm-workspace monorepo with separately deployable frontend, backend and asynchronous worker
applications and three small shared packages: API contracts, server-side batch processing and an
object-storage interface.

```text
Sport-Analytics-Tool/
├── .gitea/
│   ├── ISSUE_TEMPLATE/
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows/          # ci.yml and deploy-{frontend,backend,worker,docs}.yml
├── .githooks/
│   └── pre-push            # optional local CI hook (npm run hooks:install)
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── middleware/
│   │   │   ├── modules/
│   │   │   ├── routes/
│   │   │   ├── app.ts
│   │   │   └── index.ts
│   │   └── tests/
│   ├── frontend/
│   │   ├── public/
│   │   └── src/
│   │       ├── api/
│   │       ├── components/
│   │       ├── features/
│   │       ├── pages/
│   │       └── test/
│   └── worker/
│       ├── src/
│       │   ├── batch-validation-job.ts
│       │   ├── batch-publication-job.ts
│       │   ├── dataset-release-job.ts
│       │   ├── outbox-relay.ts
│       │   └── index.ts
│       └── tests/
├── packages/
│   ├── contracts/
│   ├── batch-processing/
│   └── object-storage/
├── database/
│   ├── migrations/
│   ├── schema/
│   └── seeds/
├── docs/
├── evidence/
│   ├── acceptance/
│   ├── ai/
│   ├── decisions/
│   ├── design/
│   ├── stakeholder-meetings/
│   ├── sprints/
│   ├── user-testing/
│   └── validation/
├── infra/
│   └── azure/
│       ├── backend/
│       └── worker/
├── scripts/
├── testing/
│   └── user-testing/       # facilitated user-testing packs and session inputs
├── tests/
│   ├── accessibility/
│   ├── ci/
│   ├── deployment/         # deployment, workflow and documentation tests
│   ├── e2e/
│   └── performance/
├── compose.test.yml        # optional Docker PostgreSQL test database
├── mkdocs.yml
├── package.json
└── README.md
```

## Boundary rules

1. `apps/frontend` may communicate with `apps/backend` only through the documented HTTP API.
2. `apps/frontend` must not query application tables through Supabase-generated endpoints.
3. `apps/backend` owns validation, authorisation, business rules, external integrations, and database access.
4. `apps/worker` is a separate Node.js process boundary for durable asynchronous work. It has no
   browser or HTTP-backend dependency.
5. `packages/contracts` contains schemas and types only; it is not an application or service.
   `packages/batch-processing` and `packages/object-storage` hold server-side code shared by the
   backend and worker and must not import from `apps/`.
6. Database migrations are team-controlled and versioned under `database/migrations`.
7. Cross-application end-to-end, performance, and accessibility tests live under `tests/`; unit and integration tests stay close to the application they test.
8. Evidence files are records, not marketing claims. Store only genuine meetings, results, decisions, and contributions.

## Original files preserved

The uploaded repository contained the following files. They remain in their original locations:

- `.gitignore`
- `README.md` — expanded to describe the new scaffold and AI usage
- `docs/git-methodology.md` — preserved unchanged
- `docs/project_methodology.md` — preserved unchanged

## Consequences

The monorepo reduces setup overhead and supports coordinated changes. dependency-cruiser validates the source dependency graph through `npm run hygiene`, including circular dependencies and inappropriate frontend/backend imports. Pull Request review is still required for architectural concerns that static import analysis cannot detect. A shared repository does not make the application monolithic as long as the frontend and backend remain independent deployable applications with HTTP between them.

## AI Declaration

The validation-evidence directory was added to the documented repository tree with the assistance
of Codex[GPT-5.6 Sol].
The independently deployable worker boundary was added with the assistance of Codex[GPT-5].
The Issue #883 final repository-structure reconciliation was reviewed and edited with the
assistance of Codex[GPT-5].
The Issue #879 review corrected the tree connectors and added the shared packages, workflows,
Git hook, `testing/` and test directories with the assistance of Claude-Web[Claude Opus 5.5].
