# Gitea issue export workflow

The repository includes a read-only utility that creates local project context for developers and
coding assistants. It indexes the checked-out repository and exports Gitea issues and comments to
Markdown, JSON and CSV. This adds tracker context to the source already available in the checkout
without making the Gitea web interface or an external AI service part of the development toolchain.

Gitea remains the source of truth. Every export is a point-in-time snapshot and should be refreshed
before it is used for planning, review or implementation decisions.

## Intended workflow

1. Create a personal Wits Gitea token with `read:issue` permission.
2. From a repository shell with Bash, `curl`, Git, `jq` and `mktemp`, run:

   ```bash
   bash scripts/gitea-export/export-issues.sh
   ```

3. Enter the token at the hidden prompt. The token is used only for API requests during that run.
4. Confirm that the reported issue count agrees with Gitea.
5. Inspect representative open, closed and multi-comment issues in `gitea-export/`.
6. Use the appropriate local format for searching, analysis or review.
7. Refresh the snapshot when current tracker information matters.

The repository file `scripts/gitea-export/README.md` documents prerequisites, all command-line and
environment options, the output schema, validation commands, security guidance and detailed
troubleshooting.

## Output model

The exporter produces coding-assistant entry points, repository file indexes, four combined issue
files and preserved per-issue API data:

- `ai-project-context.md` combines checkout identity, tracked paths and the readable issue export;
- `ai-project-context.json` provides the same project context in a structured form;
- `repository-files.json` and `repository-files.txt` index tracked files in the checkout;
- `all-issues.md` is the human-readable combined issue and comment export;
- `all-issues-detailed.json` contains export metadata plus structured issue/comment records;
- `issues-all.json` contains the complete current issue objects;
- `issues-all.csv` is a compact issue summary; and
- `issues/<number>/` retains the issue response, all comments and a combined record.

Repository issue listing, issue details and comments all use paginated Wits Gitea REST API requests.
Open and closed issues are requested. Pull Requests are excluded with both the API `type=issues`
filter and a payload-level check. Each detail response is fetched independently so descriptions and
current metadata are complete rather than inferred from a list or board view.

The script uses connection and request timeouts, validates HTTP results and JSON shapes, and names
the issue when a detail or comment export fails. It builds a private staging snapshot first. A failed
run removes incomplete data and retains the last complete export; a successful run safely replaces
the previous `gitea-export/` directory.

## Local-only data and token handling

`/gitea-export/` and the exporter's staging directories are root-anchored `.gitignore` entries.
Generated exports can contain internal project details and must not be committed. Verify this after
an export with:

```bash
git status --short --ignored gitea-export
```

The access token must be supplied at runtime. Prefer the exporter's hidden prompt. For automation,
inject `GITEA_TOKEN` through an approved secret store and process environment; never hard-code it,
print it, write it into an export, include it in shell history or commit it.

The token header is streamed to `curl` rather than exposed in its process arguments. The exporter
requires HTTPS for non-local API endpoints.

The utility performs GET requests only. It does not modify issues or upload generated content.

## Coding-assistant access

Codex, Claude Code and similar agents can inspect the source and documentation when launched inside
the repository. They do not automatically receive Gitea issue context. Once a developer has run the
exporter, `gitea-export/ai-project-context.md` bridges that gap without giving the agent a token.
Repository-level `AGENTS.md` and `CLAUDE.md` direct compatible tools to the generated entry point.

The authenticated export and the agent's use of its output are deliberately separate. An agent may
refresh the snapshot only when a user explicitly requests it and provides runtime authentication by
an approved secure mechanism. The token must never be copied into agent instructions, prompts,
evidence or generated output.

`gitea-export/ai-project-context.md` may also be supplied to a new authorised AI-assisted development
conversation when a combined view is required outside the checkout. This is a deliberate, manual
action, not a feature of the exporter. Before supplying it:

- confirm that the AI service and conversation are authorised for the repository's internal data;
- review and redact sensitive or irrelevant issue content;
- generate a fresh snapshot;
- state the snapshot timestamp so its limits are clear; and
- follow the repository's [AI usage policy](../ai/usage.md), including the task-level register and
  declaration requirements.

Do not treat an AI conversation's copy as live tracker state. Recheck decisions, assignments and
acceptance criteria in Gitea.

## Development and maintenance

The script lives in `scripts/gitea-export/` so it can be reviewed and versioned while all generated
data remains outside source control. Changes should preserve these invariants:

- no token in source, output or logs;
- no issue mutation or automatic AI upload;
- a coding-agent context entry point that contains no credential;
- repository checkout identity and a current tracked-file index;
- full pagination for issues and comments;
- a per-issue detail request and complete description;
- explicit Pull Request exclusion;
- non-zero exit and useful context for every failed export;
- valid combined and per-issue JSON;
- bounded API requests; and
- safe replacement without publishing a partial snapshot.

Before merging exporter changes, test a valid `read:issue` token, an invalid token and, if available,
an insufficiently scoped token. Compare the count with Gitea, inspect open and closed issues, inspect
an issue with several comments, parse every JSON file, review the CSV, rerun the export, and confirm
that Git ignores the output. Do not create implementation evidence until those checks have actually
been performed.

The current exclusions are intentional: Kanban layout and ordering, Git history, Pull Request
reviews, CI logs, automatic AI uploads and all Gitea write operations remain outside this utility's
scope.

## AI Declaration

The preceding document was planned and generated with the assistance of Codex[GPT-5].
