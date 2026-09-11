# Frontend features

Organise user-facing functionality by feature rather than by technical file type. Current feature
directories include `auth`, `browse`, `home`, `statistics`, `submissions`, and `submitter-access`.
The home feature keeps the no-fetch landing-page narrative, static SVG fallback and lazy procedural
Three.js enhancement isolated from routing and general page components. The statistics feature
provides the reusable match-overview outcome, innings totals, player batting and
bowling figures, and accepted-event calculation traces. Player match-history cards reuse those
batting and bowling metric components without calculating aggregate player statistics, and the
player career totals section reuses them to present the career level of the participant aggregate
endpoint as published. The browse feature's section error boundary, introduced for match statistics,
is shared by those sections so a display failure stays inside the section that raised it. The
submitter-access feature provides persisted account status, request submission, stale-state refresh,
and user feedback. The submission feature provides the `submitter`/`admin` role gate, scoped fixture
selection, Basic delivery-event JSON editor, structured result display, and a permission-aware
correction form for events accepted in the current submission interaction. Corrections keep event
identity and occurrence order read-only, calculate event totals from editable delivery values, and
refresh the affected fixture statistics after success. Suggested future feature directories include
`datasets` and `api-consumers`.

## AI Declaration

The statistics and submission feature descriptions were updated with the assistance of
Codex[GPT-5.6 Sol]. The submitter-access feature description was updated with the assistance of
Codex[GPT-5].
The embedded match-overview description was updated with the assistance of Codex[GPT-5.6 Sol].
The reusable player-performance description was updated with the assistance of Codex[GPT-5.6 Sol].
The accepted-event correction feature description was updated with the assistance of
Codex[GPT-5.6 Sol].
The issue #314 home feature description was updated with the assistance of Codex[GPT-5.6 Sol].
The issue #476 career totals and shared section boundary description was updated with the assistance
of Claude Code[Claude Opus 5].
