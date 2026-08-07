# AI usage registers

Each team member records their AI usage in their own file under `registers/`.
The file is named to match the member''s transcript folder under `transcripts/`.

The single shared register at `ai-usage-register.csv` is being retired. It was
edited by all six members, conflicted on almost every merge, and was corrupted
three times. Entries remain in both files until every member has created their
own, after which the shared register is removed.

## Columns

| Column | Content |
|---|---|
| Date | The date the work was done, as `YYYY-MM-DD`. |
| Team member | The member who used the tool. |
| Tool | The tool used, for example `Claude Web` or `ChatGPT Web`. |
| Model | The model used, for example `Claude Opus 5` or `GPT-5.6 Thinking`. |
| Purpose | The kinds of use, separated by semicolons. |
| Brief task | What the work was, including the issue number where applicable. |
| Output used | What was produced and actually used. |
| Verification or adaptation | How the output was checked, tested or changed before use. |
| Related evidence | Transcript paths, issue numbers and Pull Requests. |

## Rules

Every field must be quoted, including the date. Fields contain commas and
semicolons, and an unquoted field containing a comma breaks the file for every
reader.

Every file must end with a trailing newline. A row appended to a file without one
is fused onto the row above it.

Use a semicolon, not a comma, to separate items within a field.

Only tools and models genuinely used may be listed. The register is a record of
what happened, not a declaration of what was permitted.

## Relationship to other attribution

This register does not replace the attribution the course AI policy requires
elsewhere. Commits containing AI-generated code carry an `Assisted-by` line,
documents carry an AI declaration, and the repository README declares the tools
in use.

## AI Declaration

The preceding document was generated with the assistance of Claude-Web[Claude Opus 5].
