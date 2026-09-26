# Create Feedback Issues

**User:** Anonymous  
**Created:** 9/24/2026 22:37:26  
**Updated:** 9/24/2026 22:51:05  
**Exported:** 9/26/2026 13:12:57  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3-sdp/c/6ab58a06-147c-83ea-a7da-386c7c401d40](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3-sdp/c/6ab58a06-147c-83ea-a7da-386c7c401d40)  

## Prompt:
9/24/2026, 10:37:31 PM

[20:28, 24/09/2026] +27 63 404 2575: Good evening 
I'm sorry for being terribly late with the response 
Here are my views on the two things you wanted feedback on
[20:39, 24/09/2026] +27 63 404 2575: From what I've seen, I don't think there are any important things that aren't there. All that someone would want to use with your API are there. 

And I don't think I found anything major to change with before sprint 3 closes.
I think it's only minor stuff such as in the seasons or players view, there's no Indication of what page youre on like it is in the fixtures view. Like page 1 of 200 for example

And maybe another issue is just my device but when I go to the API explorer, part of the stuff there aren't rendered at the same time. For example, "supported API major version:v1" and "implementation status" are rendered on screen first. And when I scroll down for the first few seconds, the rest of the stuff arent rendered. And there's no spinner that indicates that the rest of the content are yet to be rendered

And maybe add a spinner when you show me "loading API explorer"

But otherwise, everything is pretty goo

make issues from the client feedback

## Response:
9/24/2026, 10:37:33 PM

> **Creating client-feedback issues**
>
> I’m grouping the feedback into two actionable issues: consistent pagination indicators for Seasons and Players, plus clearer loading feedback while API Explorer content is still rendering.
>
> **Created client-feedback issues**
>
> 
>
> Worked for 16s

I would split this client feedback into **2 issues**. The API Explorer comments belong together because they describe the same loading-state/partial-render UX problem. Recording and integrating this feedback is particularly relevant for Sprint 3’s **User Feedback (10%)** and **Improvement (5%)** criteria. `project_briefs (4).pdf`

## Issue 1 - Add pagination position indicators to Players and Seasons views

**Title**
```text
feat: show current pagination position on Players and Seasons views
```

**Body**
```md
## Description

Client feedback identified an inconsistency between the Fixtures view and the Players/Seasons views.

The Fixtures view provides a clear indication of the user's current position within paginated results, for example:

> Page 1 of 200

The Players and Seasons views currently provide pagination controls without showing the current page and total number of pages.

This makes it less clear how much data is available and where the user currently is within a large result set.

## Client Feedback

> "In the seasons or players view, there's no indication of what page you're on like it is in the fixtures view. Like page 1 of 200 for example."

Feedback received: 24 September 2026.

## Expected Behaviour

Players and Seasons should expose pagination information consistently with the Fixtures view.

Examples:

- `Page 1 of 20`
- `Page 7 of 20`

The indicator should update whenever the user navigates between pages.

## Acceptance Criteria

- [ ] Players view displays the current page number.
- [ ] Players view displays the total number of available pages.
- [ ] Seasons view displays the current page number.
- [ ] Seasons view displays the total number of available pages.
- [ ] Pagination information updates after navigating forward/backward.
- [ ] Behaviour is consistent with the existing Fixtures pagination UI where practical.
- [ ] Pagination remains usable and readable on mobile layouts.
- [ ] Pagination status is accessible to screen-reader users.
- [ ] Existing pagination behaviour is not regressed.
- [ ] Relevant frontend tests are added or updated.

## Verification

Verify manually with datasets containing multiple pages:

1. Open Players.
2. Confirm a `Page X of Y` indicator is visible.
3. Navigate between pages and confirm it updates.
4. Repeat for Seasons.
5. Verify desktop and mobile layouts.
6. Run the relevant frontend/component/E2E tests.

## Type

UX improvement / Client feedback

## Suggested Labels

`enhancement`, `frontend`, `ux`, `client-feedback`, `sprint-3`
```

---

## Issue 2 - Improve API Explorer loading and progressive rendering feedback

**Title**
```text
fix: provide visible loading feedback while API Explorer content renders
```

**Body**
```md
## Description

Client testing identified unclear loading behaviour in the API Explorer.

When the API Explorer is opened, some content such as:

- Supported API major version
- Implementation status

can become visible before the remainder of the Explorer content has rendered.

During this period, scrolling further down may show an apparently empty/incomplete page without any indication that additional content is still loading.

The existing "Loading API Explorer" state should also provide a visible loading indicator.

## Client Feedback

> "When I go to the API explorer, part of the stuff there aren't rendered at the same time."

> "When I scroll down for the first few seconds, the rest of the stuff aren't rendered. And there's no spinner that indicates that the rest of the content are yet to be rendered."

> "Maybe add a spinner when you show me 'loading API explorer'."

Feedback received: 24 September 2026.

## Expected Behaviour

Users should always be able to distinguish between:

1. content that has finished loading,
2. content that is still loading, and
3. content that failed to load.

The API Explorer should provide clear loading feedback while asynchronous or deferred content is being prepared.

## Acceptance Criteria

- [ ] The initial `Loading API Explorer` state includes a visible loading indicator.
- [ ] The loading indicator has an accessible text/status equivalent.
- [ ] Users are not presented with unexplained blank sections while API Explorer content is still loading.
- [ ] Deferred API Explorer content displays an appropriate loading state until it is ready.
- [ ] Loading indicators disappear once the associated content has rendered.
- [ ] A failed API Explorer load results in an explicit error state rather than an indefinite spinner/blank region.
- [ ] Existing API Explorer metadata and endpoint documentation continue to render correctly.
- [ ] Loading behaviour works consistently on desktop and mobile.
- [ ] Automated tests cover the loading → loaded transition.
- [ ] Automated tests cover the loading → error transition where applicable.

## Implementation Notes

Prefer using the application's existing loading indicator/component rather than introducing a separate visual pattern.

If different sections of the API Explorer genuinely load independently, either:

- provide section-level loading placeholders/skeletons; or
- delay presenting the Explorer as ready until its required content is available.

Do not use an indefinite spinner without corresponding failure handling.

## Verification

1. Throttle the browser/network or otherwise simulate a delayed API Explorer load.
2. Open the API Explorer.
3. Confirm a loading indicator is immediately visible.
4. Confirm unfinished sections cannot be mistaken for empty content.
5. Confirm the indicator disappears when rendering completes.
6. Simulate a failed load and verify an error state is shown.
7. Repeat on mobile viewport.
8. Run relevant component/E2E tests.

## Type

Bug / UX improvement / Client feedback

## Suggested Labels

`bug`, `frontend`, `api-explorer`, `ux`, `accessibility`, `client-feedback`, `sprint-3`
```

I would **not create an issue** for the client's statement that there are no major missing features; that should instead be preserved as **Sprint 3 stakeholder-feedback evidence**. The two actionable observations above should go into the tracker so you have direct evidence that client feedback was **evaluated and integrated**, which is explicitly valued by the course rubric. `project_briefs (4).pdf`

## Prompt:
9/24/2026, 10:43:09 PM

give me add ons to make sure they are documented extensively

## Response:
9/24/2026, 10:43:19 PM

> **Extending documentation coverage**
>
> I’m adding reusable blocks for evidence, traceability, testing, screenshots, accessibility, documentation-site updates, changelogs, and stakeholder feedback. These align with the brief’s testing and sprint-documentation requirements【209603581762039†L168-L184】.
> 
> _Attribution: “This response was generated with assistance from OpenAI’s ChatGPT.”_
>
> **Extended documentation coverage**
>
> 
>
> Worked for 6s

Add a **Documentation & Evidence** section to both issues so they do not finish as “code-only” fixes. This directly strengthens Sprint 3’s **Documentation (15%)**, **User Feedback (10%)**, and **Automated Testing (10%)** areas. `project_briefs (4).pdf` It also preserves the formal feedback → evaluation → integration trail expected elsewhere in the rubric. `project_briefs (4).pdf`

For **Issue 1 - Players/Seasons pagination**, append:

```md
## Documentation Requirements

This issue originated from direct client feedback and must be documented as part of the Sprint 3 stakeholder/user-feedback evidence.

Before closing this issue:

- [ ] Record the original client feedback and date received.
- [ ] Document the team's interpretation of the feedback.
- [ ] Document the implementation decision taken.
- [ ] Link this issue from the relevant Sprint 3 client/user-feedback record.
- [ ] Link the implementing PR back to this issue.
- [ ] Include before/after screenshots showing:
  - [ ] Players pagination before the change.
  - [ ] Players pagination after the change.
  - [ ] Seasons pagination before the change.
  - [ ] Seasons pagination after the change.
  - [ ] Mobile/responsive behaviour.
- [ ] Record automated tests added or changed.
- [ ] Record manual verification performed.
- [ ] Record accessibility verification for the pagination status.
- [ ] Update relevant user-facing documentation if pagination behaviour is documented elsewhere.
- [ ] Add the change to the appropriate Sprint 3/release documentation.

## Stakeholder Feedback Traceability

### Source

Client feedback received: 24 September 2026.

### Observation

The client identified that Fixtures communicates pagination position, for example `Page 1 of 200`, while Players and Seasons do not.

### Evaluation

The feedback is accepted as a UX consistency improvement because paginated collections should clearly communicate the user's current position and the total result range.

### Action Taken

Add equivalent current-page/total-page information to the Players and Seasons views while preserving their existing pagination behaviour.

### Result

Complete this section after implementation with:

- PR:
- Commit(s):
- Screenshots/evidence:
- Tests:
- Verification date:
- Verified by:

## Testing Evidence

Document the following evidence before closure:

| Verification | Evidence Required |
| --- | --- |
| Players current page shown | Screenshot and automated test |
| Players total pages shown | Screenshot and automated test |
| Seasons current page shown | Screenshot and automated test |
| Seasons total pages shown | Screenshot and automated test |
| Navigation updates indicator | Automated/component/E2E test |
| Mobile layout | Mobile viewport screenshot |
| Accessibility | Accessibility/manual verification result |
| Regression check | Relevant test command and result |

## Definition of Done

This issue is not complete until:

- [ ] Implementation is merged.
- [ ] Automated tests pass.
- [ ] Manual verification is recorded.
- [ ] Before/after evidence is stored.
- [ ] Client-feedback documentation references this issue.
- [ ] PR references the client-feedback source.
- [ ] Relevant documentation/release notes are updated.
```

For **Issue 2 - API Explorer loading states**, append this:

```md
## Documentation Requirements

This issue originated from direct client feedback and must be preserved as Sprint 3 user/stakeholder-feedback evidence.

Before closing this issue:

- [ ] Record the original client feedback and date received.
- [ ] Document the observed API Explorer loading behaviour.
- [ ] Document whether the delay is caused by:
  - [ ] data fetching,
  - [ ] lazy-loaded components,
  - [ ] documentation/schema processing,
  - [ ] rendering performance,
  - [ ] or another identified cause.
- [ ] Document the chosen loading-state strategy.
- [ ] Link this issue from the relevant Sprint 3 client/user-feedback record.
- [ ] Link the implementing PR back to this issue.
- [ ] Capture evidence of:
  - [ ] initial loading state,
  - [ ] partially/deferred loading content where applicable,
  - [ ] fully loaded state,
  - [ ] error state,
  - [ ] mobile behaviour.
- [ ] Record automated loading-state tests.
- [ ] Record error-state tests.
- [ ] Record accessibility verification.
- [ ] Add the improvement to Sprint 3/release documentation.

## Stakeholder Feedback Traceability

### Source

Client feedback received: 24 September 2026.

### Observation

The client observed that API Explorer metadata can appear before the rest of the page has rendered, leaving apparently empty content without feedback that rendering/loading is still in progress.

The client also specifically requested a loading indicator alongside the existing `Loading API Explorer` state.

### Evaluation

The feedback is accepted because users currently cannot reliably distinguish between:

1. content that has loaded,
2. content that is still loading, and
3. content that has failed to load.

This creates ambiguous system feedback and negatively affects perceived responsiveness.

### Action Taken

Provide explicit and accessible loading feedback throughout the API Explorer loading lifecycle and provide a distinct failure state where loading cannot complete.

### Result

Complete after implementation:

- Root cause:
- Chosen loading strategy:
- PR:
- Commit(s):
- Screenshots/evidence:
- Automated tests:
- Performance observations:
- Verification date:
- Verified by:

## Loading-State Documentation

The implementation documentation should describe the API Explorer states explicitly:

### Initial

Expected UI while the Explorer has not yet become usable.

### Loading

Expected indicator and accessible status while required content is being prepared.

### Partially Ready

If progressive rendering is intentionally retained, document which elements may appear first and how unfinished sections communicate their state.

### Ready

Document the condition under which the loading indicator is removed.

### Failed

Document:

- user-facing error behaviour,
- retry behaviour if available,
- logging/diagnostics behaviour,
- prevention of indefinite loading indicators.

## Testing Evidence

| Scenario | Expected Evidence |
| --- | --- |
| Initial Explorer load | Screenshot + automated test |
| Delayed API/schema response | Automated test |
| Loading → ready | Automated test |
| Loading → failure | Automated test |
| Loading indicator accessibility | Accessibility verification |
| Slow network/rendering | Manual throttling evidence |
| Desktop rendering | Screenshot |
| Mobile rendering | Screenshot |
| Existing Explorer content regression | Relevant E2E/component test result |

## Performance Evidence

Because the original feedback concerns perceived loading/rendering speed, record:

- [ ] Browser/device used for reproduction.
- [ ] Whether network throttling was used.
- [ ] Approximate time until initial content appears.
- [ ] Approximate time until the Explorer is fully usable.
- [ ] Whether the issue is network-bound or rendering-bound.
- [ ] Any meaningful before/after timing measurements.

The objective is not necessarily to make every component render simultaneously; it is to ensure that progressive loading is clear and does not appear broken.

## Definition of Done

This issue is not complete until:

- [ ] Root cause has been documented.
- [ ] Loading-state behaviour has been implemented.
- [ ] Failure-state behaviour has been implemented where applicable.
- [ ] Automated tests pass.
- [ ] Slow-loading behaviour has been manually verified.
- [ ] Mobile behaviour has been verified.
- [ ] Accessibility has been verified.
- [ ] Screenshots/evidence have been stored.
- [ ] Sprint 3 feedback documentation references this issue.
- [ ] PR links this issue and the relevant evidence.
- [ ] Relevant release/Sprint documentation has been updated.
```

I would also add this **standard block to every client-feedback issue from now until submission**:

```md
## Feedback Evidence Checklist

- [ ] Original feedback preserved verbatim.
- [ ] Feedback source identified.
- [ ] Date received recorded.
- [ ] Feedback evaluated by the team.
- [ ] Decision documented: accepted / partially accepted / rejected.
- [ ] Motivation for the decision documented.
- [ ] Implementation issue linked.
- [ ] Implementing PR linked.
- [ ] Automated testing evidence linked.
- [ ] Manual testing evidence linked.
- [ ] Before/after evidence linked where applicable.
- [ ] Documentation updated.
- [ ] Final outcome recorded.
```

That gives you a defensible chain of:

**client observation → recorded feedback → evaluation → issue → implementation → tests → evidence → documentation**.

That is much stronger for assessment than merely having the WhatsApp message and a closed issue. The brief explicitly values extensive testing documentation, including the user-feedback process and automated testing procedure. `project_briefs (4).pdf`

Also retain the **original WhatsApp screenshot/export** as evidence rather than only copying the text into Git. The issue should point to that evidence document, while the evidence document should point back to the resulting issues/PRs.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/24/2026, 10:47:05 PM

mark us for sprint 3

[Attachment: project_briefs (6).pdf]

[Attachment: Sport-Analytics-Tool-main (22).zip]

## Response:
9/24/2026, 10:47:08 PM

> **Inspecting Sprint 3 Repository Contents**
>
>
> **Assessing rubric scores**
>
> I’m mapping the evidence to each rubric category, balancing strong API, testing, documentation, and feature coverage against pending deployment acceptance, limited formal feedback sessions, and remaining minor issues. My current estimate is 83–85/100.
>
> **Assessed rubric scores**
>
> 
>
> **Inspecting Advanced API Coverage and Tests**
>
>
> **Refining rubric scores**
>
> I’m adjusting the estimate after weighing advanced-feature gaps, strong endpoint coverage, broad automated tests, minor known issues, and limited formal user sessions. A defensible score is around 83–85, with API and testing strongest, and feedback the main deduction.
>
> **Inspected Sprint 3 repository, evidence, coverage, methodology, APIs, tests, performance, and issues**
>
> 
>
> Worked for 3m 22s

## Provisional Sprint 3 mark: **84-86%**

Based on the **24 September repository snapshot**, the updated COMS3011A brief, your current Sprint 3 evidence, automated-testing evidence, documentation, API surface, and the client feedback you just received, I would currently place the project at about **85/100**.

Sprint 3 ends **29 September**, so you still have five days to close the main evidence gaps. `project_briefs (6).pdf`

| Sprint 3 criterion | Weight | My mark now | Band | Evidence / reasoning |
|---|---:|---:|---|---|
| **User Feedback** | 10% | **6.5/10** | Intermediate → Advanced boundary | The rubric wants *extensive* user testing for Advanced. `project_briefs (6).pdf` You have a formal task-based process and P07/P08 Sprint 3 sessions, plus fresh client feedback. However, `sprint-3-user-testing-summary.md` still shows #603-#607 and #612 as **Not started**, and #602 still requires an accepted S2 finding to be implemented/retested. This is currently the largest easy mark opportunity. |
| **Automated Testing** | 10% | **9/10** | Advanced | Advanced requires extensive testing across codebases and >60% coverage. `project_briefs (6).pdf` `issue-578-repository-code-coverage.md` records **63.81% lines, 62.54% statements, 68.80% functions**, with frontend/backend/worker/contracts/batch-processing included in aggregation. Snapshot contains roughly **187 test files** across application/workspace/root suites. Main deduction: batch-processing has no direct Vitest suite and #648 shows hosted frontend coverage instability. |
| **Feature Implementation** | 20% | **17.5/20** | Advanced | Advanced requires most features with minimal bugs, or all features with non-severe bugs. `project_briefs (6).pdf` Your client's latest feedback explicitly says they could not identify important missing functionality and identified only minor UX issues. The repository contains substantial public statistics, batch submission/review, corrections, releases, player comparison, admin, auth, weather, provenance and API Explorer functionality. Some active UX/correctness work prevents a near-perfect score. |
| **API Implementation** | 20% | **18.5/20** | Advanced | Advanced requires all endpoints implemented and mostly bug-free. `project_briefs (6).pdf` The OpenAPI document contains **74 paths**; the backend has corresponding route modules and #609 adds contract enforcement plus a route-inventory test with no undocumented-route allowlist. Consumer APIs, keys, pagination, exports, provenance, batches and dataset releases are substantial. Selected Advanced capabilities #608/#610/#611 are not clearly evidenced as complete in this snapshot, so I would not award 20/20 yet. |
| **Performance** | 5% | **3/5** | Intermediate | Advanced says **no performance issues**; Intermediate permits minimal issues. `project_briefs (6).pdf` #599 is strong local evidence: representative-scale corpus of **300 fixtures / 72,000 events**, stated targets, repeated measurements and no local regression. But your own evidence explicitly says #565 deployed production-scale acceptance is still **pending**. That makes claiming “no performance issues” difficult until the live run exists. |
| **Improvement** | 5% | **4.5/5** | Advanced | Advanced requires extensive evidence that user/stakeholder feedback was integrated. `project_briefs (6).pdf` This is strong: Sprint 2 feedback drove #579-#582/#513, Sprint 3 formal findings create tracked issues, and today's client feedback is already being converted into actionable pagination/API Explorer work. Finish and document those two new client issues before closing Sprint 3 for a very defensible 5/5. |
| **Documentation** | 15% | **13.5/15** | Advanced | Advanced requires features, API, database, testing etc. to all be well documented. `project_briefs (6).pdf` Your `docs/` tree is unusually comprehensive: architecture, OpenAPI, API contracts, database/schema/ERD, deployment, CI/CD, testing, security, design, data releases, methodology, dependencies and AI usage are all represented. Deduction because Sprint 3 close-out/traceability is not yet present and some evidence documents still explicitly contain pending verification. |
| **Project Methodology** | 15% | **13/15** | Advanced | Advanced requires evidence of **strictly following methodology**. `project_briefs (6).pdf` You have documented Scrumban + GitHub Flow adapted for Gitea, issue→branch→commit→PR traceability, Definitions of Ready/Done, planning evidence, stand-ups, formal feedback gates, issue-specific validation records and milestone evidence. The incomplete Sprint 3 close-out and several still-open evidence gates keep me from 15/15. |
| **TOTAL** | **100%** | **85.5/100** | **Advanced-range** | Strong technical project; remaining losses are primarily evidence/closure rather than missing architecture. |

### What is holding you back most

The mark is no longer primarily threatened by missing implementation. The largest risks are **unfinished Sprint 3 evidence**.

Your Sprint 3 user-testing summary currently exposes the biggest weakness because it literally records several planned areas as **“Not started.”** A marker seeing that table can reasonably place User Feedback in Intermediate even though your testing framework itself is excellent.

Performance has a similar issue: your documentation is commendably explicit that the current performance figures are local and that deployed acceptance remains pending. That honesty is correct engineering practice, but you need the **live #565 run** before the evidence supports the rubric's “No performance issues” wording.

The documentation category is already strong, but it needs a final **Sprint 3 requirements/rubric traceability + close-out document** rather than leaving the marker to assemble the argument from individual issue records.

### Realistic mark after closing Sprint 3 properly

If by **29 September** you complete the outstanding representative user-testing gates that are genuinely testable, implement/retest the important accepted findings, run #565 in deployment, finish #613 Sprint 3 traceability/close-out, and turn today's two client findings into implemented + tested + documented evidence, I would expect the evidence to support approximately:

| Criterion | Current | Reachable by 29 Sep |
|---|---:|---:|
| User Feedback | 6.5 | **9-10** |
| Automated Testing | 9 | **9-10** |
| Feature Implementation | 17.5 | **18-19** |
| API Implementation | 18.5 | **18-20** |
| Performance | 3 | **4.5-5** |
| Improvement | 4.5 | **5** |
| Documentation | 13.5 | **14-15** |
| Methodology | 13 | **14-15** |
| **Total** | **85.5** | **90-95 range supportable** |

The **highest-value work now is not another large feature**. It is completing user testing, deployed performance acceptance, fixing/retesting the accepted feedback, and producing the Sprint 3 close-out evidence. That aligns directly with the brief's description of Sprint 3 as a **near-complete product that has gone through reviews and is being evaluated qualitatively**, rather than a period for uncontrolled feature expansion. `project_briefs (6).pdf`

I would therefore treat **85.5% as the “submitted today” estimate**, with **90%+ realistically defensible** if the evidence gaps are closed before Tuesday.

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)