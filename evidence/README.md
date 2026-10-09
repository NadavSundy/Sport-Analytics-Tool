# Project evidence

Store genuine project evidence here so claims in documentation, issues and milestone reviews can be
traced to retained records. Evidence is the source record; the public documentation site provides
human-friendly indexes and explanations without rewriting the evidence itself.

| Directory               | Purpose                                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| `sprints/`              | Sprint planning, stand-ups, stakeholder records, close-outs and retained Teams meeting transcripts |
| `decisions/`            | Architecture Decision Records and other project-level decisions                                    |
| `user-testing/`         | Consent-aware session material, findings, evaluation and retest evidence                           |
| `validation/`           | Sanitised command/result evidence and issue-specific verification records                          |
| `acceptance/`           | Integrated acceptance records that do not fit a narrower validation directory                      |
| `ai/`                   | AI usage registers and per-team-member AI interaction transcripts                                  |
| `stakeholder-meetings/` | Feature- or milestone-scoped stakeholder demonstrations and the disposition of each feedback item  |
| `design/`               | Superseded design artefacts kept for traceability, e.g. `design/legacy-wireframes/` (historical)   |

## Evidence integrity

- Do not invent meetings, attendance, decisions, results, feedback or contributions.
- Preserve authoritative source records rather than rewriting them for presentation.
- Use ISO dates in new filenames where practical and link relevant Gitea issues/Pull Requests.
- Do not commit secrets, credentials, private environment values or unnecessary personal data.
- Keep machine-readable evidence in its useful native format.

## Microsoft Teams transcript presentation copies

Sprint meeting transcripts retained as Microsoft Word documents remain authoritative `.docx` source
evidence. A same-name `.pdf` may be stored beside a Word transcript to make it easier to preview in a
browser. The PDF is a presentation copy only and must faithfully render the Word source rather than
summarising, correcting or rewriting it.

Other evidence is **not** mass-converted to PDF. Markdown, CSV, JSON, text, images and existing PDFs
remain in their current formats unless a separate requirement justifies a change.

Temporary Microsoft Word lock files matching `~$*.docx` are not evidence and should not be committed.

## Public discovery

The public documentation indexes evidence through
[Project Process & Evidence](https://sports-analytics-tool.pages.dev/process/). Sprint meeting
transcripts are indexed separately from AI interaction transcripts so the two evidence streams are
not confused.

## AI Declaration

The evidence-directory description, format-preservation rules and Teams transcript presentation-copy
policy were reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
The `stakeholder-meetings/` row was added with the assistance of
Claude-Code[Claude Opus 5 (1M context)] under issue #817.
The `design/` row was added with the assistance of Claude-Web[Claude Opus 5.5] under issue #894.
