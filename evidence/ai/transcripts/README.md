# AI transcripts

This directory stores AI transcripts as supporting evidence for entries in
`evidence/ai/ai-usage-register.csv`. Store each transcript in the folder of the
team member who used the AI tool.

## Team member folders

| Team member      | Folder              |
| ---------------- | ------------------- |
| Ben Swartz       | `ben-swartz/`       |
| Dean Feldman     | `dean-feldman/`     |
| Gabriel Raz      | `gabriel-raz/`      |
| Liora Rosenberg  | `liora-rosenberg/`  |
| Nadav Sundy      | `nadav-sundy/`      |
| Shayna Unterslak | `shayna-unterslak/` |

Folder names use lowercase kebab-case. The naming, linking, verification, and
redaction process is documented in `evidence/ai/README.md`.

Before adding a transcript:

1. inspect it for credentials, confidential information, and unnecessary
   personal information;
2. visibly mark and explain any required redactions;
3. use the documented issue or continuous-session filename convention; and
4. add or update the corresponding register entry with the transcript path,
   relevant portion, issue, Pull Request, and commit references.

Example retained session record:

```text
evidence/ai/transcripts/dean-feldman/2026-08-06-continuous-project-session.md
```

The preceding document was planned, generated, reviewed and edited with the assistance of Codex[GPT-5.6 Sol].
