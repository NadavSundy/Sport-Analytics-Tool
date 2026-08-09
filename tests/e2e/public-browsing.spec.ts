import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const fixture = {
  fixtureId: 'fixture-1',
  competitionId: 'competition-1',
  seasonId: 'season-1',
  season: '2026',
  matchType: 'T20',
  teamType: 'international',
  gender: 'female',
  ballsPerOver: 6,
  scheduledOvers: 20,
  startDate: '2026-08-09',
  endDate: '2026-08-09',
};

test('anonymous browsing preserves filters, pagination and keyboard navigation', async ({
  page,
}) => {
  const requestedUrls: string[] = [];

  await page.route('**/api/v1/**', async (route) => {
    const requestUrl = route.request().url();
    const url = new URL(requestUrl);
    requestedUrls.push(requestUrl);

    if (url.pathname.endsWith('/fixtures/fixture-1')) {
      await route.fulfill({ json: { data: fixture } });
      return;
    }

    if (url.pathname.endsWith('/fixtures')) {
      await route.fulfill({
        json: {
          data: url.searchParams.has('cursor') ? [] : [fixture],
          pagination: {
            nextCursor: url.searchParams.has('cursor') ? null : 'next-fixture-cursor',
          },
        },
      });
      return;
    }

    if (url.pathname.endsWith('/competitors')) {
      await route.fulfill({
        json: {
          data: [{ competitorId: 'competitor-1', name: 'Wanderers' }],
          pagination: { nextCursor: null },
        },
      });
      return;
    }

    await route.fulfill({
      status: 404,
      json: { error: { code: 'NOT_FOUND', message: 'Not found.' } },
    });
  });

  await page.goto('/fixtures?gender=female&limit=25');

  await expect(page.getByRole('heading', { level: 1, name: 'Fixtures' })).toBeVisible();
  await expect(page.getByLabel('Gender')).toHaveValue('female');
  await expect(page.getByLabel('Records per page')).toHaveValue('25');
  await expect(page).toHaveURL(/\/fixtures\?gender=female&limit=25/);
  await expect(page.getByRole('link', { name: 'T20 fixture' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('link', { name: /Sign in/i })).toHaveCount(0);

  const accessibilityResults = await new AxeBuilder({ page }).analyze();
  const seriousOrCriticalViolations = accessibilityResults.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(seriousOrCriticalViolations).toEqual([]);

  const nextPage = page.getByRole('link', { name: 'Next page' });
  await nextPage.focus();
  await expect(nextPage).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/cursor=next-fixture-cursor/);
  await expect(page.getByText('No fixtures found')).toBeVisible();
  expect(requestedUrls.some((url) => url.includes('cursor=next-fixture-cursor'))).toBe(true);

  const competitorsLink = page.getByRole('link', { name: 'Competitors', exact: true });
  await competitorsLink.focus();
  await expect(competitorsLink).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.getByRole('heading', { level: 1, name: 'Competitors' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Wanderers' })).toBeVisible();
  await expect(page).not.toHaveURL(/sign-in/);

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
