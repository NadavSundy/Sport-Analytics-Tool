import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('home page has no serious accessibility violations', async ({ page }) => {
  await page.goto('/');

  const results = await new AxeBuilder({ page }).analyze();

  const seriousOrCriticalViolations = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );

  expect(seriousOrCriticalViolations, JSON.stringify(seriousOrCriticalViolations, null, 2)).toEqual(
    [],
  );
});
