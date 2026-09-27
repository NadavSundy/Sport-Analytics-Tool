# Sprint 3 Stakeholder Check-In — 22–24 September 2026

**Initial contact:** 22 September 2026
**Feedback received:** 24 September 2026
**Format:** WhatsApp
**Stakeholder:** Project client
**Sprint:** Sprint 3

## Context

The team's usual stakeholder check-in could not take place synchronously on 22 September because the scheduled slot conflicted with an academic test during an already busy project week.

Rather than skipping the Sprint 3 stakeholder interaction, the team moved the check-in to WhatsApp so that the stakeholder could review the current deployed product in their own time.

The stakeholder was provided with:

- a concise summary of the main changes since the previous check-in;
- the deployed main application;
- the public API Explorer; and
- specific areas on which feedback would be most useful before the Sprint 3 milestone.

This allowed the team to retain a meaningful stakeholder review despite the scheduling conflict.

## Product update provided

The stakeholder was informed that the main changes since the previous Tuesday included:

- a more complete fixture and statistics experience, including clearer match summaries, scorecards, leaders and powerplay analytics;
- a public API Explorer for external analysts;
- improvements to the submission and review flow, including support for proposing new fixtures; and
- multi-season back-catalogue support, which was still undergoing validation against real source data.

The deployed application and API Explorer were shared directly so that the stakeholder could review the current implementation.

## Stakeholder feedback

The stakeholder responded after reviewing the system and stated that, from what they had seen, the important functionality expected from the API appeared to be present.

They also indicated that they had not identified any major change that needed to be completed before the Sprint 3 milestone.

Two smaller usability issues were identified.

### 1. Pagination position is unclear in some views

The stakeholder noted that the seasons and players views do not provide the same indication of pagination position that is available in the fixtures view.

For example, a user may be navigating a large result set without being shown information equivalent to:

> Page 1 of 200

This was identified as a minor usability and navigation consistency issue rather than a missing core feature.

### 2. API Explorer loading state is unclear

The stakeholder observed that the API Explorer does not always appear to render all of its content at once.

On their device, some initial content such as the supported API major version and implementation status appeared first, while additional API Explorer content took several seconds to become visible.

During this period there was no clear loading indicator showing that more content was still being rendered.

The stakeholder suggested displaying a spinner or similar loading state while the API Explorer is being prepared.

## Evaluation of feedback

The team evaluated both points as valid usability improvements.

Neither issue represents a missing core Sprint 3 capability, but both affect the clarity and polish of the deployed product:

- #747 - pagination information helps users understand where they are within large datasets and should behave consistently between comparable views;
- #748 - the API Explorer should provide feedback while asynchronous content is loading so that users do not interpret partially rendered content as missing or broken.

Both findings will therefore be recorded in the issue tracker so that they can be prioritised and addressed through the normal development workflow.

## Outcome

The stakeholder review provided confirmation that no major functionality gap had been identified from their current review of the system.

The interaction also produced two concrete usability improvements:

1. improve pagination-position feedback in the seasons and players views; and
2. improve the API Explorer loading state while its content is being rendered.

These findings were converted into tracked development issues rather than being left only in the WhatsApp discussion.

This interaction demonstrates the team's use of stakeholder feedback as part of the Sprint 3 review process and provides a traceable link between deployed-product review, stakeholder observations, issue tracking, and subsequent development work.

## Evidence

Screenshots of the WhatsApp stakeholder interaction are retained as evidence of:

- the product update supplied to the stakeholder;
- links to the deployed application and API Explorer;
- the stakeholder's evaluation of the current functionality; and
- the usability feedback subsequently converted into tracked issues.

---

**AI Declaration:** The preceding document was generated and edited with the assistance of ChatGPT Web[GPT-5.6 Sol].
