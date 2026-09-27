# Sprint 3 Asynchronous Scrum — 24 September 2026

**Date:** 24 September 2026
**Format:** Asynchronous WhatsApp scrum
**Sprint:** Sprint 3
**Participants:** Project team

## Context

The team normally uses a synchronous scrum to check progress, identify blockers, and coordinate upcoming work.

On 24 September, conflicting schedules meant that the full team could not meet at the usual time. Rather than cancelling the scrum and losing a project touchpoint close to the Sprint 3 milestone, the team agreed to conduct the check-in asynchronously through the project WhatsApp group.

Each member provided an update covering:

- work completed since the previous check-in;
- work currently in progress;
- planned next steps; and
- blockers or dependencies affecting their work.

This allowed the team to maintain visibility of progress and dependencies despite the scheduling conflict.

## Team updates

### Ben Swartz

Ben reported completing work across statistics correctness, API contract testing, statistics recalculation, and participant onboarding.

Key progress included:

- correcting statistics behaviour around zero-value wides and no-balls;
- tightening extras validation and correcting bowler attribution for byes on wides;
- adding automated checks between the deployed API and API documentation, which exposed several contract/documentation inconsistencies;
- completing statistics recalculation work so that stored statistics can be selectively recalculated for affected players rather than recalculated on every read; and
- resolving a participant-onboarding issue where reviewer-created fixtures were published successfully but were not visible on the site.

Ben was completing deployed verification for the onboarding work before moving onto deployed performance measurements.

A dependency was also raised around an API contract-testing issue that was complete but could not yet be closed because of its relationship to the acceptance-testing work.

### Shayna Unterslak

Shayna reported continued work on the multi-season back-catalogue functionality in issue #589.

Testing of the feature exposed a number of defects originating in other areas of the system. These were logged rather than being treated as part of #589, and several were fixed where necessary to allow testing to continue.

The immediate priority remained testing and closing #589 because other planned work depended on its completion.

Progress during the day had been temporarily limited by access to the development computer, with work intended to resume once the dependent issue #708 was complete.

### Nadav Sundy

Nadav reported continued work on the frontend redesign.

The application flow and navigation had been reworked, together with changes to the submission review page.

The next step was to address frontend defects and feedback identified during testing and feedback sessions.

No blockers were reported.

### Dean Feldman

Dean reported that recent work had concentrated mainly on deployment and infrastructure rather than new feature development.

The team identified a resource-group naming mismatch in the Azure configuration, where some configuration and commands referenced `statsthegame-dev-rg` while the deployed resource group used a different name.

Dean was also working through the `fix/azure-scale-to-zero-cost` branch to reduce hosting costs. Remaining work included resolving merge conflicts and completing deployment verification.

User testing had also been conducted and follow-up issues were created from the findings.

Dean identified #589 as a dependency for some of his outstanding work.

The next steps were to:

- complete and merge the Azure fix;
- redeploy the application;
- verify the complete frontend → API → database/authentication/external API flow;
- confirm that the scale-to-zero configuration behaved as expected; and
- then concentrate the remaining Sprint 3 time on bugs, incomplete features, automated/E2E testing, accessibility, responsiveness, performance, and documentation.

### Gabriel Raz

Gabriel reported work on:

- #515 — bowling extras breakdown;
- #465 — completed batch report loading; and
- #586 — fixture/package validation using valid and invalid test cases.

His next work was planned for:

- #713 — improving account-management navigation; and
- #612 — testing and validating Advanced API consumer capabilities.

No significant blocker was reported.

### Liora Rosenberg

Liora reported work on moving the frontend from Azure App Service to static hosting.

She was working on #566, documenting the Azure hosting and deployment strategy.

The immediate dependency was #565, which #566 relied on and which was not being picked up correctly. Resolving that dependency was required before the documentation issue could be completed.

## Outcomes

The asynchronous scrum provided a useful view of the project's state immediately before the Sprint 3 milestone.

Several cross-team dependencies were visible, particularly around:

- #589 and the functionality depending on multi-season ingestion;
- Azure deployment and infrastructure verification;
- participant-onboarding and acceptance testing;
- frontend feedback and defect resolution; and
- completing verification work before issues could be closed.

The team therefore retained a shared understanding of current priorities despite being unable to hold the scheduled synchronous meeting.

The scrum also reinforced the priority for the remaining Sprint 3 period: complete and verify existing functionality, resolve known defects and dependencies, and focus on testing, performance, accessibility, documentation, and overall product stability rather than introducing unnecessary infrastructure or feature changes.

## Evidence

The scrum was conducted in the team's WhatsApp group. Screenshots of the asynchronous updates are retained as supporting evidence of the interaction.

---

**AI Declaration:** The preceding document was generated and edited with the assistance of ChatGPT Web[GPT-5.6 Sol].
