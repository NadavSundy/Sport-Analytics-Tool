# Sprint 4 guided package starters - NOT READY TO UPLOAD

These are non-secret preparation files copied from the current contractVersion 1.0 JSON template. The competition, country, season, fixture date, teams and participants still contain template values. A schema-valid file is not proof of safe target resolution or deployed acceptance. Do not upload these starters to production or use fixture 5.

| File                           | Purpose                   | Deliberate difference                                     | Status                                              |
| ------------------------------ | ------------------------- | --------------------------------------------------------- | --------------------------------------------------- |
| S4-SINGLE-valid-DRAFT.json     | Starting shape for SUB-02 | Current single-fixture template unchanged                 | Target/scope/writable slots unresolved              |
| S4-SINGLE-invalid-DRAFT.json   | Starting shape for SUB-03 | Only contractVersion changed to unsupported `803-invalid` | Same unresolved target; expected contract rejection |
| S4-SINGLE-corrected-DRAFT.json | Starting shape for SUB-04 | Restores supported 1.0 version                            | Target and recovery/replay state unresolved         |

Absolute folder:

`C:\Uni\Semester_2\SDP\Project\Sport-Analytics-Tool\.worktrees\issue-803\testing\user-testing\sprint-4-inputs`

```powershell
ii 'C:\Uni\Semester_2\SDP\Project\Sport-Analytics-Tool\.worktrees\issue-803\testing\user-testing\sprint-4-inputs'
```

## Release gate before participant use

1. Obtain actual disposable competition, season, existing fixture and participant references, approved submitter scope and demonstrated reset method. Fill the valid draft using exact readable names/date/team context from that environment.
2. Give events and package chosen stable namespaced identities. Ensure fresh writable slots; do not confuse idempotent replay with a new successful write. Use a fresh disposable scenario for recovery if the first valid submission consumes the slots.
3. Derive invalid and corrected files from that environment-valid package so the invalid file has only one understood contract-version fault; corrected restores the version. If another error is chosen, replace this scenario intentionally and record its expected boundary.
4. Validate with the current contract and selected Single fixture path. Privately verify real reference resolution, valid receipt, invalid actionable rejection and corrected recovery on disposable data; reset/recreate before the participant's independent attempt.
5. Save released copies under `evidence/user-testing/sprint-4/supporting/S4-SINGLE-valid.json`, `S4-SINGLE-invalid.json`, `S4-SINGLE-corrected.json`. These paths are reserved instructions, not claims that released files exist yet.
6. Record actual absolute paths, SHA-256, build, expected results and reset in the scenario record. Send non-secret target metadata and verification results to Codex. Do not hand participants DRAFT files or use unsupported Advanced arrays for guided tasks.

For CSV/manifest scenarios, use the current `apps/frontend/public/season-upload-template.csv` and `season-upload-manifest-template.json` instead of historical direct wrappers. Baseline #803 uses JSON Single fixture; no optional workflow is added without a concrete reason.

## AI Declaration

This guide and draft variants were prepared with the assistance of Codex[GPT-6]. Target-specific preparation and facilitator verification remain pending.
