import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('landing page themes have no serious accessibility violations', async ({ page }) => {
  await page.goto('/');

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
      `${theme} theme: ${JSON.stringify(seriousOrCriticalViolations, null, 2)}`,
    ).toEqual([]);
  }
});
