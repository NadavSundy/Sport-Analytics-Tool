# Repository restructuring migration guide

## What was found

The uploaded `main` branch contained four files:

```text
.gitignore
docs/git-methodology.md
docs/project_methodology.md
README.md
```

## Preservation

- `.gitignore` remains at the repository root unchanged.
- `docs/git-methodology.md` remains in place unchanged.
- `docs/project_methodology.md` remains in place unchanged.
- `README.md` remains at the root but has been expanded for setup, structure, boundaries, and the required AI code-generation declaration.

## Added structure

- `apps/frontend`: React/Vite application scaffold.
- `apps/backend`: Node/Express hand-written API scaffold.
- `packages/contracts`: shared validation/type package, not a deployable service.
- `database`: migrations, seeds, and schema documentation.
- `docs`: MkDocs public documentation source around the existing methodology documents.
- `evidence`: real project evidence and AI-use register.
- `.gitea`: issue, Pull Request, and CI templates.
- `infra/azure`: deployment investigation and prototype checklist.
- `tests`: cross-application test areas.

## Apply to the existing clone

Create a branch before copying these files into the repository:

```bash
git switch main
git pull origin main
git switch -c chore/<issue-number>-create-project-structure
```

Copy the contents of this archive into the repository root, then run:

```bash
npm install
npm run check
git status
```

Review every generated file, correct any team-specific decisions, and commit `package-lock.json` after the verified installation.

Suggested commit:

```text
chore(repo): establish application and documentation structure

Add separate frontend and backend applications, shared contracts, database,
public documentation, CI, test areas, deployment planning, and evidence folders.

Refs #<issue-number>
Assisted-by: ChatGPT-Web[GPT-5.6 Thinking]
```

## Do not claim completion

This archive provides foundation structure and minimal health checks. It does not complete authentication, event schemas, submissions, derived statistics, public datasets, external API integration, deployment, user testing, or advanced-tier analytics.
