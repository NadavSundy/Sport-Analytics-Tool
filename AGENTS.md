# AI coding-agent guidance

Work from the repository root and read `README.md`, `CONTRIBUTING.md` and the relevant files under
`docs/` before making broad changes.

If `gitea-export/ai-project-context.md` exists, read it when issue-tracker or project-planning context
is relevant. It combines a tracked-file index with a point-in-time Gitea issue and comment snapshot.
The live checkout remains authoritative for code, and Gitea remains authoritative for tracker state.

The `gitea-export/` directory is generated, may contain internal information and must remain
uncommitted. Do not request, expose, record or commit a Gitea token. Run the authenticated exporter
only when the user explicitly requests a refresh and has arranged secure runtime authentication.
