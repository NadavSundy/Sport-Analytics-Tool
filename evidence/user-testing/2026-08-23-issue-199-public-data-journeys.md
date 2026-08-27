# Public-data journey usability review

**Date:** 2026-08-23  
**Related issue:** #199  
**Review type:** Structured expert walkthrough of deterministic browser scenarios

## Goal

Review the completed public-data redesign as connected cricket-information tasks and identify any
usability issue that automated pass/fail assertions alone would not explain.

## Reviewer profile and limitations

The walkthrough was performed by the AI-assisted implementation evaluator using the repository's
Playwright scenarios and captured screenshots. No external participant took part, and this record
does not claim human feedback, attendance, or approval. The evaluator had technical familiarity
with the approved information architecture and checked the interface from the perspective of a
public cricket-data visitor.

## Tasks

1. Start at Competitions, open Premier Cricket League, open the 2026 season, and reach the
   Wanderers vs Strikers match result and statistics.
2. Start at Teams, open Wanderers, and reach that team's named fixture and inline statistics.
3. Start at Players, open A Player, compare complete, partial, and unavailable match figures, open
   Wanderers vs Strikers, and inspect the innings calculation trace.
4. Repeat the representative views in Day Match and Night Match at desktop and Pixel 7 sizes using
   keyboard-only journey activation.

## Procedure

- Representative handwritten-API responses were mocked deterministically in Playwright.
- Required links were focused and activated with `Enter`; theme switching and browser Back were not
  counted as information-seeking interactions, matching ADR-007.
- Each representative page was checked for named headings, labels, facts, filters, links, messages,
  technical identifiers or resource terminology, horizontal overflow, and serious or critical Axe
  findings.
- Four full-page screenshots were captured from passing runs and visually inspected for hierarchy,
  clipping, legibility, state clarity, and theme consistency.

## Results and observations

| Task                             | Interactions | Observation                                                                                                                                                               |
| -------------------------------- | -----------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Competition to season to fixture |            3 | The competition and season context remained visible, and match result, innings totals, player statistics, and participating player were available without another action. |
| Team to fixture                  |            2 | The named team overview exposed its fixture and player; the fixture reopened the same complete match view.                                                                |
| Player to match statistics       |            2 | Complete, partial, missing-discipline, and no-statistics states were distinguishable before opening the named match.                                                      |
| Player to calculation trace      |            3 | The inline result led to a secondary trace showing the named innings, delivery, striker, bowler, and related records.                                                     |

Additional observations:

- Desktop Day Match preserved a clear scorecard hierarchy and readable relationship links.
- Mobile Night Match stacked facts and metric groups without unintended horizontal overflow.
- Partial data used text, border treatment, and a notice; it did not rely on colour alone.
- The mobile player history is long, but its headings and card boundaries preserve scanning, and
  collapsing the required figures would add interactions.
- After keyboard navigation to the mobile calculation trace, the captured focus state made the
  shell skip link visible over the current viewport. The journey remained operable and Axe reported
  no serious or critical finding, but explicit route-transition focus and announcement deserves a
  separate accessibility review.

## Feedback themes

- Keep readable cricket names as the link identity and leave opaque identifiers in routes only.
- Keep primary statistics inline on fixture and player overviews.
- Preserve explicit partial and unavailable-data wording.
- Consider a dedicated route-focus/announcement pattern as separate follow-up work.

## Accepted and rejected changes

| Feedback                                                                        | Decision              | Motivation                                                                                                                                                          |
| ------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Verify complete journeys rather than isolated headings                          | Accepted in #199      | The adapted browser tests now assert the full information outcome and counted activations.                                                                          |
| Add explicit waits for the Teams entry page before continuing its keyboard task | Accepted in #199      | The first mobile run exposed a test race; waiting for the URL and heading verifies the actual navigation boundary rather than weakening the assertion.              |
| Collapse player match figures to shorten the mobile page                        | Rejected              | The figures are required immediately, the current page reflows without clipping, and a disclosure would add a purposeful interaction.                               |
| Change production route focus management in this verification issue             | Deferred as follow-up | It affects shared shell/router behavior and needs separate requirements and regression coverage; implementing it here would exceed issue #199's verification scope. |

## Retesting

After the navigation-boundary wait was added, all eight focused desktop/mobile public-browsing and
player-overview cases passed. Screenshot capture reran the same eight cases successfully. Each
representative Day/Night view had no serious or critical Axe findings and no horizontal overflow.

## Follow-up work not implemented

Propose a separate accessibility issue to evaluate and standardise focus placement and route-change
announcements after client-side public navigation. No production feature was added under #199.

## Evidence

- [Interaction matrix and automated results](../validation/issue-199-public-data-journeys.md)
- [Competition journey, desktop Day Match](../validation/issue-199-competition-journey-desktop-day.png)
- [Competition journey, mobile Night Match](../validation/issue-199-competition-journey-mobile-night.png)
- [Player journey, desktop Day Match](../validation/issue-199-player-journey-desktop-day.png)
- [Player journey trace, mobile Night Match](../validation/issue-199-player-journey-mobile-night.png)

## AI Declaration

This structured usability record was generated from the executed browser walkthrough and inspected
screenshots with the assistance of Codex[GPT-5.6 Sol].
