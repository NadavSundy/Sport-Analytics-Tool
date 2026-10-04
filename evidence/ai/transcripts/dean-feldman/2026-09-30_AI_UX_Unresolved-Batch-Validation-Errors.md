# Rewrite UX Issue Clearly

**User:** Anonymous  
**Created:** 9/30/2026 21:41:59  
**Updated:** 9/30/2026 21:45:49  
**Exported:** 10/4/2026 21:34:46  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3-sdp/c/6abd6607-3b60-83e9-8459-30afb4eb573b](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3-sdp/c/6abd6607-3b60-83e9-8459-30afb4eb573b)  

## Prompt:
9/30/2026, 9:41:57 PM

![WhatsApp Image 2026-09-28 at 18.36.23.jpeg](https://chatgpt.com/backend-api/estuary/content?id=file_0000000015b082119d81e41207c90866&ts=497539&p=fs&cid=1&sig=fccbc5fd430d51d8c2c4f120599ab95e70292c5e8cd612069ecebefae031b044&v=0)

make this an iaasue to make it easier for the end user to understand

## Response:
9/30/2026, 9:42:02 PM · gpt-5-6-thinking

```md
# [UX] Make unresolved batch validation errors understandable to end users

## Type
UX / Usability Bug

## Priority
High

## Target Milestone
Milestone 4 - Final Submission

## Problem

When a submitted batch contains an unresolved reference, the **Results** page exposes implementation-level information directly to the end user.

For example, the current UI displays:

- Internal identifiers such as `cricsheet:delivery:acc-wpc-2026-final-1-0-1`
- Raw submitted JSON
- Terms such as `fixture reference`, `innings scope`, and `source reference`
- Multiple nested error sections
- Technical resolution details before clearly explaining what the user needs to do

Although the underlying validation is working correctly, the presentation makes it difficult for a normal submitter to understand:

1. What went wrong
2. Which match/event caused the problem
3. Why the system could not resolve it
4. What they should do next

This is particularly important for final submission because the rubric explicitly considers how errors are handled as part of **User Experience**, and whether the interface makes sense to a first-time user. `project_briefs (6).pdf` `project_briefs (6).pdf`

The project-specific brief also requires rejected submissions to explain what is wrong rather than failing silently. `sport_analytics (1).pdf`

## Expected Behaviour

The default error view should provide a short, human-readable explanation and an actionable next step.

Example:

> **Match could not be found**
>
> We could not match this event to an existing fixture.
>
> **Match:** Thailand Women vs United Arab Emirates Women  
> **Date:** 13 June 2026  
> **Venue:** Bayuemas Oval, Kuala Lumpur
>
> The fixture `acc-wpc-2026-final` does not currently exist in the system.
>
> **What to do:** Ask a reviewer to match or create the fixture before this event can be accepted.

Technical information should remain available, but behind a collapsed **Technical details** section.

## Requirements

- Replace implementation-focused error headings such as `fixture needs a match` with human-readable titles.
- Extract useful context from the submitted payload where available:
  - teams
  - date
  - venue
  - innings
  - over/delivery
- Clearly state the reason the record cannot proceed.
- Provide an explicit **What to do next** instruction.
- Keep raw JSON, source references, record IDs, and diagnostic information inside a collapsed **Technical details** section.
- Do not remove the underlying diagnostic information required by reviewers/developers.
- Avoid repeating the same root error for fixture, innings, and delivery when they all originate from the fixture failing to resolve.
- Where child errors depend on an unresolved parent fixture, group them beneath the primary fixture error rather than presenting them as separate user-facing failures.
- Preserve the existing link to the relevant source record/file where useful.
- Ensure the redesigned error state is accessible and responsive.

## Acceptance Criteria

- [ ] A submitter can identify the affected fixture without inspecting raw JSON.
- [ ] Fixture errors display human-readable team, date, and venue information when available.
- [ ] The primary error explains in plain language why the event cannot be accepted.
- [ ] Every unresolved-reference error provides a clear next action.
- [ ] Raw JSON is hidden by default.
- [ ] Internal IDs and source references are hidden from the primary user-facing message.
- [ ] Technical information remains accessible through an expandable `Technical details` section.
- [ ] Fixture-resolution failures do not produce redundant user-facing innings/delivery errors.
- [ ] Existing reviewer/debugging information is not lost.
- [ ] Keyboard users can expand/collapse technical details.
- [ ] Error state works correctly on desktop and mobile layouts.
- [ ] Automated frontend tests cover the simplified and expanded states.

## Suggested Tests

### Component / UI
- unresolved fixture renders simplified message
- team names/date/venue are extracted correctly
- technical details are collapsed by default
- technical details can be expanded
- raw JSON is only visible after expansion
- missing optional context does not break rendering

### Integration / E2E
Submit a batch containing an unknown fixture reference and verify that:

1. the batch is still rejected/staged correctly;
2. the user receives a readable explanation;
3. the affected fixture is identifiable;
4. an actionable next step is shown;
5. technical information remains available when expanded.

## Out of Scope

- Changing fixture matching algorithms
- Automatically creating fixtures
- Automatically guessing unresolved references
- Changing batch validation semantics

This issue changes **error presentation and usability**, not the existing safety behaviour around unresolved references.
```

I would classify this as a **UX/usability bug**, not just a cosmetic enhancement: the system technically reports the validation failure, but the current presentation exposes implementation details instead of making the recovery path clear to the submitter.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/30/2026, 9:45:29 PM

AI references

## Response:
9/30/2026, 9:45:39 PM · gpt-5-6-thinking

> **Clarifying AI references**
>
> I’m interpreting “AI references” as attribution text for the issue. I’ll provide a policy-aligned declaration plus the project’s required log entry, preserving the specified tool, model, purpose, and verification details.
>
> **Clarified AI references**
>
> 
>
> Worked for 9s

Add this to the bottom of the issue:

```md
## AI References

AI Declaration: This issue was planned and generated with the assistance of ChatGPT Web[GPT-5.6 Sol].

Purpose: UX issue definition, acceptance criteria, and testing requirements.
```

This satisfies the COMS3011A requirement to identify the **tool, model, and purpose** of AI use, and the policy permits AI assistance for planning and generating written material. `ai_policy.pdf` `ai_policy.pdf`

For your project's more detailed AI log, use:

```text
Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.
```



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)