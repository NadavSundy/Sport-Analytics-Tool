# Repository structure

## Design decision

Use an npm-workspace monorepo with separate deployable frontend and backend applications and a small shared contracts package.

```text
Sport-Analytics-Tool/
├── .gitea/
│   ├── ISSUE_TEMPLATE/
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows/ci.yml
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
│   └── frontend/
│       ├── public/
│       └── src/
│           ├── api/
│           ├── components/
│           ├── features/
│           ├── pages/
│           └── test/
├── packages/
│   └── contracts/
├── database/
│   ├── migrations/
│   ├── schema/
│   └── seeds/
├── docs/
├── evidence/
│   ├── ai/
│   ├── decisions/
│   ├── stakeholder-meetings/
│   ├── sprints/
│   ├── user-testing/
│   └── validation/
├── infra/
│   └── azure/
├── scripts/
├── tests/
│   ├── e2e/
│   ├── performance/
│   └── accessibility/
├── package.json
├── mkdocs.yml
└── README.md
```

## Boundary rules

1. `apps/frontend` may communicate with `apps/backend` only through the documented HTTP API.
2. `apps/frontend` must not query application tables through Supabase-generated endpoints.
3. `apps/backend` owns validation, authorisation, business rules, external integrations, and database access.
4. `packages/contracts` contains schemas and types only; it is not a third application or service.
5. Database migrations are team-controlled and versioned under `database/migrations`.
6. Cross-application end-to-end, performance, and accessibility tests live under `tests/`; unit and integration tests stay close to the application they test.
7. Evidence files are records, not marketing claims. Store only genuine meetings, results, decisions, and contributions.

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
