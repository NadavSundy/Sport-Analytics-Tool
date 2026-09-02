import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test(
  'public and authentication page themes have no serious accessibility violations',
  { tag: '@mobile' },
  async ({ page, isMobile }) => {
    const routes = isMobile ? ['/', '/sign-in'] : ['/', '/sign-in', '/account'];
    const themes = isMobile ? (['day'] as const) : (['day', 'night'] as const);

    for (const route of routes) {
      await page.goto(route);

      for (const theme of themes) {
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
      }
    }
  },
);
