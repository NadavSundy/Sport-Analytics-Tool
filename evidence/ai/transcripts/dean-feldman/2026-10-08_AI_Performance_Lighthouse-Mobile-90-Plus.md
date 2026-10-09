# Improve Lighthouse Performance

**User:** Anonymous  
**Created:** 10/8/2026 7:44:16  
**Updated:** 10/8/2026 7:45:57  
**Exported:** 10/9/2026 21:43:18  
**Link:** [https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3-sdp/c/6ac72db0-31b0-83ea-b835-5ed45d8f5fea](https://chatgpt.com/g/g-p-6a5e0bd23e64819186e0767b14cff2a3-sdp/c/6ac72db0-31b0-83ea-b835-5ed45d8f5fea)  

## Prompt:
10/8/2026, 7:44:16 AM

Lighthouse Metrics
Measure
Monitoring
API
Enterprise
Pricing
Docs
Sign up
Log in
Global Lighthouse Scores
View Lighthouse scores across the globe

Monitor your Lighthouse scores
Track changes over time with scheduled checks and saved history.

Explore Plans
URL
https://sport-analytics-tool-web.pages.dev/
State
succeeded
Device
Mobile
Version
13.5.0
Request Time
just now
Performance Scores
View Lighthouse Performance scores across all regions

Flag for US West
US West
us-west1
83
/
100
FCP:
2.1s
LCP:
4s
TBT:
0ms
Flag for US East
US East
us-east4
87
/
100
FCP:
1.6s
LCP:
3.8s
TBT:
10ms
Flag for Finland
Finland
europe-north1
85
/
100
FCP:
1.9s
LCP:
4s
TBT:
18ms
Flag for Germany
Germany
europe-west3
85
/
100
FCP:
1.7s
LCP:
4s
TBT:
37ms
Flag for Japan
Japan
asia-northeast1
82
/
100
FCP:
2.1s
LCP:
4.1s
TBT:
0ms
Flag for Australia
Australia
australia-southeast1
83
/
100
FCP:
2.1s
LCP:
4s
TBT:
0ms
Performance Metrics
Inspect each metric that leads to the performance score

Flag for US West
Flag for US East
Flag for Finland
Flag for Germany
Flag for Japan
Flag for Australia
First Contentful Paint
2.1s
1.6s
1.9s
1.7s
2.1s
2.1s
Speed Index
4.1s
1.6s
1.9s
1.7s
4.2s
4.2s
Largest Contentful Paint
4s
3.8s
4s
4s
4.1s
4s
Total Blocking Time
0ms
10ms
18ms
37ms
0ms
0ms
Cumulative Layout Shift
0
0.07
0.04
0.07
0
0
Insights for US West

Flag for US West
US West
Full Lighthouse Report
Regional details about your Lighthouse run

Transferred Assets
Review transferred assets and their size

Total Requests
12
Total Transferred Size
633 kB
Total Resource Size
998 kB
Lighthouse Audits
Review passed and failed audits for each Lighthouse score

83
Performance
Audits that have impact on the performance of your site

Improve image delivery
Reducing the download time of images can improve the perceived load time of the page and LCP. Learn more about optimizing image size

LCP request discovery
Optimize LCP by making the LCP image discoverable from the HTML immediately, and avoiding lazy-loading

Network dependency tree
Avoid chaining critical requests by reducing the length of chains, reducing the download size of resources, or deferring the download of unnecessary resources to improve page load

Render-blocking requests
Requests are blocking the page's initial render, which may delay LCP. Deferring or inlining can move these network requests out of the critical path

Reduce unused CSS
Reduce unused rules from stylesheets and defer CSS not used for above-the-fold content to decrease bytes consumed by network activity. Learn how to reduce unused CSS

Reduce unused JavaScript
Reduce unused JavaScript and defer loading scripts until they are required to decrease bytes consumed by network activity. Learn how to reduce unused JavaScript

First Contentful Paint
First Contentful Paint marks the time at which the first text or image is painted. Learn more about the First Contentful Paint metric

Largest Contentful Paint
Largest Contentful Paint marks the time at which the largest text or image is painted. Learn more about the Largest Contentful Paint metric

Total Blocking Time
Sum of all time periods between FCP and Time to Interactive, when task length exceeded 50ms, expressed in milliseconds. Learn more about the Total Blocking Time metric

Cumulative Layout Shift
Cumulative Layout Shift measures the movement of visible elements within the viewport. Learn more about the Cumulative Layout Shift metric

Speed Index
Speed Index shows how quickly the contents of a page are visibly populated. Learn more about the Speed Index metric

Use efficient cache lifetimes
A long cache lifetime can speed up repeat visits to your page. Learn more about caching

Layout shift culprits
Layout shifts occur when elements move absent any user interaction. Investigate the causes of layout shifts, such as elements being added, removed, or their fonts changing as the page loads

Document request latency
Your first network request is the most important. Reduce its latency by avoiding redirects, ensuring a fast server response, and enabling text compression

Optimize DOM size
A large DOM can increase the duration of style calculations and layout reflows, impacting page responsiveness. A large DOM will also increase memory usage. Learn how to avoid an excessive DOM size

Duplicated JavaScript
Remove large, duplicate JavaScript modules from bundles to reduce unnecessary bytes consumed by network activity

Font display
Consider setting font-display to swap or optional to ensure text is consistently visible. swap can be further optimized to mitigate layout shifts with font metric overrides

Forced reflow
A forced reflow occurs when JavaScript queries geometric properties (such as offsetWidth) after styles have been invalidated by a change to the DOM state. This can result in poor performance. Learn more about forced reflows and possible mitigations

Legacy JavaScript
Polyfills and transforms enable older browsers to use new JavaScript features. However, many aren't necessary for modern browsers. Consider modifying your JavaScript build process to not transpile Baseline features, unless you know you must support older browsers. Learn why most sites can deploy ES6+ code without transpiling

Modern HTTP
HTTP/2 and HTTP/3 offer many benefits over HTTP/1.1, such as multiplexing. Learn more about using modern HTTP

3rd parties
3rd party code can significantly impact load performance. Reduce and defer loading of 3rd party code to prioritize your page's content

Optimize viewport for mobile
Tap interactions may be delayed by up to 300 ms if the viewport is not optimized for mobile

Time to Interactive
Time to Interactive is the amount of time it takes for the page to become fully interactive. Learn more about the Time to Interactive metric

Max Potential First Input Delay
The maximum potential First Input Delay that your users could experience is the duration of the longest task. Learn more about the Maximum Potential First Input Delay metric

Minify CSS
Minifying CSS files can reduce network payload sizes. Learn how to minify CSS

Minify JavaScript
Minifying JavaScript files can reduce payload sizes and script parse time. Learn how to minify JavaScript

Avoids enormous network payloads
Large network payloads cost users real money and are highly correlated with long load times. Learn how to reduce payload sizes

JavaScript execution time
Consider reducing the time spent parsing, compiling, and executing JS. You may find delivering smaller JS payloads helps with this. Learn how to reduce Javascript execution time

Minimizes main-thread work
Consider reducing the time spent parsing, compiling and executing JS. You may find delivering smaller JS payloads helps with this. Learn how to minimize main-thread work

Image elements have explicit width and height
Set an explicit width and height on image elements to reduce layout shifts and improve CLS. Learn how to set image dimensions

Avoid multiple page redirects
Redirects introduce additional delays before the page can be loaded. Learn how to avoid page redirects

Initial server response time was short
Keep the server response time for the main document short because all other requests depend on it. Learn more about the Time to First Byte metric

100
Accessibility
Opportunities to improve the accessibility for your visitors

100
Best Practices
Standards that your site should follow

92
SEO
Checks that ensure your page follows basic search engine advices

2/4
Agentic Browsing
Checks for websites used by AI agents

Acceptable Use
Privacy
Terms
Global Lighthouse Scores | Lighthouse Metrics

## Prompt:
10/8/2026, 7:44:25 AM

make an issue to improve this

## Response:
10/8/2026, 7:44:35 AM · gpt-5-6-thinking

# Issue: Improve Lighthouse Mobile Performance to 90+

```md
# Improve Lighthouse Mobile Performance to 90+

## Summary

The production frontend currently scores approximately **82-87/100 for Lighthouse Mobile Performance** across global regions.

Production URL:
`https://sport-analytics-tool-web.pages.dev/`

Current regional results:

| Region | Performance | FCP | LCP | TBT |
| --- | ---: | ---: | ---: | ---: |
| US West | 83 | 2.1s | 4.0s | 0ms |
| US East | 87 | 1.6s | 3.8s | 10ms |
| Finland | 85 | 1.9s | 4.0s | 18ms |
| Germany | 85 | 1.7s | 4.0s | 37ms |
| Japan | 82 | 2.1s | 4.1s | 0ms |
| Australia | 83 | 2.1s | 4.0s | 0ms |

Accessibility and Best Practices already score **100**, so this issue should improve frontend performance without regressing either category.

Performance is explicitly assessed in the final project rubric based on application load time and responsiveness. `project_briefs (6).pdf`

## Problem

The main bottleneck is **Largest Contentful Paint**, which is consistently around **3.8-4.1 seconds**.

Total Blocking Time is already extremely low, indicating that the primary problem is unlikely to be long-running JavaScript execution. Optimisation should therefore prioritise the critical rendering path, LCP resource delivery, images, CSS and initial bundle/network payload.

Current Lighthouse audits identify:

- Improve image delivery
- Improve LCP request discovery
- Reduce render-blocking requests
- Reduce unused CSS
- Reduce unused JavaScript
- Improve cache lifetimes
- Investigate network dependency chains
- Investigate duplicated JavaScript
- Ensure efficient font loading
- Ensure images have explicit dimensions

Current transfer size is approximately:

- **12 requests**
- **633 kB transferred**
- **998 kB total resources**

## Scope

### 1. Identify the LCP element

Use Chrome DevTools / Lighthouse to determine the exact LCP element on the production landing page.

Document:

- LCP DOM element
- associated asset
- asset size
- request start time
- whether it is lazy-loaded
- whether it is discovered directly from the initial HTML

### 2. Optimise LCP asset delivery

Where applicable:

- Do not lazy-load the above-the-fold LCP image
- Add `fetchpriority="high"` to the critical image
- Preload the LCP asset when justified
- Serve appropriately sized responsive images
- Prefer WebP/AVIF where supported
- Avoid downloading unnecessarily large source images
- Add explicit `width` and `height`

### 3. Reduce initial JavaScript payload

Inspect the production bundle and:

- dynamically import non-critical routes/features
- lazy-load expensive components not required during initial render
- remove duplicate dependencies
- remove unused imports/dependencies
- ensure tree-shaking is working correctly

Do not defer functionality required for the first meaningful page interaction.

### 4. Reduce render-blocking CSS

Investigate CSS included during initial navigation.

Where safe:

- remove unused global CSS
- avoid loading route-specific styles globally
- reduce unnecessarily large stylesheets
- preserve all responsive and accessibility behaviour

### 5. Optimise fonts

Ensure application fonts:

- use `font-display: swap` or an equivalent appropriate strategy
- avoid unnecessary font weights/styles
- are preloaded only when genuinely required above the fold

### 6. Cache immutable static assets

Verify appropriate cache behaviour for fingerprinted production assets such as:

- JavaScript
- CSS
- fonts
- images

Hashed immutable assets should use long-lived browser caching where supported by the Cloudflare Pages deployment.

### 7. Verify critical network path

Use the Lighthouse dependency tree / DevTools Network panel to identify unnecessary critical request chains.

Remove or defer non-essential requests that delay initial rendering.

## Acceptance Criteria

- [ ] Production **Mobile Lighthouse Performance score is ≥ 90**
- [ ] Result is reproduced across at least **3 consecutive Lighthouse runs**
- [ ] LCP improves materially from the current ~4.0s baseline
- [ ] Target **LCP ≤ 2.5s** where achievable under Lighthouse mobile conditions
- [ ] No regression below **95 Accessibility**
- [ ] No regression below **95 Best Practices**
- [ ] No functional regression to authentication or core application flows
- [ ] Responsive desktop/mobile layouts remain correct
- [ ] Existing frontend automated tests pass
- [ ] Frontend lint and typecheck pass
- [ ] Production build passes
- [ ] Performance measurements before and after optimisation are documented

## Verification

Run locally before merging:

```bash
npm run lint --workspace=@sport-analytics/frontend
npm run typecheck --workspace=@sport-analytics/frontend
npm run build --workspace=@sport-analytics/frontend
```

Run the existing frontend/E2E test suites required by CI.

After deployment, rerun Lighthouse against:

```text
https://sport-analytics-tool-web.pages.dev/
```

Capture evidence containing:

### Before

```text
Performance: 82-87
FCP: 1.6-2.1s
LCP: 3.8-4.1s
TBT: 0-37ms
Transferred: ~633 kB
Resources: ~998 kB
```

### After

Record:

```text
Performance:
FCP:
LCP:
TBT:
CLS:
Transferred:
Resources:
```

Attach screenshots or exported Lighthouse reports to the issue/PR.

## Out of Scope

- Large visual redesigns
- Replacing the frontend framework
- Backend/API optimisation unless an API request is proven to block the initial render
- Removing accessibility functionality purely to improve performance
- Hiding Lighthouse warnings without reducing actual load cost

## Definition of Done

The deployed production frontend consistently achieves a **90+ Lighthouse Mobile Performance score**, with evidence showing measurable improvement to LCP and/or initial resource delivery and without regressions to accessibility, responsiveness, functionality, or automated tests.
```

This is worth prioritising before the **11 October final submission**: application performance is explicitly worth **5%** of the final rubric, with load time and input responsiveness assessed directly. `project_briefs (6).pdf` `project_briefs (6).pdf`

**Suggested title:** `perf: improve production Lighthouse mobile score to 90+`

**Suggested branch:** `perf/lighthouse-mobile-90`

Tool: ChatGPT Web | Model: GPT-5.6 Thinking | Purpose: Engineering Architecture/Code Gen | Verification: Reviewed and verified against Wits COMS3011A Brief by Team.

## Prompt:
10/8/2026, 7:45:06 AM

md filee

## Response:
10/8/2026, 7:45:27 AM · gpt-6-thinking

> **Drafting Lighthouse Performance Optimization Issue**
>
>
> **Drafted Lighthouse performance optimization issue**
>
> 
>
> Worked for 35s

<icon name="file-text" color="success" inline /> **Markdown issue file ready**

[Download Lighthouse Mobile Performance Issue (.md)](sandbox:/mnt/data/lighthouse-mobile-performance-90-issue.md)

Includes the Lighthouse results, optimisation tasks, acceptance criteria, testing commands, and the **90+ performance target**.

Ready to add to your Gitea issue tracker.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)