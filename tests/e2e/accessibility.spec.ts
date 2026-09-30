import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const routes = ['/', '/sign-in', '/account', '/privacy', '/terms', '/accessibility'] as const;
const themes = ['day', 'night'] as const;

// Separate route/theme audits avoid combining twelve expensive Axe runs inside
// a single Playwright test's timeout. Desktop coverage remains 6 x 2;
// mobile coverage remains the two public/auth pages in day mode.
for (const route of routes) {
  for (const theme of themes) {
    const runsOnMobile = theme === 'day' && (route === '/' || route === '/sign-in');
    test(`public and authentication page themes have no serious accessibility violations: ${route} (${theme})${runsOnMobile ? ' @mobile' : ''}`, async ({
      page,
    }) => {
      await page.goto(route);
      await page.evaluate((selectedTheme) => {
        document.documentElement.dataset.theme = selectedTheme;
        document.documentElement.style.colorScheme = selectedTheme === 'night' ? 'dark' : 'light';
      }, theme);

      const results = await new AxeBuilder({ page }).analyze();
      const seriousOrCriticalViolations = results.violations.filter(
        (violation) => violation.impact === 'serious' || violation.impact === 'critical',
      );

      expect(
        seriousOrCriticalViolations,
        `${route} ${theme} theme: ${JSON.stringify(seriousOrCriticalViolations, null, 2)}`,
      ).toEqual([]);
    });
  }
}
