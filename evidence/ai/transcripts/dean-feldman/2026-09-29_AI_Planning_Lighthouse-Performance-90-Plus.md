# Improve Lighthouse Performance

**User:** Anonymous  
**Created:** 9/29/2026 16:37:07  
**Updated:** 9/29/2026 16:38:38  
**Exported:** 10/4/2026 21:34:16  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3-sdp/c/6abbcd12-5db0-83ea-8d07-efd8af9f2882](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3-sdp/c/6abbcd12-5db0-83ea-8d07-efd8af9f2882)  

## Prompt:
9/29/2026, 4:37:04 PM

k sprint 3 has concluded

biggest thing now is our page performance using lighthouse on chrome

please make an issue for me to do and complete to improve the perfomance and get it over 90

## Response:
9/29/2026, 4:37:11 PM · gpt-5-6-thinking

> **Defining the performance issue**
>
> I’m turning the brief’s performance requirements into a ready-to-file engineering issue, focusing on Lighthouse scores above 90, faster page loads, responsive interactions, measurable API improvements, and regression checks before submission.
>
> **Defined the performance issue**
>
> 
>
> Worked for 25s

### Issue title

**Performance: Improve Lighthouse scores to 90+ across key application pages**

```md
## Summary

Improve frontend performance across the deployed StatsTheGame application so that key user-facing pages consistently achieve a **Lighthouse Performance score of at least 90** in Google Chrome.

This work should focus on measurable improvements to page load time, rendering performance, JavaScript delivery, assets, and runtime responsiveness without reducing functionality, accessibility, or reliability.

This directly supports the final submission rubric, which evaluates application performance based on **load time and responsiveness to user input**. `project_briefs (6).pdf`

## Motivation

Sprint 3 has concluded and the project is now in final stabilisation before the **11 October 2026 submission**. `project_briefs (6).pdf`

Performance is specifically assessed in the final project rubric and is worth **5% of the App category**. `project_briefs (6).pdf`

The Sprint 3 rubric also defines the strongest performance outcome as having **no performance issues**. `project_briefs (6).pdf`

## Current Problem

Chrome Lighthouse currently reports performance scores below the desired standard on one or more application pages.

Potential causes may include:

- Large initial JavaScript bundles
- Components loaded before they are needed
- Expensive React renders
- Large or unoptimised images/assets
- Unnecessary API requests during initial page load
- Render-blocking resources
- Poor caching behaviour
- Large third-party dependencies
- Layout shifts during loading
- Slow Largest Contentful Paint (LCP)
- Long main-thread tasks affecting Total Blocking Time / Interaction to Next Paint
- Missing route-level code splitting

The actual bottlenecks must be identified from Lighthouse evidence before optimisations are applied.

## Scope

### 1. Establish performance baseline

Run Lighthouse against the **production build/deployed application**, not the Vite development server.

Record results for the major user journeys, including at minimum:

- Landing/home page
- Competition/fixture browsing
- Fixture/statistics page
- Authentication entry page
- Authenticated dashboard
- Submission workflow
- Reviewer/admin workflow where practical

For each tested page record:

- Performance score
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Total Blocking Time (TBT)
- Cumulative Layout Shift (CLS)
- Speed Index
- Lighthouse opportunities/diagnostics

Use **3 Lighthouse runs per route** and record the median result to reduce noise.

### 2. Analyse bundle and loading behaviour

Investigate:

- Initial JS bundle size
- Large chunks
- Duplicate dependencies
- Unused JavaScript
- Unused CSS
- Eagerly imported routes/features
- Third-party package cost
- Asset sizes
- Fonts
- API calls occurring during first render

Use bundle analysis where useful to determine which dependencies/chunks contribute most to initial load cost.

### 3. Implement targeted performance improvements

Apply improvements supported by profiling evidence.

Potential optimisations include:

- Route-level lazy loading
- `React.lazy` / dynamic imports for non-critical features
- Splitting large feature bundles
- Deferring admin/reviewer functionality from normal-user bundles
- Removing unused dependencies/code
- Reducing unnecessary React re-renders
- Memoising expensive calculations where justified
- Preventing duplicate API requests
- Improving query/data caching
- Loading non-critical data after initial render
- Optimising image dimensions and formats
- Lazy-loading below-the-fold images
- Preloading only genuinely critical assets
- Reducing layout shifts
- Improving loading placeholders
- Optimising font loading
- Configuring effective static-asset caching

Do **not** make artificial Lighthouse-only changes that degrade the real application experience.

### 4. Prevent regression

Add appropriate automated safeguards where practical.

Examples:

- Bundle-size threshold/check
- Lighthouse CI or equivalent performance check
- Tests for eliminated duplicate requests
- Regression tests for code-split routes
- Documentation describing how performance should be measured

Performance checks should operate on a production build.

### 5. Document evidence

Add performance evidence showing:

| Page / Journey | Before | After | Target |
| :--- | :---: | :---: | :---: |
| Home | Record baseline | Record result | ≥ 90 |
| Competition / Fixtures | Record baseline | Record result | ≥ 90 |
| Fixture / Statistics | Record baseline | Record result | ≥ 90 |
| Authentication | Record baseline | Record result | ≥ 90 |
| Authenticated primary workflow | Record baseline | Record result | ≥ 90 |

Include relevant Lighthouse screenshots/reports as issue or repository evidence.

## Acceptance Criteria

- [ ] Lighthouse baseline has been recorded before optimisation.
- [ ] Testing is performed against a production build or deployed production-equivalent environment.
- [ ] Key application pages achieve a **median Lighthouse Performance score ≥ 90 across 3 runs**.
- [ ] No tested key page has a reproducible major performance issue.
- [ ] Major Lighthouse diagnostics have been investigated and either fixed or explicitly justified.
- [ ] Initial JavaScript delivery has been reviewed and unnecessary eager loading removed.
- [ ] Large application features are code-split where this produces a measurable benefit.
- [ ] Images/assets/fonts are appropriately optimised.
- [ ] Duplicate or unnecessary initial API requests have been removed.
- [ ] Optimisations do not break existing application functionality.
- [ ] Existing automated tests continue to pass.
- [ ] Accessibility is not degraded by performance changes.
- [ ] Responsive behaviour is not degraded.
- [ ] Final Lighthouse measurements and before/after evidence are documented.
- [ ] Performance-related implementation decisions are documented where non-obvious.

## Verification Evidence

Attach or link:

- Before Lighthouse reports/screenshots
- After Lighthouse reports/screenshots
- Median scores from 3 runs per tested route
- Relevant bundle analysis output
- Before/after bundle sizes where applicable
- CI output for any new performance checks
- Existing test-suite results
- Production deployment used for final verification

## Out of Scope

This issue is focused on **frontend/application Lighthouse performance**.

Major backend/API load-testing work should be tracked separately because the final rubric assesses API performance independently, including load handling, crashes, and first-request processing time. `project_briefs (6).pdf`

## Definition of Done

The issue is complete when the deployed application's representative key journeys consistently achieve **90+ Lighthouse Performance**, supporting evidence is committed/documented, no material functional/accessibility regressions have been introduced, and the optimisation can be reproduced by another team member.
```

**Suggested labels:** `performance`, `frontend`, `testing`, `final-submission`, `priority-high`

I would make this **high priority for the post-Sprint-3 stabilisation period**: the final brief explicitly gives App Performance 5%, and the project is now inside the 12-day window between Sprint 3 and final submission. `project_briefs (6).pdf`

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)