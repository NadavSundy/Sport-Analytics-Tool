# User Testing Task Bank

> **User-testing trail:** [Overview](user-testing-overview.md) -> [Protocol](user-testing-protocol.md) -> **Task Bank**

This document contains representative tasks for formal user-testing sessions.

The facilitator should select only the tasks needed for the workflow being evaluated. Tasks are intentionally independent: each Task ID receives its own outcome and may produce its own findings.

Tasks describe user goals rather than interface instructions.

## Suggested Sprint 2 task sets

| Execution issue | Primary task groups                                      | Purpose                                                                                |
| --------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| #416            | `PUB-*`, optional `AUTH-04`                              | Public browsing, statistics, export, API discovery and public access after sign-out    |
| #417            | `AUTH-01`, `AUTH-02`, `SUB-*`, `BAT-*`, `COR-*`          | Authentication, submission, batch ingestion, failure recovery and correction           |
| #418            | `AUTH-01`, `AUTH-02`, `REV-*`, `ADM-*`, selected `COR-*` | Authentication, review, reference resolution, publication decisions and administration |

Do not make one participant complete every task. A focused session of related tasks is preferable to one long end-to-end session where individual usability problems become difficult to attribute.

Before running a prepared-data task, use `testing/user-testing/FACILITATOR_SETUP.md`. Reusable reference and validation inputs are documented under `testing/user-testing/`, but environment-specific successful submissions, publication decisions and corrections must use disposable or explicitly approved test data.

---

# Authentication / Account Journey

## AUTH-01 — Sign In or Sign Up

You need to use an account-only feature of the platform.

Starting from the public application, sign in using the project test identity supplied by the facilitator and determine when the application considers you signed in.

### Observe

- Discoverability of the login/sign-up entry point.
- Whether the Google/Supabase authentication hand-off is understandable.
- Whether the participant understands when authentication has completed.
- Recovery behaviour if authentication is cancelled or fails.

---

## AUTH-02 — Understand Submission Access

Using the signed-in account, determine what access the account currently has and whether it can submit cricket data.

If the supplied scenario uses a viewer account, explain what you would do to request submitter access.

### Observe

- Whether account role/access state is understandable.
- Whether competition-scoped submission access is clear.
- Discoverability of the request-access path where applicable.
- Whether pending/approved/rejected/revoked states communicate the next action.

---

## AUTH-03 — Find the Account-Deletion Boundary

You want to understand how to permanently remove your account.

Find the account-deletion control and explain what you believe will happen. Stop before the irreversible confirmation unless the facilitator has explicitly supplied a disposable account for destructive testing.

### Observe

- Discoverability of account deletion.
- Whether the destructive nature of the action is clear.
- Whether confirmation wording and consequences are understandable.
- Whether the participant can distinguish signing out from deleting the account.

---

## AUTH-04 — Sign Out and Continue Public Browsing

Sign out of the account and then continue using the public cricket-data experience.

### Observe

- Discoverability and clarity of sign-out.
- Whether the participant understands that the private session has ended.
- Whether public browsing remains understandable after sign-out.
- Any stale authenticated controls or confusing account state.

---

# Public / Analyst Journey

## PUB-01 — Discover Data

You are interested in analysing cricket data.

Starting from the application, find a fixture that interests you and show the information available about it.

### Observe

- Can the participant identify where fixtures are available?
- Do they understand the information displayed?
- Do they know where to continue for more detail?

---

## PUB-02 — Find Statistics

Choose a fixture and find useful statistics about its players or teams.

Explain what you believe the information is showing you.

### Observe

- Discoverability of statistics.
- Whether labels make sense.
- Whether derived data is understandable.
- Navigation difficulties.

---

## PUB-03 — Narrow the Data

You are only interested in a particular part of the available fixture/statistical information.

Narrow the information to the part relevant to your analysis.

### Observe

- Discoverability of available filtering/narrowing controls.
- Whether the selected scope is obvious.
- Whether the participant understands the resulting data.

---

## PUB-04 — Export Data

You want to continue analysing the fixture data using another tool.

Find a way to obtain the relevant event data for use outside the application.

### Observe

- Discoverability of export functionality.
- Understanding of CSV/JSON choices.
- Whether the downloaded result matches the participant's expectation.
- Whether the current filter/scope is reflected in the export where applicable.

---

## PUB-05 — API Discovery

You are building another application and want to use the Sport Analytics Tool's data.

Find enough information to determine how you would begin accessing the API.

### Observe

- Ability to find API documentation.
- Whether the API's purpose is understandable.
- Whether examples and endpoint information are sufficient.

---

# Submitter — Direct Submission

## SUB-01 — Access Submitter Functionality

You have been approved to contribute cricket data to the platform.

Using the provided test account, find where you would submit data.

### Observe

- Whether the participant understands their role.
- Discoverability of submission functionality.
- Authentication/navigation problems.

---

## SUB-02 — Valid Single-Fixture Package

You have been given a completed single-fixture package for the selected fixture.

Upload it and determine whether the platform has safely received it and what you should do next.

### Observe

- Whether the guided single-fixture workflow is understandable.
- Whether fixture/package matching is clear.
- Whether the durable receipt is communicated clearly.
- Whether the participant understands that processing can continue after upload.

---

## SUB-03 — Invalid Single-Fixture Package

You have been given another single-fixture package, but this one contains a problem.

Attempt to submit it and determine what needs to be corrected.

### Observe

- Whether rejection is obvious.
- Quality of file, row and field validation messages.
- Whether the participant understands what is wrong.
- Whether the participant knows what to do next.

---

## SUB-04 — Recover From Package Validation Failure

Using the information provided by the system after the failed single-fixture upload, determine how you would correct the problem and try again.

### Observe

- Whether error information is actionable.
- Whether corrected replacement/resubmission is intuitive.
- Whether unchanged retry/idempotency guidance is understandable where shown.
- Whether previous failure state creates confusion.

---

## SUB-05 — Use Advanced Technical JSON

You have event data in the platform's canonical delivery schema and already know the fixture it belongs to.

Find the advanced submission option, submit the supplied event array and explain the result.

### Observe

- Discoverability of the advanced mode without confusing it with the guided package path.
- Whether the participant understands that only the `events` array is pasted.
- Whether fixture selection and schema guidance are clear.
- Whether accepted, conflicting or rejected behaviour is understandable.

---

## SUB-06 — Understand Advanced Validation Errors

The facilitator will provide an advanced event array containing one or more deliberate cricket-data errors.

Attempt the submission and explain what would need to change before you tried again.

### Observe

- Whether event/field validation identifies the actual problem.
- Whether multiple independent problems can be distinguished where supplied.
- Whether the participant knows which event needs correction.
- Whether the participant understands how to retry after editing the data.

---

# Submitter — Batch Ingestion

## BAT-01 — Upload a Season Package

You have been given a package containing a season of cricket data for a competition you are authorised to submit for.

Upload the package and determine whether the platform has safely received it for processing.

### Observe

- Discoverability of season/back-catalogue upload within the submission experience.
- Understanding of competition/season context.
- File/template guidance.
- Whether the durable batch reference and next step are clear.

---

## BAT-02 — Upload a Back Catalogue

You have been given a package containing historical data spanning more than one season.

Work out how to submit it without being given database IDs or an internal schema walkthrough.

### Observe

- Whether the participant can distinguish season and back-catalogue scope.
- Whether readable references and package guidance are sufficient.
- Whether terminology is understandable without internal database knowledge.

---

## BAT-03 — Find Batch Progress and Results

A package has already been uploaded and you want to know what happened to it.

Find the batch and explain its current state, including what was accepted or rejected.

### Observe

- Discoverability of batch reports.
- Understanding of lifecycle/status wording.
- Whether accepted/rejected counts and item results make sense.
- Whether the participant knows whether processing is finished or still continuing.

---

## BAT-04 — Understand a Failed or Correction-Required Batch

The facilitator will give you a batch containing rejected data or a reviewer correction request.

Use the report to explain what went wrong and what you would do next.

### Observe

- Whether error groups and item-level errors are actionable.
- Whether the participant can identify the affected source item.
- Whether the difference between retrying unchanged content and submitting a corrected replacement is understandable.
- Whether the participant can work out the recovery path without coaching.

---

## BAT-05 — Download a Complete Batch Report

You need to keep or inspect the full result outside the web interface.

Find a way to obtain the complete batch report.

### Observe

- Discoverability of report download.
- Whether the participant understands what the report contains.
- Whether downloaded information matches what they expected from the on-screen report.

---

# Correction Journey

## COR-01 — Correct Previously Published Event Data

You discover that previously supplied event information is incorrect.

Find how you would correct that information and determine what the system says will happen next.

### Observe

- Discoverability of correction controls.
- Whether the participant understands the effect of the correction.
- Whether confirmation/history information is clear.
- Whether the participant expects dependent statistics to update.

---

# Reviewer Journey

## REV-01 — Find Work Awaiting Review

Using the provided reviewer account, find a staged batch that is waiting for a decision.

### Observe

- Discoverability of the review workspace.
- Whether the queue's scope and status are understandable.
- Whether the participant knows which batch to inspect.

---

## REV-02 — Evaluate a Staged Batch

Open the supplied staged batch and decide whether you have enough information to make a review decision.

Explain what the validation, rejection and reference information is telling you.

### Observe

- Understanding of validation summary and fixture/item information.
- Whether blocking problems are clear.
- Whether source/provenance information is sufficient.
- Whether the participant can distinguish valid, rejected and unresolved content.

---

## REV-03 — Resolve an Ambiguous Reference

The facilitator will provide a staged batch containing a reference that needs reviewer attention.

Resolve the reference using the information available in the review workspace.

### Observe

- Discoverability of candidate mappings.
- Confidence that the selected candidate is correct.
- Feedback after saving a mapping.
- Whether the participant knows when the batch becomes eligible for approval.

---

## REV-04 — Approve and Publish

The facilitator will provide a batch that has passed the checks required for publication.

Review it and approve it when you are satisfied that publication is appropriate.

### Observe

- Confidence before publishing.
- Clarity of the reason/confirmation step.
- Whether the participant understands that approval changes public state.
- Feedback after the decision.

---

## REV-05 — Return or Reject

The facilitator will provide a scenario where a batch should not be published as-is.

Choose the appropriate action and explain why you selected it.

### Observe

- Whether the participant understands the difference between return-for-correction and rejection.
- Whether reason entry is clear.
- Confidence before committing the decision.
- Feedback after the decision.

---

# Administrator Journey

## ADM-01 — Review Submitter Access

Where access-request functionality is available:

A user has requested permission to submit data.

Review the request and decide what action to take using the scenario supplied by the facilitator.

### Observe

- Discoverability of pending requests.
- Whether available information supports the decision.
- Clarity of approval/rejection controls and competition scope.

---

## ADM-02 — Trace Submitted Data

Find a submitted fixture or batch and determine who supplied it and what information can be traced back to the submission.

### Observe

- Discoverability of provenance/audit information available to the role.
- Whether the relationship between submission, events and statistics is understandable.
- Navigation or permission problems.

---

# Facilitator Rules

The facilitator may:

- repeat the task;
- explain unfamiliar cricket/domain terminology contained in the task;
- resolve an environmental problem unrelated to the product.

The facilitator must not:

- point to the correct control;
- tell the participant where to navigate;
- explain the intended workflow while the task is active;
- turn a failed task into a success by coaching the participant.

If assistance is necessary, record exactly what assistance was given and mark the individual task Partial or Failure as appropriate.

---

## AI Declaration

The preceding document was reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
