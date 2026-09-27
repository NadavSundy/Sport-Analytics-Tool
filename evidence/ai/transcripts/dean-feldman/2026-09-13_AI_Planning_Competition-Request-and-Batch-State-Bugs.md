# Write competition request bug

**User:** Anonymous  
**Created:** 9/13/2026 9:58:23  
**Updated:** 9/13/2026 10:10:45  
**Exported:** 9/14/2026 15:17:38  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6aa6579e-a800-83e9-adc0-3108c9c98e49](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3/c/6aa6579e-a800-83e9-adc0-3108c9c98e49)  

## Prompt:
9/13/2026, 9:58:54 AM

![3374c48f-69a7-4597-b00f-bd8292c59edf.png](https://chatgpt.com/backend-api/estuary/content?id=file_000000004bfc8211a3239c958950737a&ts=497053&p=fs&cid=1&sig=31218b049c707c5351bc73600de300c4cbe6653008bca79775b14c3c554e8368&v=0)

make this a bug - to make **Request additional competition** a pop up that will show the drop dwon only when clicked, not shwoing all the time

## Response:
9/13/2026, 9:58:59 AM

```md
# Make “Request additional competition” an on-demand modal

## Summary

The **Account → Submitter access** section currently displays the **Additional competition** dropdown permanently.

This adds unnecessary UI clutter and makes the competition-request controls appear active even when the submitter is not trying to request additional access.

The **Request additional competition** action should instead open a modal/dialog containing the competition selector and request action.

## Current Behaviour

On the Account page:

- The **Additional competition** dropdown is always visible.
- The explanatory text is always visible.
- The **Request additional competition** button appears below the dropdown.
- Users see the entire request workflow even when they only want to view their current competition scope or submit events.

## Expected Behaviour

The default **Submitter access** view should display:

- the user's current competition scope;
- a **Request additional competition** button;
- the existing **Submit events** action.

The additional-competition selector should **not** be visible initially.

When the user clicks **Request additional competition**:

1. Open an accessible modal/dialog.
2. Display the **Additional competition** dropdown inside the modal.
3. Display the explanatory text that approval is required.
4. Provide a clear **Request competition** confirmation action.
5. Provide a **Cancel/Close** action.
6. On successful submission:
   - close the modal;
   - display the existing success feedback/state;
   - refresh/update any relevant request state.
7. On failure:
   - keep the modal open;
   - display the existing API error in an accessible manner.

## Acceptance Criteria

- [ ] The competition dropdown is hidden when the Account page initially loads.
- [ ] **Request additional competition** is visible as the entry point to the workflow.
- [ ] Clicking the button opens a modal/dialog containing the competition dropdown.
- [ ] The modal only lists competitions that the submitter can validly request.
- [ ] The user can cancel or close the modal without submitting a request.
- [ ] A competition cannot be requested without selecting a valid option.
- [ ] Successful requests use the existing backend/API workflow and do not introduce a new API endpoint solely for the modal.
- [ ] Existing pending/duplicate-request protections continue to work.
- [ ] API failures are surfaced to the user without closing the modal.
- [ ] Keyboard users can open, navigate, submit, and close the dialog.
- [ ] Focus moves into the dialog when opened and returns to the trigger when closed.
- [ ] The dialog has an accessible name and appropriate modal semantics.
- [ ] Existing **Submit events** functionality is unaffected.
- [ ] Frontend component tests cover opening, closing, validation, successful submission, and error handling.
- [ ] Relevant E2E tests are updated to use the modal-based workflow.

## Scope

Frontend UX change only unless implementation exposes an existing backend defect.

The current submitter-access API and administrator approval workflow should remain unchanged.

## Suggested Classification

**Type:** Bug / UX  
**Area:** Frontend / Submitter Access / Account  
**Priority:** Medium  
**Milestone:** Sprint 2 / Milestone 2
```

Suggested issue title:

**`fix(frontend): move additional competition request into modal`**

This is also a worthwhile Sprint 2 UX fix because the rubric explicitly values integrated user feedback and continuous bug tracking. `project_briefs (4).pdf`

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
9/13/2026, 10:10:14 AM

Repeat another bug for me. When you submit a batch, you hit submit, the submit button doesn't disappear. And then when you go to review your batch, it doesn't show until you refresh the page. So we need a bug for that for both of those. One bug for both.

## Response:
9/13/2026, 10:10:23 AM

```md
# Batch submission state does not update without manual refresh

## Summary

After submitting a batch, the frontend does not correctly update the submission state.

Two related UI problems occur after a successful batch submission:

1. The **Submit** button remains visible/enabled after the batch has been submitted.
2. When navigating to review the submitted batch, the newly submitted batch does not appear until the page is manually refreshed.

These behaviours make it unclear whether the submission succeeded and prevent users from immediately continuing into the review workflow.

## Current Behaviour

### Submission

After a user successfully submits a batch:

- the **Submit** button remains visible;
- the interface does not clearly transition into a submitted state;
- the user may believe the submission did not succeed;
- the user could potentially attempt to submit the same batch again.

### Review

After the successful submission:

- navigating to the batch review/list view does not show the newly submitted batch;
- the page appears to contain stale data;
- manually refreshing the browser causes the batch to appear.

## Expected Behaviour

After a successful batch submission:

1. The submission UI should immediately transition into its completed/submitted state.
2. The **Submit** button should no longer be available for that submitted batch.
3. Relevant frontend submission/query state should be invalidated or refreshed.
4. Navigating to the review page should immediately show the newly submitted batch without requiring a browser refresh.
5. The user should be able to continue directly from submission into the review workflow.

## Acceptance Criteria

- [ ] After a successful batch submission, the **Submit** button is removed or otherwise replaced by the appropriate submitted state.
- [ ] A successfully submitted batch cannot be accidentally submitted again from the same UI state.
- [ ] The UI clearly indicates that submission completed successfully.
- [ ] Submission-related client state is refreshed or invalidated after the API confirms success.
- [ ] The batch review/list view displays the newly submitted batch immediately after navigation.
- [ ] A manual browser refresh is not required for the submitted batch to appear.
- [ ] Existing filters, pagination, and review permissions continue to work correctly.
- [ ] Failed submissions do not transition the UI into a successful/submitted state.
- [ ] Frontend tests verify that the Submit action disappears/changes after successful submission.
- [ ] Frontend tests verify that the newly submitted batch becomes visible in the review workflow without a page refresh.
- [ ] Relevant E2E coverage exercises the complete submit → review navigation flow.

## Investigation Notes

The two symptoms may share the same underlying cause: stale frontend/query state following successful submission.

Implementation should check whether the submission mutation currently fails to:

- update local batch state;
- invalidate/refetch submission queries;
- invalidate/refetch reviewer queue queries; or
- update navigation-loader/cache state after the mutation succeeds.

The fix should prefer proper state/query invalidation over forcing a full browser reload.

## Scope

Frontend submission and review state synchronisation.

Backend changes should only be introduced if investigation shows that the submission API response does not provide sufficient information for the frontend to transition correctly.

## Suggested Classification

**Type:** Bug  
**Area:** Frontend / Batch Submission / Batch Review  
**Priority:** High  
**Milestone:** Sprint 2 / Milestone 2
```

Suggested issue title:

**`fix(frontend): refresh batch state after submission and remove stale submit action`**

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)