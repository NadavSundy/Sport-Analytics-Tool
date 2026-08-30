# User Testing Task Bank

This document contains representative tasks for formal user-testing sessions.

The facilitator should select tasks appropriate to the functionality available in the build being tested.

Tasks describe user goals rather than interface instructions.

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

## PUB-03 — Filter Data

You are only interested in a particular part of the available data.

Narrow the information so that it shows the data relevant to your analysis.

### Observe

- Discoverability of filters.
- Whether selected filters are obvious.
- Whether the participant understands the resulting data.

---

## PUB-04 — Export Data

You want to continue analysing this data using another tool.

Find a way to obtain the relevant data for use outside the application.

### Observe

- Discoverability of export functionality.
- Understanding of available formats.
- Whether the downloaded result matches the participant's expectation.

---

## PUB-05 — API Discovery

You are building another application and want to use the Sport Analytics Tool's data.

Find enough information to determine how you would begin accessing the API.

### Observe

- Ability to find API documentation.
- Whether the API's purpose is understandable.
- Whether examples and endpoint information are sufficient.

---

# Submitter Journey

## SUB-01 — Access Submitter Functionality

You have been approved to contribute cricket data to the platform.

Using the provided test account, find where you would submit data.

### Observe

- Whether the participant understands their role.
- Discoverability of submission functionality.
- Authentication/navigation problems.

---

## SUB-02 — Valid Submission

You have been given a valid event-data file for a fixture.

Submit the file and determine whether the platform accepted it.

### Observe

- Whether the upload workflow is understandable.
- Whether success is communicated clearly.
- Whether the participant understands what happens next.

---

## SUB-03 — Invalid Submission

You have been given another event-data file, but this one contains a problem.

Attempt to submit it and determine what needs to be corrected.

### Observe

- Whether rejection is obvious.
- Quality of validation messages.
- Whether the participant understands what is wrong.
- Whether the participant knows what to do next.

---

## SUB-04 — Recover From Validation Failure

Using the information provided by the system after the failed submission, determine how you would correct the problem and try again.

### Observe

- Whether error information is actionable.
- Whether resubmission is intuitive.
- Whether previous failure state creates confusion.

---

## SUB-05 — Correct Published/Event Data

Where correction functionality is available:

You discover that previously supplied event information is incorrect.

Find how you would correct that information.

### Observe

- Discoverability of correction controls.
- Whether the participant understands the effect of the correction.
- Whether confirmation and history information are clear.

---

# Administrator Journey

## ADM-01 — Review Access Request

Where access-request functionality is available:

A user has requested permission to submit data.

Review the request and decide what action to take using the scenario supplied by the facilitator.

### Observe

- Discoverability of pending requests.
- Whether available information supports the decision.
- Clarity of approve/reject controls.

---

## ADM-02 — Inspect Submitted Data

Find a submitted fixture or submission and determine who supplied it and what information was submitted.

### Observe

- Traceability.
- Navigation.
- Understanding of provenance information.

---

## ADM-03 — Correct Data

You have been informed that an event in an existing fixture is incorrect.

Find the appropriate administrative workflow for correcting it.

### Observe

- Discoverability.
- Confidence before committing the correction.
- Feedback after correction.
- Understanding of downstream effects.

---

# Facilitator Rules

The facilitator may:

- repeat the task;
- explain unfamiliar domain terminology contained in the task;
- resolve an environmental problem unrelated to the product.

The facilitator must not:

- point to the correct control;
- tell the participant where to navigate;
- explain the intended workflow while the task is active;
- turn a failed task into a success by coaching the participant.

If assistance is necessary, record exactly what assistance was given and mark the task Partial or Failure as appropriate.

---

## AI Declaration

The preceding document was generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
