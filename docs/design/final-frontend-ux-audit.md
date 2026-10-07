# Final frontend UX, accessibility and responsiveness audit

**Issue:** #889
**Audit date:** 7 October 2026
**Scope:** final documentation-to-implementation review and a focused public-home performance check.

This is a verification record, not a replacement design specification. The authoritative guidance remains the [brand guidelines](brand-guidelines.md), [component baseline](frontend-component-baseline.md), and [information architecture and wireframes](information-architecture-and-wireframes.md).

## Documentation review

| Acceptance area | Current source of truth | Review outcome |
| --- | --- | --- |
| Information architecture and navigation | Information architecture §§2–3; `PublicShell` and `App.tsx` routes | Current: public, account, submitter and administrator journeys match the routes and role boundaries. |
| Brand and visual guidance | Brand guidelines; `styles.css` semantic Day Match/Night Match tokens | Current: the documented themes, typography, focus treatment, responsive layout and motion rules are represented by the shared stylesheet and shell. |
| Accessibility approach and evidence | Brand guidelines §16; component baseline; browser/accessibility strategy in [CI/CD](../development/ci-cd.md) | Discoverable: semantic controls, visible labels and focus, reduced motion, keyboard navigation, responsive overflow and automated Axe/browser coverage are documented. |
| Responsive support | Brand guidelines §11.4; component baseline shell conventions; responsive Playwright strategy | Current: header tiers, mobile gutters, table overflow and the mobile browser subset are documented as implementation behaviour, not promises of unaudited devices. |
| Role journeys and states | Information architecture §§3–4 | Current: viewer, submitter and administrator journeys describe loading, empty, validation, error and success states where those states apply. |
| Frontend architecture and components | Component baseline; `apps/frontend/src/components/README.md`; `apps/frontend/src/features/README.md` | Current: shared shell/components and feature ownership are documented without claiming that frontend visibility authorizes a request. |

## Corrected performance finding

The public API Explorer route had a route-frame dependency that prevented a cleanly isolated explorer module. The route frame now remains shell-owned and `ApiExplorerPage` exports content only; the shell’s route-loading fallback no longer imports the explorer-local indicator. The API Explorer remains an on-demand route, while its route heading and accessible loading state remain unchanged.

The homepage hero photograph is the local mobile Largest Contentful Paint candidate. It now uses `fetchPriority="high"` so the browser discovers and schedules the above-the-fold image promptly.

## Performance evidence and limitation

Local production-bundle Lighthouse was run on `/` with the repository runner’s mobile profile and three-run median aggregation:

| Measurement | Individual runs | Median Performance | Median LCP | Median TBT | Result |
| --- | --- | ---: | ---: | ---: | --- |
| Before image priority | 74, 76, 82 | 76 | 4363 ms | 276 ms | Strict target not met |
| After image priority | 80, 78, 81 | 80 | 4373 ms | 172 ms | Strict target not met |

The improvement is real for the measured score and blocking time, but it is **not** evidence that the mobile production target (Performance >=90, LCP <=2500 ms, TBT <=200 ms and CLS <=0.1) has been recovered. The local production desktop single run was 99; it is not a deployed or hosted-CI result. The repository’s public-route CI baseline gate remains unchanged: three runs, median aggregation, persisted route/profile floors and fail-closed handling.

## Automated checks run

- `npm.cmd run test --workspace=@sport-analytics/frontend -- ApiExplorerPage.test.tsx` — 7 passed.
- `npm.cmd run test --workspace=@sport-analytics/frontend -- App.test.tsx ApiExplorerPage.test.tsx` — 28 passed (the suite emitted pre-existing jsdom `window.scrollTo` notices but passed).
- `npm.cmd run test --workspace=@sport-analytics/frontend -- HomePage.test.tsx` — 5 passed.
- `npm.cmd run build --workspace=@sport-analytics/frontend` — completed locally.
- Local Lighthouse commands above — public `/` only; no authenticated route was audited.

## AI declaration

This audit and the focused implementation correction were prepared with Codex[GPT-5].
