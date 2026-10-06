# Stat’sTheGame Accessibility Statement

**Effective date:** 29 September 2026
**Last updated:** 5 October 2026

## 1. Our commitment

The Stat’sTheGame Student Project Team is committed to making the Stat’sTheGame web application usable by as many people as reasonably possible, including people with disabilities and people using assistive technologies.

The project aims to follow the **Web Content Accessibility Guidelines (WCAG) 2.2 at Level AA**.

WCAG is an international accessibility standard developed by the World Wide Web Consortium (W3C). Level AA includes all Level A and Level AA success criteria.

## 2. Scope

This statement applies to the **Stat’sTheGame web application**, including its public browsing, statistics, authentication, account, submission and administration interfaces.

The project also maintains a separate public technical documentation website. That documentation site is maintained with accessibility in mind, but it is not included in any formal WCAG conformance claim made by this statement.

## 3. Conformance status

Stat’sTheGame **aims to conform to WCAG 2.2 Level AA**, but the project has not completed a full independent assessment of every WCAG 2.2 Level A and Level AA success criterion.

We therefore do **not** claim full WCAG 2.2 Level AA conformance at this time.

The application has undergone automated and manual accessibility-focused testing as part of development. This testing reduces accessibility defects but does not by itself establish complete WCAG conformance.

## 4. Accessibility measures used in the project

Accessibility is treated as part of normal development rather than as a separate visual feature.

The project’s design and testing approach includes:

- semantic HTML where appropriate;
- accessible names and labels for controls;
- ARIA only where native HTML alone is not sufficient;
- keyboard-operable user journeys;
- visible and managed keyboard focus;
- appropriate form labels and error/status associations;
- colour-contrast consideration in both Day Match and Night Match themes;
- avoiding colour as the only way of communicating important status;
- responsive layouts across desktop and representative mobile widths;
- checks for unintended horizontal overflow;
- browser zoom and reflow testing;
- reduced-motion behaviour for motion-sensitive users;
- fallbacks where enhanced visual effects are unavailable;
- automated Axe accessibility checks for serious and critical findings; and
- manual review of representative user journeys.

## 5. Themes, contrast and motion

Stat’sTheGame provides two visual themes:

- **Day Match**, the light theme; and
- **Night Match**, the dark theme.

The same functionality and content should remain available in both themes.

The application is designed so that important information is not communicated by colour alone. Text, labels, structure or other indicators are used where needed to convey meaning.

Where the application includes non-essential animation or enhanced visual effects, it is designed to respect reduced-motion preferences or provide a functional fallback where reasonably practicable.

## 6. Keyboard access

Core functionality is intended to be usable without a mouse.

Interactive controls should be reachable and operable through the keyboard, and focus should remain visible so that a keyboard user can determine which element is active.

The project tests representative public, authenticated, submission and administrative journeys for keyboard interaction.

If you encounter a feature that cannot be completed using a keyboard, please report it to **statsthegame@gmail.com**.

## 7. Responsive design and zoom

The application is designed for both desktop and mobile layouts.

Representative interfaces are tested at mobile and desktop widths, including checks intended to prevent content from being lost through unintended horizontal scrolling.

Every normal public and signed-in page is tested at a width of 320 CSS pixels, which is what a 1280-pixel-wide browser window shows at 400% zoom. The site header is tested from 320 to 1440 pixels so that its links never overlap, wrap or become cut off; on narrower screens they move into a **Menu** panel.

If zooming or changing text size prevents access to content or controls, please report the affected page and what happened.

## 8. Forms, errors and status messages

Forms should provide readable labels, instructions and validation feedback.

Where an error, success state, loading state or other status is important to completing a task, the interface should communicate it in text and, where appropriate, expose it in a way that can be understood by assistive technology.

Users should not have to rely on colour alone to understand whether a submission, validation or administrative action succeeded or failed.

## 9. Data tables and analytical content

Stat’sTheGame contains data-heavy interfaces, including statistics, event histories, filters and tables.

We aim to:

- use meaningful headings and labels;
- keep table relationships understandable;
- provide readable context for statistics rather than exposing only technical identifiers;
- support keyboard navigation through interactive controls; and
- avoid requiring a visual chart or colour distinction as the only way to obtain essential information.

If an analytical view is difficult to interpret with assistive technology, contact us so that we can investigate an accessible alternative or correction.

## 10. Known limitations and current assessment position

At the date of this statement, the project does not intentionally accept any known serious or critical accessibility defect as part of normal operation.

However, because a complete independent WCAG 2.2 Level AA conformance audit has not been performed:

- less severe accessibility issues may still exist;
- particular combinations of browser and assistive technology may behave differently from tested environments; and
- future features may introduce new accessibility defects before they are identified and corrected.

One known, deliberate limitation is that wide data tables, such as batting and bowling scorecards, can scroll sideways inside their own frame on narrow screens rather than reflowing into a single column, because their rows and columns must stay aligned to be understood. A shadow on the table edge shows that more columns are available, and the table can be scrolled with the keyboard once it has focus.

This statement will be updated if the project identifies material accessibility limitations that users should know about.

## 11. Supported technologies

Stat’sTheGame is a modern web application built using HTML, CSS and JavaScript.

It is intended to work with current mainstream browsers and with common browser accessibility features such as keyboard navigation, zoom, operating-system colour preferences and reduced-motion preferences.

Because browser and assistive-technology combinations vary, we welcome reports about combinations that do not work as expected.

## 12. Accessibility feedback

If you have difficulty using Stat’sTheGame because of an accessibility issue, email:

**statsthegame@gmail.com**

When reporting an issue, it is helpful to include:

- the page or feature affected;
- what you were trying to do;
- what went wrong; and
- your browser or assistive technology, if you are comfortable providing that information.

You do not need to disclose a disability or medical information to report an accessibility problem.

We will review accessibility reports as part of the project’s normal issue, testing and review process and will prioritise barriers that prevent users from accessing core functionality.

## 13. Alternative assistance

If an accessibility barrier prevents you from using an authenticated or administrative feature, contact **statsthegame@gmail.com** and describe the task you were trying to complete.

Where reasonably practicable and consistent with security and authorisation requirements, the project team will try to provide assistance or an alternative way to complete the task while the underlying accessibility issue is investigated.

We will not ask you to send passwords, access tokens or other authentication secrets by email.

## 14. Ongoing improvement

Accessibility is included in the project’s automated tests, browser testing, responsive-design reviews and manual acceptance work.

When accessibility defects are discovered, they should be corrected within the relevant scope or recorded as project issues so that they are not silently ignored.

Future accessibility work may include broader assistive-technology testing and a complete WCAG 2.2 Level AA conformance review.

## 15. Contact

**Stat’sTheGame Student Project Team**
**Email:** statsthegame@gmail.com
**Correspondence address:** Private Bag 3, Wits, 2050, South Africa

The Wits postal address is used only as a correspondence address for this student project. The University of the Witwatersrand does not operate Stat’sTheGame.

---

## Accessibility standard

Web Content Accessibility Guidelines (WCAG) 2.2: https://www.w3.org/TR/WCAG22/

## AI Declaration

The preceding document was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
