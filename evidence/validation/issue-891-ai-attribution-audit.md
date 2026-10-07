# Issue #891 â€” AI declaration and repository attribution audit

## Scope

This audit was performed against the current `main` state visible in the read-only GitHub mirror at commit
`ab216b9870704211260ff1696e949a6aa64ffa12`. The Gitea repository remains the authoritative source.

The audit covers:

- all 99 Markdown pages exposed through `mkdocs.yml`;
- the root `README.md` AI usage declaration;
- AI register and transcript discoverability;
- the visible `main` commit history (2,060 commits); and
- explicit historical AI-attribution format outliers.

This is a readiness/compliance review. It does not rewrite historical usage or infer AI use where the
repository evidence does not establish it.

## Policy criteria used

The course policy requires AI attribution to identify the tool, model and purpose. Marker-facing writing
must carry either a usage declaration or an explicit non-usage declaration. AI-assisted code generation
must use an `Assisted-by: <tool>[<model>]` commit trailer. Repository-level code-generation,
inline-editing/autocomplete and code-review usage/non-usage must be declared in the README.

## Marker-facing documentation audit

All 99 pages currently listed in `mkdocs.yml` were inspected for a declaration.

Result:

- 97 pages contain a usable declaration that identifies a tool/model pair or explicitly declares non-use.
- `docs/api/weather.md` has a purpose but currently says only `Claude Sonnet 5`; the tool is missing and
  the tool/model format is ambiguous.
- `docs/deployment/hosting-capacity-and-recovery-strategy.md` names only `Claude (Anthropic)`; the model
  is missing.

Both declaration gaps have truthful supporting register evidence and are corrected by the Issue #891
patch:

- `docs/api/weather.md`: `ChatGPT-Web[GPT-5.5]`, `Claude-Web[Claude Sonnet 5]`,
  `Claude.ai[Claude Sonnet 5]` and `Codex[GPT-5]`.
- `docs/deployment/hosting-capacity-and-recovery-strategy.md`:
  `Claude.ai[Claude Sonnet 5]`.

No non-use declaration was invented for a document whose history is unknown.

### Non-marker-facing files

A separate spot check found small/internal Markdown files without declarations, including
`apps/frontend/public/README.md`, `apps/frontend/src/components/README.md`,
`database/schema/event-model.md`, `infra/azure/infrustructure.md`,
`tests/accessibility/README.md`, and `tests/performance/README.md`.

These files are not in the current MkDocs navigation. They are intentionally not given fabricated
non-use declarations in this audit. If the team intends to submit or surface any of them directly to
markers, their authors should reconcile the file history/register evidence first and then add a truthful
usage or non-usage declaration.

## Root README audit

The current README correctly states that inline editing/autocomplete is not a repository workflow, and
no current per-member register entry was found for inline/autocomplete use.

The existing code-generation and code-review lists are incomplete relative to the per-member registers.
The Issue #891 patch replaces the lists with a reconciled repository-level declaration and links both
the per-member registers and transcript index directly.

Historical tool-name spelling varies (`ChatGPT Web`/`ChatGPT-Web`, `Claude Web`/`Claude-Web`,
`Claude.ai`, etc.). The README uses normalized labels while the task-level CSVs remain the authoritative
record of the exact spelling used at the time.

## AI evidence discoverability

The evidence path is discoverable through:

- `evidence/ai/README.md`;
- `evidence/ai/registers/README.md` and the six per-member CSV registers;
- `evidence/ai/transcripts/README.md` and the six per-member transcript folders; and
- `docs/process/ai-use-evidence.md`.

The Issue #891 patch also makes the root README link directly to both the register and transcript
directories.

## Commit attribution audit

The authoritative Gitea `main` history at `ab216b98` contains 2,060 commits. A strict
message scan found:

- 1,015 commits with a line matching `Assisted-by: <tool>[<model>]`;
- 68 additional commits whose messages explicitly mention an AI tool/model or AI assistance
  but do not contain that exact trailer form; and
- 18 commits containing `Assisted-by:` text that is malformed under the strict trailer
  pattern.

This produces 86 candidate attribution outliers. The local file-level classifier identified
44 of those candidates as touching code, configuration or tests.

These counts are **not** a compliance percentage and the 86 candidates are **not**
automatically policy violations. Many commits were not AI-assisted, while some candidate
commits are documentation, evidence or merge commits for which the code-generation trailer
requirement may not apply. Historical candidates must be reconciled against the task-level
AI registers and supporting transcripts before any conclusion is recorded.

A file-level review identified at least the following code/configuration/test commits among the strict
format outliers:

| Commit       | Subject / reason it needs follow-up                                                                  |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| `702f422ce2` | COR-01 package includes `validate.js`; uses Claude `Co-Authored-By` rather than `Assisted-by`        |
| `ea422f777d` | COR-01 package adds `validate.js`; uses Claude `Co-Authored-By` rather than `Assisted-by`            |
| `d4fad44613` | modifies frontend API/OpenAPI; message says `Assisted by Claude Sonnet 5`                            |
| `04bac9ad16` | pagination implementation; message says `Assisted by Claude Sonnet 5`                                |
| `ef6c74b54e` | Cloudflare migration changes workflows/scripts/tests; message says `Assisted by Claude Sonnet 5`     |
| `c69d97359e` | backend code change; message says `Assisted by Claude Sonnet 5`                                      |
| `ba656ec99c` | backend/contracts/test implementation; message says `Assisted by Claude Sonnet 5`                    |
| `7efd8c3c53` | CI configuration; trailer is indented rather than a normal trailer line                              |
| `f23add1d9c` | CI configuration; trailer is indented rather than a normal trailer line                              |
| `7797d69d0a` | worker source change; only `Claude Sonnet 5` is named                                                |
| `5702402bf0` | worker implementation; message says `Assisted by Claude Sonnet 5`                                    |
| `7aa9f6318e` | worker test code; message says `Assisted by Claude Sonnet 5`                                         |
| `c6d0b99ab7` | frontend implementation/tests; message says `Assisted by Claude Sonnet 5`                            |
| `7bb76004d1` | backend database test formatting; message says `assisted by ChapGPT-5.6 Luna`                        |
| `23477428a1` | fixture-weather/geocoding implementation/tests; message says `Assisted by Claude Sonnet 5`           |
| `5082dc4937` | submission upload code; message says `Assisted by ChatGPT Web, GPT -5.6 Luna`                        |
| `2f0fffc3cb` | upload-limit implementation/tests; message says `assisted by ChatGPT Web, GPT -5.6 Luna`             |
| `0e843a8dc2` | source/test formatting change; message says `Assisted by Claude sonnet 5`                            |
| `2cf91e4776` | CSV parser implementation/tests; message says `Assisted by Claude Sonnet 5`                          |
| `d8ac9f05bc` | admin frontend implementation; `Codex[GPT-5.6 Sol]` is broken across a newline                       |
| `ea843f591b` | CI/dependency change; `Codex[GPT-5.6 Sol]` is broken across a newline                                |
| `202f463bf7` | deployment workflow formatting/docs; message uses prose `assisted by`                                |
| `ac3b6ba612` | MkDocs deployment workflow; message uses prose `Assisted by Claude Sonnet 5`                         |
| `eacc837e98` | Open-Meteo backend implementation/tests; message uses prose `Assisted by Claude Sonnet 5`            |
| `2fa3f72736` | weather implementation/tests; `Assisted-by: Claude Sonnet 5` omits the tool and bracketed model form |

Because Issue #891 explicitly avoids rewriting historical usage, these commits should **not** be
amended/rebased. Linked follow-up issue #905 will reconcile the historical candidates against the
task-level registers and transcripts, record confirmed exceptions without changing Git history, and
address future-facing validation for malformed attribution trailers.

Follow-up issue: **[#905](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/905)** - reconcile historical `Assisted-by` attribution exceptions without rewriting commit history.

The complete machine-readable candidate list is retained in
[`issue-891-commit-attribution-audit.csv`](issue-891-commit-attribution-audit.csv).

## Verification on the authoritative checkout

The audit was verified against the authoritative Gitea checkout with `origin/main` at
`ab216b98`.

Results:

- `npx prettier --check` on the changed Markdown files: passed.
- `python -m mkdocs build --strict`: passed.
- `npm run hygiene`: passed; Knip, dependency consistency and architecture checks reported no issues.
- `npm run check`: passed, including repository structure, formatting, linting, type checking,
  automated tests, OpenAPI linting and production builds.
- The history attribution audit identified 86 candidate outliers, including 44 that touch code,
  configuration or tests. The machine-readable results are retained in
  [`issue-891-commit-attribution-audit.csv`](issue-891-commit-attribution-audit.csv).
- Historical attribution candidates are tracked in Gitea issue #905 and are not rewritten by
  Issue #891.

## AI Declaration

The preceding audit record was planned and generated with the assistance of
ChatGPT-Web[GPT-5.6 Sol].
