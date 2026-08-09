import { expect, test } from '@playwright/test';

test('public landing page is responsive and supports persisted keyboard theme selection', async ({
  page,
}) => {
  const pageErrors: string[] = [];

  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      name: 'Stat’sTheGame',
    }),
  ).toBeVisible();
  await expect(page.getByText('The game, measured ball by ball.').first()).toBeVisible();

  const themeToggle = page.getByRole('checkbox', { name: 'Switch to Night Match theme' });
  await themeToggle.focus();
  await expect(themeToggle).toBeFocused();
  await page.keyboard.press('Space');

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  expect(await page.evaluate(() => window.localStorage.getItem('statsthegame-theme'))).toBe(
    'night',
  );

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );

  expect(hasHorizontalOverflow).toBe(false);
  expect(pageErrors).toEqual([]);
});
