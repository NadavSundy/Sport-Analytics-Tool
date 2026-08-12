# AI evidence

This directory contains the evidence needed to trace material AI assistance used
for project planning, documentation, coding, configuration, debugging, and
review. Evidence records how AI was used; it does not transfer responsibility
for the resulting work away from the team.

## Directory structure

```text
evidence/ai/
├── README.md
├── ai-usage-register.csv
├── registers/
└── transcripts/
    ├── README.md
    ├── ben-swartz/
    ├── dean-feldman/
    ├── gabriel-raz/
    ├── liora-rosenberg/
    ├── nadav-sundy/
    └── shayna-unterslak/
```

Current task-level AI usage is recorded in each team member's CSV under
`evidence/ai/registers/`. The earlier shared `evidence/ai/ai-usage-register.csv` is retained while
entries are migrated. Individual transcript files are stored in the relevant team member's
lowercase kebab-case folder under `evidence/ai/transcripts/`.

## Transcript naming convention

Use this format for work associated with one issue:

```text
YYYY-MM-DD-issue-<number>-<short-description>.<extension>
```

For example:

```text
evidence/ai/transcripts/dean-feldman/2026-08-06-issue-10-ci-debugging.md
```

Use a concise lowercase kebab-case description. Retain the original export
format, such as Markdown or PDF, when practical.

If one continuous transcript covers several tasks, store it once and use an
inclusive date range:

```text
YYYY-MM-DD-to-YYYY-MM-DD-continuous-project-session.<extension>
```

A single-day continuous record may use:

```text
YYYY-MM-DD-continuous-project-session.<extension>
```

Each related register row must reference the same transcript path and identify
the relevant page range, timestamps, headings, or other portion of the file.
This avoids duplicating the transcript while keeping every issue traceable.

## Linking evidence

Each register entry must include, where available:

- the repository-relative transcript path and the relevant portion of the file;
- the issue number;
- the Pull Request number; and
- the commit hash or hashes that contain the AI-assisted output.

Issues and Pull Requests should link back to the corresponding register entry
and transcript path. Do not invent links or transcript filenames when evidence
has not yet been imported; mark the missing reference as pending and resolve it
before merge.

AI-assisted commits must use the repository's normal issue reference and an
`Assisted-by` trailer naming the actual tool and model, for example:

```text
Refs #<issue-number>
Assisted-by: Codex[GPT-5.6 Sol]
```

Use a separate trailer for each materially involved tool. After committing,
add the resulting commit hash to the related register entry.

## Review and verification

AI output must be understood, reviewed, tested, and adapted as necessary by a
team member before it is accepted or merged. Record the checks performed and
do not describe verification as complete while it is still pending. Normal
Pull Request review requirements continue to apply.

## Privacy, security, and redactions

Inspect every transcript before committing it. Never commit passwords, API
tokens, authentication cookies, private keys, database credentials,
credential-bearing private links, confidential stakeholder information, or
unnecessary personal information.

Keep transcripts unedited where practical. If content must be removed, replace
it with a visible marker such as `[REDACTED: API token]` and add a brief note in
the transcript explaining what category of information was removed and why.
Never include the removed value in Git history or in the explanation.

The preceding document was planned, generated, reviewed and edited with the assistance of Codex[GPT-5.6 Sol].
