import { expect, test } from '@playwright/test';

test('public application loads successfully', async ({ page }) => {
  const pageErrors: string[] = [];

  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      name: /sport analytics/i,
    }),
  ).toBeVisible();

  expect(pageErrors).toEqual([]);
});
