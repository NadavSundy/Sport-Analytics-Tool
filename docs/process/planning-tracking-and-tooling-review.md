# Planning, Tracking, Bug and Tooling Evidence Review

| Review information | Details                                                                                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Related issue      | #880                                                                                                                                                                        |
| Review scope       | Initial planning; backlog evolution; Gitea work and bug tracking; development and quality tooling                                                                           |
| Evidence boundary  | Repository documentation and retained records available at the review cut-off. Gitea remains authoritative for live issue, board, milestone, Pull Request and review state. |

## Marker route

Start with the [Project Backlog and Milestone Plan](../planning/project-backlog.md), then use the routes below for the supporting record rather than treating a current issue list as a historical plan.

| Review question                          | Evidence route                                                                                                                                                                                                                                                                                       |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What was originally planned?             | [Sprint 1 planning record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/sprints/sprint-1/2026-08-06-planning.md){ target="_blank" rel="noopener" } and the preserved [project backlog](../planning/project-backlog.md)                                      |
| How did scope and priorities change?     | The backlog's [Sprint 3 refinement](../planning/project-backlog.md#sprint-3-refinement-at-sprint-2-close-out), [Final Submission refinement](../planning/project-backlog.md#sprint-4-refinement-30-september-2026), sprint traceability pages, and [Sprint Evidence](sprint-evidence.md)             |
| How was work tracked?                    | Gitea issues, milestones and Project board as described in the [backlog](../planning/project-backlog.md) and [Git methodology](../git-methodology.md); retained planning/close-out records provide the historical context                                                                            |
| How were defects tracked?                | [Bug Tracking](../testing/bug-tracking.md), its reusable issue template, and representative resolved defects in [Sprint 2 traceability](../planning/sprint-2-requirements-traceability.md#7-bug-tracker-and-representative-resolved-defects)                                                         |
| Which tools and checks were used?        | [Technology stack](../development/technology-stack.md), [CI/CD and quality gates](../development/ci-cd.md), repository scripts and workflow configuration                                                                                                                                            |
| How do requirements connect to evidence? | [Sprint 1](../planning/sprint-1-requirements-traceability.md), [Sprint 2](../planning/sprint-2-requirements-traceability.md), [Sprint 3](../planning/sprint-3-requirements-traceability.md), and [Final Requirements and Rubric Traceability](../planning/final-requirements-rubric-traceability.md) |

## Findings

### Historical planning and evolution

The original Sprint 1 roadmap is preserved as a historical baseline: it records the intended Basic vertical slice, future Sprint 2/Sprint 3 work and the original Final Submission backlog. Later sections do not rewrite those entries as completed. Instead, the backlog records the Sprint 2 close-out refinement that prioritised unresolved Basic/Intermediate work before selected Advanced work, and the 30 September Final Submission refinement that converted the final roadmap into actionable Gitea issues.

The project distinguishes the three formal Sprints from the Final Submission period. The latter is not represented as an additional formal Sprint; older `sprint-4` paths remain retained historical paths. [Sprint Evidence](sprint-evidence.md#final-submission-milestone-4) explains this terminology and links the active final-planning record.

Carry-forward work is explicit rather than silently removed. The Sprint 3 refinement names Sprint 2 carry-over and its acceptance gate; the Final Submission plan identifies release quality, defects, verification, documentation and bounded accepted enhancements. Current task status is intentionally not copied into this review because Gitea is the live authority.

### Work and defect tracking

The Project board is described as the active work-tracking surface with Backlog, Ready, In Progress, In Review, Blocked and Done states. The repository roadmap records planned work and historical decisions, while issues carry actionable acceptance criteria, ownership, dependencies and current status. This separation avoids presenting the static backlog as a live board snapshot.

Defect tracking is evidenced across the semester, not solely in final submission work. The Sprint 2 traceability page lists representative defects from media handling and query performance through deployed-worker, browser/CI, review and publication failures. The corrected Bug Tracking page now describes that demonstrated use rather than future intent, and keeps its workflow/verification guidance separate from current tracker state.

### Tooling and enforcement

The technology inventory records the selected runtimes, frameworks, test tooling, static analysis, documentation tooling, hosting and collaboration services. The CI/CD record identifies enforcement rather than merely naming tools: Pull Request quality gating, change-aware routing, database/browser lanes, strict MkDocs validation, architecture checks, dependency consistency and Lighthouse regression baselines are tied to repository scripts and Gitea Actions configuration.

This review makes no claim that a local configuration file alone proves a particular hosted run passed. The final traceability and retained validation records distinguish configured enforcement, local checks and hosted/deployed evidence.

## Review disposition

The inspected planning, traceability, bug-tracking and tooling routes are discoverable and mutually consistent. The only wording correction made by this review is in [Bug Tracking](../testing/bug-tracking.md): its continuous-use section now reflects the documented semester-long history and links representative evidence. No new planning, tracker, defect or tool claim was added without a retained source.

The final release/deployment, current CI, peer-review and issue-closure state remain outside this documentation review and must be refreshed from Gitea and deployment evidence immediately before release.

## AI Declaration

This review and the associated Bug Tracking wording correction were prepared with the assistance of Codex[GPT-5]. Claims were limited to retained repository documentation and evidence; no live tracker, CI, review, deployment or release outcome was inferred.
