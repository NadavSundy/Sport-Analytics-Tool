# Contributing

All contributions must follow [`docs/git-methodology.md`](docs/git-methodology.md) and [`docs/project_methodology.md`](docs/project_methodology.md).

## Required workflow

1. Create or select a Gitea issue with acceptance criteria.
2. Update local `main` and create a correctly named branch.
3. Make small, meaningful commits that reference the issue.
4. Add tests and documentation with the implementation.
5. Run `npm run hygiene` and `npm run check` before opening a Pull Request.
6. Request review from another team member.
7. Merge only after acceptance criteria and required checks pass.

## Definition of done reminder

Work is not done until the acceptance criteria are met, tests pass, the code is reviewed, CI passes, relevant documentation is updated, and accessibility, security, responsiveness, error handling, and deployment impact have been considered.

## AI-assisted work

Where AI generated or substantially changed code, add an `Assisted-by` trailer to the commit message and update `evidence/ai/ai-usage-register.csv`.
