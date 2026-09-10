# Sprint 2 Stakeholder Review â€” Asynchronous Interaction

**Date:** 8 September 2026
**Stakeholder:** Terence Nkoua Mackyta
**Team:** Git Push Pray
**Sprint:** Sprint 2
**Interaction type:** Asynchronous stakeholder review via WhatsApp
**Status:** Feedback received and evaluated

## Purpose

The normal in-person stakeholder review could not take place during study break because some team members were unavailable. Rather than skip the Sprint 2 stakeholder checkpoint, the team sent an asynchronous review pack so the stakeholder could inspect the deployed product and test selected submission and validation behaviour.

The review focused on:

- submission and validation of event data;
- safety of already-published match data;
- clarity and usefulness of validation/rejection messages;
- derived match information and traceability; and
- the overall upload â†’ validate â†’ review â†’ publish workflow.

## Material supplied

At 14:41â€“14:50 on 8 September 2026, the team sent the stakeholder:

- the deployed frontend URL;
- a one-page Sprint 2 stakeholder review guide;
- a test account with submission access (credentials supplied separately and not recorded in repository evidence);
- `README_FIRST.txt` explaining the test pack;
- `01_REFERENCE_fixture-5-accepted-events.json` as reference-only data;
- `03_INVALID_runs-total.json` containing a deliberate run-total validation error;
- `05_INVALID_two-errors.csv` containing two independent invalid rows; and
- `fixture-5-events.json` for submission testing.

The review guide explicitly asked for feedback on whether rejection/error messages were actionable, whether the league workflow made sense, and what should be changed or prioritised before Sprint 2 closed.

## Stakeholder activity and feedback

At 17:49 on 8 September 2026, the stakeholder confirmed that they had opened the deployed website and attempted submissions using:

- `fixture-5-events.json`;
- `03_INVALID_runs-total.json`; and
- `05_INVALID_two-errors.csv`.

They also correctly recognised that `01_REFERENCE_fixture-5-accepted-events.json` was reference-only and should not be submitted.

The stakeholder's feedback was positive and specific:

- the error messages were clear enough to act on;
- identifying the fields containing issues was helpful; and
- the deployed website was viewed as solid overall.

## Evaluation of the feedback

This interaction provides direct stakeholder confirmation that the current submission/validation error experience is understandable and actionable. In particular, the stakeholder valued field-level identification of validation problems, which supports retaining the current error-detail approach.

The interaction also demonstrates that the stakeholder could use the deployed system and supplied test pack independently, rather than only observing a team-led demonstration.

The feedback did **not** explicitly confirm every part of the wider upload â†’ validate â†’ review â†’ publish workflow, nor did it give detailed feedback on reviewer actions or final publication behaviour. Those areas therefore remain appropriate targets for the Sprint 2 closeout or the next stakeholder review.

## Integration / follow-up

Based on this feedback:

1. **Keep the current field-level validation/rejection presentation.** No redesign is required from this stakeholder review.
2. **Do not create a new UX defect solely from this interaction.** No blocking issue was reported by the stakeholder.
3. **Carry forward review/publication confirmation.** Explicitly test or demonstrate the reviewer and publication parts of the workflow in the next stakeholder interaction if they are not covered before Sprint 2 closes.
4. **Reference this evidence in Sprint 2 closeout/traceability documentation.** It supports the Sprint 2 Stakeholder Reviews rubric by showing interaction, evaluation, and a documented response to feedback.

## Evidence trail

- WhatsApp interaction: 8 September 2026, 14:41â€“17:49. A redacted transcript is stored alongside this record.
- `Sprint_2_Stakeholder_Review_2026-09-08.pdf` â€” review guide sent to the stakeholder.
- `README_FIRST.txt` and associated JSON/CSV test files â€” stakeholder test pack.

> **Privacy/security note:** The source WhatsApp export contained a test-account password and a phone number. These must not be committed to the repository. Repository evidence should use the redacted transcript only. If the password is still active, rotate it.

## AI Declaration

The preceding document was generated and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
