# Legacy wireframes — historical, superseded

> **Historical evidence only. This is not the final product design.** The current information
> architecture, final wireframes and design-evolution record are in
> [`docs/design/information-architecture-and-wireframes.md`](../../../docs/design/information-architecture-and-wireframes.md)
> (published as _Final Design & Wireframes_ on the documentation site).

These twelve low-fidelity wireframes were drawn in Sprint 1 for issue #56 (commit `88c7b5ee`,
21 August 2026) to agree flow and page states before detailed frontend implementation began. They
guided the first public, sign-in, submitter and administrator pages and are preserved here for
traceability. Issue #894 moved them out of `docs/design/assets/wireframes/` so the published design
documentation shows only the final implemented product.

When archived, each SVG received one addition: a translucent _HISTORICAL · SUPERSEDED_ watermark and
an SVG `<title>` naming issues #56 and #894. The original drawing is otherwise unchanged; the
byte-for-byte originals remain available at commit `88c7b5ee`. The issue #56 information-architecture
text that accompanied these frames is preserved in Git history at commit
[`d7bc587d`](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/commit/d7bc587d95164045b320ad4028d8cb36783e91e9/docs/design/information-architecture-and-wireframes.md),
the last `main` state before this archive.

## Artefact register

| Artefact                                                  | Original purpose                                                                                                         | Approximate phase | Final status                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `home-desktop.svg`, `home-mobile.svg`                     | Initial public landing page: hero, three brand principles and one _Browse fixtures_ action under a flat five-link header | Sprint 1          | Superseded. #314 replaced the static hero with the editorial Three.js landing narrative and SVG fallback; #816 added the _Ask a stats question_ prompt; #581 replaced the flat header with _Explore Data_, _Downloads_ and _API_.                                                                                                                                |
| `fixtures-desktop.svg`, `fixtures-mobile.svg`             | Initial public fixture list with competition, season and team dropdown filters                                           | Sprint 1          | Superseded. #194 introduced readable searchable filter comboboxes; #581 moved list routes into the _Explore Data_ menu and renamed Competitors/Participants to Teams/Players in navigation.                                                                                                                                                                      |
| `fixture-detail-desktop.svg`, `fixture-detail-mobile.svg` | Initial fixture detail with _Overview / Statistics / Squads / Timeline_ tabs and one flat statistics table               | Sprint 1          | Superseded. Implemented as _Overview / Statistics / Players_ sections (#54) with contextual weather (#300), scorecard analytics and traceable statistic-to-event detail. _Squads_ and _Timeline_ tabs were never implemented.                                                                                                                                    |
| `signin-desktop.svg`, `signin-mobile.svg`                 | Google-only sign-in page with redirecting, error and return-to-origin states                                             | Sprint 1          | Superseded in layout; concept retained. Google sign-in through Supabase (#39, #64) and safe return paths (#581) were implemented; the post-sign-in destination became the Account area rather than a submit/manage launcher.                                                                                                                                     |
| `submission-desktop.svg`, `submission-mobile.svg`         | Initial direct submission design: choose an in-scope fixture and paste delivery-event JSON                               | Sprint 1/2        | Superseded by guided + batch submission. #266, #361, #435 and #437 unified single-fixture, season and back-catalogue packages on one guided page with durable receipts and reports; #499 made validation plain-language; #571 added new-fixture proposals; #703 made selectors searchable. Pasted canonical JSON survives only as the _advanced_ technical mode. |
| `admin-users-desktop.svg`, `admin-users-mobile.svg`       | Initial administrator page: one card per account with scope checkboxes and approve/reject/revoke actions                 | Sprint 1          | Superseded. #342 revamped user management; #581 and #775 added the _Administration_ hub (Users & access, API consumers, Data governance). Batch review (#362) became a separate administrator workspace.                                                                                                                                                         |

## Using this archive

- Cite these files only as evidence of the original design direction.
- Do not link them from current design documentation as though they describe the product.
- Record any further superseded design artefact here with the same four columns and the issue,
  decision or feedback that explains the change.

## AI Declaration

This archive README and the historical watermarks were prepared with the assistance of
Claude-Web[Claude Opus 5.5] under issue #894. The original issue #56 wireframes were produced with the
assistance of Claude.ai[Claude Sonnet 5], as recorded in the Liora Rosenberg AI register.
