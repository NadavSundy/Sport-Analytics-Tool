import { expect, test } from '@playwright/test';

const liveEnabled = process.env.PLAYWRIGHT_API_EXPLORER_LIVE === '1';

test.skip(!liveEnabled, 'Run with npm run test:e2e:api-explorer-live.');

test('production-style explorer loads the deployed OpenAPI document through browser CORS', async ({
  page,
}) => {
  await page.goto('/api');

  await expect(page.getByRole('heading', { level: 1, name: 'API Explorer' })).toBeVisible();
  await expect(page.locator('.swagger-ui .info .title')).toContainText('Sport Analytics API');
  await expect(
    page.locator('.swagger-ui .opblock-summary-path', { hasText: '/api/v1/health' }),
  ).toBeVisible();

  await expect(page.getByText(/could not load the API specification/i)).toHaveCount(0);

  const pageOverflows = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(pageOverflows).toBe(false);
});
