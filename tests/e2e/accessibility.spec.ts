import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('public and authentication page themes have no serious accessibility violations', async ({
  page,
}) => {
  for (const route of ['/', '/sign-in', '/account']) {
    await page.goto(route);

    for (const theme of ['day', 'night'] as const) {
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
});
