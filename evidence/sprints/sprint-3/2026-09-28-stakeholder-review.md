# Sprint 3 Asynchronous Stakeholder Review — 22–24 September 2026

**Sprint:** Sprint 3
**Interaction:** WhatsApp asynchronous review
**Request sent:** 22 September 2026
**Stakeholder response:** 24 September 2026

## Context

The normal stakeholder check-in on 22 September could not take place in its usual slot because the
team had a test. The team therefore asked to conduct the Sprint 3 stakeholder review asynchronously
through WhatsApp.

The message supplied the deployed product and API Explorer links and summarised the principal changes
since the previous Tuesday:

- fuller fixture/statistics experience, including clearer summaries, scorecards, leaders and
  powerplay analytics;
- public API Explorer for external analysts;
- submission/review-flow improvements, including proposing genuinely new fixtures; and
- multi-season back-catalogue support, explicitly described as still being validated against real
  source data.

The team deliberately asked only two low-effort questions:

1. whether anything important was still missing, unclear or difficult to find in the product/API;
2. which one improvement the stakeholder would prioritise before Sprint 3 closed.

## Stakeholder Feedback

The stakeholder replied on 24 September that, from what they had seen:

- they did **not** identify an important missing product/API capability;
- they considered the API feature set broadly sufficient for what an API user would want; and
- they did **not** identify a major change that had to be made before Sprint 3 closed.

They raised two minor UX observations:

### Pagination / current-position clarity

In seasons/players views, the stakeholder found that pagination did not clearly indicate the current
page/position in the same way as the fixtures view. Their example was the absence of a visible cue
such as `page 1 of 200`.

### API Explorer loading/rendering feedback

The stakeholder observed that parts of the API Explorer could render before the rest of the page.
For the first few seconds, sections lower on the page could appear absent, with no visible spinner or
other indication that more content was still loading.

They suggested adding a loading spinner / loading indication for the API Explorer.

## Close-Out Treatment

The stakeholder feedback is retained as evidence of qualitative Sprint 3 review.

The two UX observations are minor follow-up feedback. This record does **not** claim that either was
implemented unless a linked Gitea issue / Pull Request provides that evidence. If they remain open at
the milestone boundary, they should be considered during final-submission polish rather than being
silently omitted.

The stakeholder's statement that they did not identify a major missing capability is a stakeholder
opinion based on what they reviewed. It is **not** used to override failed acceptance tests, open
bugs, open user-feedback gates, or the project's own Definition of Done.

## Evidence

Retained screenshots:

- `2026-09-22 Asynch Stakeholder meeting/2026-09-22 student message.jpeg`
- `2026-09-22 Asynch Stakeholder meeting/2026-09-24 stakeholder response.jpeg`

## AI Declaration

The preceding stakeholder review summary was planned, generated, reviewed and edited with the
assistance of ChatGPT-Web[GPT-5.6 Sol].
