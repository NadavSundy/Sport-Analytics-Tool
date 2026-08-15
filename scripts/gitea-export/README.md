# Gitea issue exporter

`export-issues.sh` creates a local, point-in-time project-context snapshot for coding assistants and
developers. It indexes the current Git checkout and exports a Gitea repository's issues and comments.
It defaults to `git-push-pray/Sport-Analytics-Tool` on the Wits Gitea service.

The exporter reads data only. It does not modify Gitea, upload the export, inspect Pull Request
reviews, or store the access token.

## Prerequisites

The following commands must be available on `PATH`:

- Bash;
- `curl`;
- Git;
- `jq`; and
- `mktemp` (included in standard Unix environments and Git Bash).

On Windows, run the script from Git Bash. Install `jq` separately if it is not already available.
Confirm the prerequisites before starting:

```bash
bash --version
curl --version
git --version
jq --version
mktemp --version
```

## Token requirement

Create a personal access token in the Wits Gitea user settings with `read:issue` permission. Use a
token belonging to an account that can read the repository. The exporter cannot broaden the
account's existing access.

The recommended approach is to leave `GITEA_TOKEN` unset. The script then requests it with a hidden
interactive prompt:

```bash
bash scripts/gitea-export/export-issues.sh
```

For automation, provide the token through the process environment rather than a command-line
argument:

```bash
GITEA_TOKEN="$TOKEN_FROM_SECRET_STORE" \
  bash scripts/gitea-export/export-issues.sh
```

Do not paste a literal token into a command that will be retained in shell history.

## Usage

Run the exporter from anywhere inside the repository. Its paths are resolved from the script's own
location:

```bash
bash scripts/gitea-export/export-issues.sh
```

To export a different repository from the same Gitea service:

```bash
bash scripts/gitea-export/export-issues.sh \
  --owner another-owner \
  --repo another-repository
```

To use another Gitea instance:

```bash
bash scripts/gitea-export/export-issues.sh \
  --api-url https://gitea.example.org/api/v1 \
  --owner example-owner \
  --repo example-repository
```

The same values can be set with `GITEA_API_URL`, `GITEA_OWNER` and `GITEA_REPO`. Per-request
timeouts default to a 10-second connection timeout and a 60-second total timeout. Override them
with positive whole numbers in `GITEA_CONNECT_TIMEOUT` and `GITEA_MAX_TIME` when necessary.

Run `bash scripts/gitea-export/export-issues.sh --help` for the concise command reference.

## Generated files

A successful run replaces `gitea-export/` with:

```text
gitea-export/
├── ai-project-context.md
├── ai-project-context.json
├── all-issues.md
├── all-issues-detailed.json
├── issues-all.json
├── issues-all.csv
├── repository-files.json
├── repository-files.txt
└── issues/
    └── <issue-number>/
        ├── issue.json
        ├── comments.json
        └── complete.json
```

The files serve different uses:

| File                            | Contents                                                              |
| ------------------------------- | --------------------------------------------------------------------- |
| `ai-project-context.md`         | Agent entry point with checkout facts, a file index and all issues.   |
| `ai-project-context.json`       | Structured checkout, tracked-file and issue-tracker context.          |
| `all-issues.md`                 | Every issue description and comment in a single readable document.    |
| `all-issues-detailed.json`      | Export metadata and combined issue/comment records.                   |
| `issues-all.json`               | An array containing each issue's complete current Gitea issue object. |
| `issues-all.csv`                | One summary row per issue, including its exported comment count.      |
| `repository-files.json`         | The current checkout's tracked paths as a JSON array.                 |
| `repository-files.txt`          | The same tracked paths as a searchable text list.                     |
| `issues/<number>/issue.json`    | The complete current issue response from the detail endpoint.         |
| `issues/<number>/comments.json` | All comments returned across every comments page.                     |
| `issues/<number>/complete.json` | The issue object and its comments in one record.                      |

The repository portion records the current branch, commit, dirty/clean state and tracked paths. It
does not duplicate source contents because a coding assistant operating in the checkout can read
those files directly. The script requests both open and closed issues, asks Gitea for issue records
rather than Pull Requests, and applies an additional Pull Request filter before export. Issue details
and comments are fetched separately so the output is not limited to summary fields from the
repository listing.

Data is first assembled and validated in a gitignored staging directory. If any request or JSON
operation fails, the run exits non-zero, reports the affected operation, deletes the incomplete
staging data and leaves the previous completed snapshot untouched. Only a fully successful snapshot
replaces `gitea-export/`.

## Validate an export

Compare the final issue count with Gitea and inspect open, closed and multi-comment issues. Useful
local checks include:

```bash
jq -e '.issue_count == (.issues | length)' gitea-export/all-issues-detailed.json
jq -e '.repository.tracked_file_count == (.repository.tracked_files | length)' \
  gitea-export/ai-project-context.json
jq -e 'type == "array"' gitea-export/issues-all.json
jq -e 'type == "array"' gitea-export/issues/135/comments.json
git status --short --ignored gitea-export
```

Run the exporter twice and confirm the second snapshot contains no files left over from the first.
Also test with an invalid token and, where available, an account whose token lacks `read:issue`.
Those runs must fail without replacing a valid earlier snapshot.

## Security

- Never commit a token, place one in a repository file, or pass one as a command-line option.
- The script does not print the token or include it in generated files.
- The authorization header is streamed to `curl` instead of appearing in its process arguments.
- Non-local API URLs must use HTTPS.
- `gitea-export/` and the temporary snapshot directory are ignored at the repository root.
- Exports may contain internal issue descriptions, user details and comments. Store, copy and share
  them under the same controls as the source repository.
- Generated issue data must not be committed, even when a particular snapshot appears harmless.

## Coding-assistant access

Codex, Claude Code and similar coding agents already read source files when they operate inside a
repository checkout. Gitea issue data is not part of that checkout. After a developer runs the
exporter, `gitea-export/ai-project-context.md` provides those agents with a discoverable entry point
that combines checkout identity, a tracked-file index and the full exported issue context. Root
`AGENTS.md` and `CLAUDE.md` direct compatible agents to that file when it exists.

This design does not give an agent a Gitea token or silently grant remote access. The authenticated
step remains under the developer's control, and the agent reads only the resulting local snapshot.
When current tracker context is relevant to an authorised external AI conversation that is not
running in the checkout, the Markdown context file may instead be supplied manually. Review it
first, remove information that should not be disclosed to that service, and follow the project's AI
policy. The exporter never uploads repository or issue data automatically.

The export is only a snapshot. It may be stale immediately after generation; Gitea remains the
source of truth for issue state, assignments, descriptions and comments.

## Limitations

The utility does not export Kanban layout or card ordering, Git history, Pull Request reviews, CI
logs, attachments as separate files, or issue change history. Markdown content is preserved as
returned by Gitea, but externally hosted images and links are not downloaded.

## Troubleshooting

### A required command was not found

Install the named dependency and confirm it is on `PATH`. Windows users should use Git Bash rather
than PowerShell to execute the Bash script.

### HTTP 401

The token is missing, invalid or expired. Create or supply a valid personal access token.

### HTTP 403

The account cannot read the repository or the token lacks `read:issue` permission. Correct the
repository access or token scope; do not use a broader token than necessary.

### HTTP 404

Check the API root, owner and repository spelling. The API root must include `/api/v1`.

### A request times out

Confirm that the Wits Gitea service and network are reachable. If the repository legitimately needs
more than 60 seconds for one response, increase `GITEA_MAX_TIME` for that run.

### The issue count differs from the web interface

Confirm that the comparison includes open and closed issues but excludes Pull Requests. Verify that
the token's account can see the same repository content, then rerun to produce a fresh snapshot.

## Maintenance

Keep the default API URL and repository identifiers aligned with the canonical project location.
When upgrading Gitea, verify the issue and comment endpoint response shapes, pagination parameters,
token scope name and Pull Request marker against the deployed API version. Re-run the validation
steps after changes to either the script or Gitea.

## AI Declaration

The preceding document and exporter were planned and generated with the assistance of
Codex[GPT-5].
