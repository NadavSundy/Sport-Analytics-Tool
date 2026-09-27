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

Where AI generated or substantially changed code, add an `Assisted-by` trailer to the commit message and update your own register at `evidence/ai/registers/<member>.csv`.

See [`evidence/ai/registers/README.md`](evidence/ai/registers/README.md) for the columns and the rules that apply to them. It also records why the single shared register at `evidence/ai/ai-usage-register.csv` is being retired: every member edited it, it conflicted on almost every merge, and it was corrupted three times. Entries remain in both files until every member has created their own, after which the shared register is removed. Add new entries to your own register, not to the shared one.
