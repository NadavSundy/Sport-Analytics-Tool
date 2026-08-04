# Project Methodology

| Document Information | Details |
|---|---|
| Project | Sport Analytics Tool |
| Platform | Gitea |
| Methodology | Lightweight Scrumban |
| Document Version | 1.0 |
| Date | 4 August 2026 |
| Status | Approved for Use |
| Team | Git Push Pray |


## 1. Purpose

This document defines the project methodology that will be followed throughout the development of the Sport Analytics Tool.

The methodology establishes:

- how project work will be planned;
- how tasks will be recorded and prioritised;
- how progress will be tracked;
- how the team will communicate internally;
- how stakeholder feedback will be collected and integrated;
- how each sprint will be reviewed and closed;
- how completed work will be verified; and
- how changes to the methodology will be controlled.

The purpose of the methodology is to provide a consistent, visible and lightweight process for managing the project. It is intended to support effective collaboration without introducing unnecessary administrative work.

All team members are required to follow this methodology consistently.


## 2. Selected Methodology

The team will use a **lightweight Scrumban methodology**.

Scrumban combines selected elements of Scrum and Kanban:

- fixed project sprints are used for planning and review;
- a visual Gitea Project board is used to track work continuously;
- stakeholder feedback is incorporated throughout development;
- work is completed in small, manageable tasks;
- unnecessary Scrum roles, story points and daily meetings are avoided.

This methodology was selected because the project has formal sprint deadlines, while its detailed requirements and priorities may change following stakeholder feedback, technical investigation and testing.

Full Scrum was not selected because daily standups, formal roles and detailed estimation would create unnecessary overhead for the size and duration of this project.

Pure Kanban was not selected because the project is structured around assessed sprint milestones and therefore requires clear sprint planning, review and reflection.

The selected methodology provides enough structure to demonstrate planning, stakeholder interaction, progress tracking and continuous improvement while remaining simple enough to follow consistently.


## 3. Project Management Platform

Gitea will act as the team’s primary source of truth for project work.

The team will use:

- **Gitea Issues** for features, bugs, documentation, testing, research and technical tasks;
- **Gitea Projects** for the visual work board;
- **Gitea Milestones** for Sprint 1, Sprint 2, Sprint 3 and the Final Submission;
- **Gitea Pull Requests** for implementation review;
- **repository documentation** for meeting notes, decisions and methodology records.

Important project decisions made in meetings, messages or informal discussions must be transferred to Gitea or the project documentation where they affect requirements, priorities, responsibilities or implementation.


## 4. Project Board

The Gitea Project board will use the following columns:

```text
Backlog
Ready
In Progress
In Review
Blocked
Done
```

### 4.1 Backlog

The `Backlog` contains identified work that has not yet been selected for active development.

An item may remain in the backlog where:

- it is not yet a current priority;
- further stakeholder clarification is required;
- the task is optional;
- the task belongs to a future sprint; or
- the task requires further investigation before it can be prepared.

### 4.2 Ready

The `Ready` column contains work that is sufficiently defined and can be started.

An issue may only move to `Ready` when it meets the team’s Definition of Ready.

### 4.3 In Progress

The `In Progress` column contains work currently being completed.

Each team member should normally have no more than one main issue in progress at a time. This work-in-progress limit is intended to encourage completion before additional work is started.

A second small task may only be started where the primary issue is blocked or awaiting review.

### 4.4 In Review

The `In Review` column contains work that has been completed by its assignee and is awaiting review, testing or approval.

Code-related issues will normally enter this column once a Pull Request has been opened.

### 4.5 Blocked

The `Blocked` column contains work that cannot continue.

A blocked issue must include a comment explaining:

- what is preventing progress;
- what is required to remove the blocker;
- who is responsible for the next action; and
- when the issue will be reviewed again.

### 4.6 Done

The `Done` column contains work that satisfies the team’s Definition of Done.

An issue may not be moved to `Done` merely because implementation has started or a partial result exists.


## 5. Sprint Structure

The project will be organised around the following formal milestones:

```text
Sprint 1
Sprint 2
Sprint 3
Final Submission
```

Each milestone period will be treated as a sprint.

Every sprint will include:

1. sprint planning;
2. continuous work tracking;
3. weekly stakeholder interaction;
4. a weekly team standup;
5. development and review; and
6. a brief sprint close-out.

Each sprint will have a clear sprint goal that states the main outcome the team intends to achieve.


## 6. Sprint Planning

The team will hold one sprint-planning meeting at the beginning of each sprint.

The meeting should normally last between 30 and 45 minutes.

During sprint planning, the team will:

1. agree on the sprint goal;
2. review the project requirements;
3. review stakeholder feedback;
4. review incomplete work from the previous sprint;
5. select issues from the backlog;
6. confirm that selected issues meet the Definition of Ready;
7. identify dependencies and technical risks;
8. assign initial issue owners;
9. allocate selected issues to the relevant Gitea milestone; and
10. confirm the expected outcome of the sprint.

A short sprint-planning record will be saved in the repository.

The record must include:

```markdown
# Sprint Planning

**Sprint:**  
**Date:**  
**Attendees:**  

## Sprint Goal

## Selected Work

## Key Risks and Dependencies

## Decisions

## Unresolved Questions
```

A full transcript of the meeting is not required.


## 7. Weekly Stakeholder Meeting

The team will meet with the assigned stakeholder or tutor every Tuesday, where reasonably possible.

The meeting should normally last between 20 and 30 minutes.

The purpose of the stakeholder meeting is to:

- demonstrate recent progress;
- clarify requirements;
- confirm priorities;
- ask questions;
- receive feedback;
- discuss proposed changes;
- identify missing requirements; and
- confirm whether completed work meets expectations.

The team will prepare relevant demonstrations or questions before the meeting.

A short stakeholder record must be saved after each meeting.

```markdown
# Stakeholder Meeting

**Date:**  
**Attendees:**  
**Purpose:**  

## Progress Demonstrated

## Requirements Discussed

## Feedback Received

## Decisions

## Actions

## Related Gitea Issues

- #...
```

Stakeholder feedback that affects the project must result in one of the following:

- an existing Gitea issue being updated;
- a new Gitea issue being created;
- an issue being reprioritised;
- an acceptance criterion being clarified; or
- a documented decision that no change will be made.

Requirements may not be changed silently.

Where a Tuesday meeting cannot take place, the team may use a structured written update or arrange the meeting on another day during the same week.


## 8. Weekly Team Standup

The team will hold one internal standup every Thursday.

The standup should normally last no longer than 15 minutes.

Each team member will answer:

1. What have I completed since the previous standup?
2. What am I currently working on?
3. What will I complete next?
4. Is anything blocking my progress?

The team will also briefly:

- review the Gitea Project board;
- check progress towards the sprint goal;
- review actions arising from Tuesday’s stakeholder meeting;
- identify delayed or blocked work;
- confirm whether responsibilities need to change; and
- identify any urgent issue requiring a separate discussion.

The standup is intended for coordination rather than detailed technical problem-solving. Longer discussions must take place after the standup with only the relevant team members.

Formal minutes are not required for every standup. A brief weekly note must record:

- important progress;
- blockers;
- decisions;
- changes to responsibility; and
- actions for the following week.

The Gitea Project board must be updated throughout the week. The Thursday standup is not the only time at which issue statuses may be changed.

Additional short standups may be arranged during the final days before a milestone where necessary. These additional meetings are an exception and do not replace the standard weekly schedule.


## 9. Individual Responsibilities

Each team member remains responsible for:

- updating their own issues;
- communicating blockers;
- completing assigned work;
- participating in reviews; and
- following the agreed methodology.


## 10. Gitea Issues

Every meaningful unit of project work must be recorded as a Gitea issue.

Examples include:

- new features;
- bug fixes;
- database changes;
- API work;
- user-interface work;
- automated testing;
- documentation;
- CI/CD configuration;
- technical research;
- stakeholder-requested changes; and
- project risks requiring action.

Each issue must contain:

```markdown
## Description

Explain what must be completed.

## Motivation

Explain why the work is required.

## Acceptance Criteria

- [ ] Specific observable result
- [ ] Relevant tests pass
- [ ] Documentation is updated where applicable

## Dependencies

List related or blocking issues.

## Evidence

Link relevant designs, meeting notes, Pull Requests or test results.
```

Each issue must also have:

- a clear title;
- an assignee;
- a sprint milestone;
- an appropriate work-type label; and
- an area label where relevant.

Suggested work-type labels are:

```text
type: feature
type: bug
type: documentation
type: testing
type: research
type: infrastructure
```

Suggested area labels are:

```text
area: frontend
area: api
area: database
area: data
area: infrastructure
area: documentation
```

Suggested additional labels are:

```text
priority: high
status: blocked
```

The team will avoid creating unnecessary labels that are not used consistently.



## 11. Task Size and Estimation

The team will not use story points or formal velocity calculations.

Issues should normally be small enough to complete within one to three working days.

An issue should be divided into smaller issues where:

- it contains several independent outcomes;
- it is expected to take most of a sprint;
- it cannot be reviewed effectively as one unit;
- different team members can complete separate parts independently; or
- its acceptance criteria are too broad.

The team may use simple labels such as `small`, `medium` and `large` where this is useful, but these labels are optional.

The purpose of task sizing is to keep work manageable rather than to produce detailed time estimates.



## 12. Prioritisation

Project work will be prioritised in the following order:

1. mandatory project requirements;
2. work required for the current sprint;
3. issues blocking other work;
4. stakeholder priorities;
5. high-risk technical work;
6. defects affecting core functionality;
7. testing and documentation required to support completed features;
8. optional enhancements.

The team will prioritise a reliable implementation of the basic project requirements before committing significant effort to intermediate or advanced functionality.

For the Sport Analytics Tool, early priority will be given to:

- event-data modelling;
- submission validation;
- event traceability;
- API design and implementation;
- statistic derivation;
- authentication and access control;
- database foundations; and
- project deployment and documentation foundations.

Priorities may change following stakeholder feedback, but the reason for any significant reprioritisation must be recorded.



## 13. Definition of Ready

An issue may move from `Backlog` to `Ready` only when:

- its purpose is clear;
- its expected outcome is understood;
- it contains acceptance criteria;
- important dependencies are identified;
- required stakeholder clarification has been obtained;
- the task is small enough to complete within the sprint;
- an appropriate assignee can be selected; and
- the team understands how completion will be tested or verified.

A research issue may use a clearly defined output, such as a recommendation, prototype, technical comparison or documented decision, instead of software acceptance criteria.

An issue that does not meet these conditions must remain in the backlog.


## 14. Definition of Done

An issue may move to `Done` only when all applicable conditions have been satisfied.

The issue must:

- meet all acceptance criteria;
- have the required implementation completed;
- have relevant tests added or updated;
- pass all applicable automated checks;
- have been reviewed by another team member where required;
- have no unresolved review comments;
- include updated documentation where necessary;
- be merged into `main` where code changes are involved;
- have any known limitations documented; and
- be closed in Gitea.

For user-facing work, the team must also verify that the change is:

- usable;
- responsive;
- accessible; and
- consistent with the agreed design.

For research or documentation issues, the agreed output must be complete, stored in the repository and reviewed where appropriate.



## 15. Handling Blocked Work

An issue must be moved to `Blocked` where progress cannot continue.

The assignee must add a comment explaining:

```markdown
## Blocker

**Blocked by:**  
**Required action:**  
**Responsible person:**  
**Review date:**  
```

Blocked work must be reviewed during the Thursday standup.

Where the blocker depends on the stakeholder, it must be raised at the next Tuesday meeting or through written communication if the delay is urgent.

Where an issue remains blocked for more than one week, the team must decide whether to:

- remove the blocker;
- reassign the issue;
- divide the issue;
- replace it with an alternative approach;
- move it to a later sprint; or
- remove it from scope with a documented reason.


## 16. Sprint Close-Out

At the end of each sprint, the team will complete a brief sprint close-out.

The Tuesday stakeholder meeting closest to the sprint deadline will be used to:

- demonstrate completed work;
- confirm whether completed work meets stakeholder expectations;
- collect final feedback for the sprint;
- identify incomplete work;
- identify known defects and limitations; and
- confirm how incomplete or changed work will be handled.

During the final Thursday standup of the sprint, the team will briefly reflect on:

1. what worked well;
2. what caused difficulty; and
3. one improvement that should be applied during the next sprint.

The sprint close-out does not require a separate meeting.

A short sprint close-out record will be saved in the repository.

```markdown
# Sprint Close-Out

**Sprint:**  
**Date:**  
**Attendees:**  

## Sprint Goal

## Completed Work

## Incomplete Work

## Stakeholder Feedback

## Known Defects and Limitations

## Decisions

## Improvement for the Next Sprint
```

Only issues that meet the Definition of Done may be reported as completed.

Incomplete work must be:

- returned to the backlog;
- moved to the next sprint with a documented reason;
- divided into smaller issues; or
- removed from scope with justification.

The agreed improvement must be reviewed during the following sprint to determine whether it was applied and whether it was effective.



## 17. Communication and Decision-Making

Gitea and the project repository will contain the authoritative record of project work.

Other communication platforms may be used for convenience, but important information must be recorded formally where it affects:

- requirements;
- issue priority;
- technical decisions;
- scope;
- deadlines;
- responsibilities;
- risks; or
- stakeholder feedback.

Technical decisions that significantly affect the project should be documented in a short decision record.

```markdown
# Decision Record

**Decision:**  
**Date:**  
**Participants:**  

## Context

## Options Considered

## Selected Option

## Motivation

## Consequences

## Related Issues
```

Routine implementation choices do not require a separate decision record.


## 18. Methodology Review and Change Control

This methodology is intended to remain in use for the duration of the project.

The team will not change the methodology merely because another process appears more convenient or because an individual team member prefers a different approach.

Consistent use is necessary to maintain reliable project records and demonstrate how the team planned, tracked and reviewed its work.

The methodology may only be changed where there is clear evidence that the current process is causing significant or repeated problems.

Examples include:

- excessive meeting or documentation overhead;
- repeated delays caused by the process;
- difficulty tracking work;
- important tasks regularly becoming blocked;
- stakeholder feedback not being integrated effectively;
- a Gitea limitation preventing the methodology from being followed;
- repeated confusion about responsibilities; or
- a major project change that makes the current methodology unsuitable.

Before changing the methodology:

1. The problem must be discussed by the full team.
2. Evidence of the problem must be identified.
3. The proposed change and its expected benefit must be explained.
4. The change must be approved by a majority of the team.
5. The decision and motivation must be recorded.
6. This document must be updated with a new version number and effective date.
7. The revised methodology must be applied consistently from that date onward.

Methodology changes will not be applied retrospectively.

Work completed before the effective date of a change will remain governed by the methodology version in effect at that time.

Minor wording corrections that do not change the actual process may be made without following the full change procedure.


## 19. Evidence of Compliance

The team will demonstrate that this methodology has been followed through evidence in Gitea and the project repository.

Evidence will include:

- a populated and actively maintained Gitea Project board;
- Gitea milestones for each sprint;
- issues with descriptions and acceptance criteria;
- assigned and labelled issues;
- visible movement of work across board columns;
- blocked issues with documented reasons;
- Tuesday stakeholder-meeting notes;
- Thursday standup summaries;
- sprint-planning records;
- sprint close-out records;
- documented improvements between sprints;
- linked Pull Requests and issue closures;
- contributions from all team members; and
- documented methodology changes where applicable.

The existence of this document alone will not be considered sufficient evidence of compliance.

The team’s Gitea activity and repository documentation must demonstrate that the methodology was followed consistently.


## 20. Standard Weekly Workflow

The standard weekly process will be:

### Tuesday

- Meet with the stakeholder or tutor.
- Demonstrate progress.
- Clarify requirements.
- Record feedback and decisions.
- Create or update Gitea issues.

### Wednesday

- Incorporate stakeholder feedback into active work.
- Reprioritise issues where required.
- Update the Project board.

### Thursday

- Hold the internal team standup.
- Review progress towards the sprint goal.
- Identify blockers.
- Confirm next actions.
- Record a brief weekly summary.

### Friday to Monday

- Continue implementation, testing, review and documentation.
- Update Gitea issues whenever work status changes.
- Prepare demonstrations and questions for the next stakeholder meeting.

This weekly structure may be adjusted around public holidays, assessment commitments or stakeholder availability, provided that stakeholder interaction and team coordination still take place during the same week where reasonably possible.


## 21. Summary of the Methodology

The team will follow this process:

1. Record meaningful work as Gitea issues.
2. Define acceptance criteria before work begins.
3. Prioritise work according to project requirements and sprint goals.
4. Track work continuously on the Gitea Project board.
5. Meet the stakeholder every Tuesday where reasonably possible.
6. Hold an internal team standup every Thursday.
7. Keep work small and limit each member to one main active issue.
8. Review and verify work before marking it as done.
9. Complete a brief close-out at the end of each sprint.
10. Record important decisions and stakeholder feedback.
11. Change the methodology only where evidence shows that it is causing significant or repeated problems.
12. Apply the methodology consistently throughout the project.


## AI Declaration

The preceding document was planned, generated, reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Thinking].
