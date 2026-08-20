import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const fixture = {
  fixtureId: 'fixture-1',
  competitionId: 'competition-1',
  competitionName: 'Premier Cricket League',
  seasonId: 'season-1',
  season: '2026',
  seasonLabel: '2026',
  competitors: [
    { competitorId: 'competitor-1', name: 'Wanderers' },
    { competitorId: 'competitor-2', name: 'Strikers' },
  ],
  matchType: 'T20',
  teamType: 'international',
  gender: 'female',
  ballsPerOver: 6,
  scheduledOvers: 20,
  startDate: '2026-08-09',
  endDate: '2026-08-09',
};

test('readable filter combobox supports routed selection and keyboard use', async ({ page }) => {
  const requestedUrls: string[] = [];

  await page.route('**/api/v1/**', async (route) => {
    const requestUrl = route.request().url();
    const url = new URL(requestUrl);
    requestedUrls.push(requestUrl);

    if (url.pathname.endsWith('/competitions')) {
      await route.fulfill({
        json: {
          data: [
            { competitionId: 'competition-2', name: 'Regional Cup' },
            { competitionId: 'competition-1', name: 'Premier Cricket League' },
          ],
          pagination: { nextCursor: null },
        },
      });
      return;
    }

    if (url.pathname.endsWith('/seasons')) {
      await route.fulfill({
        json: {
          data: [
            {
              competitionId: 'competition-1',
              competitionName: 'Premier Cricket League',
              label: '2026',
              seasonId: 'season-1',
            },
          ],
          pagination: { nextCursor: null },
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

    if (url.pathname.endsWith('/fixtures')) {
      await route.fulfill({ json: { data: [], pagination: { nextCursor: null } } });
      return;
    }

    await route.fulfill({
      status: 404,
      json: { error: { code: 'NOT_FOUND', message: 'Not found.' } },
    });
  });

  await page.goto('/fixtures');
  const competition = page.getByRole('combobox', { name: 'Competition' });
  await competition.fill('prem');
  await expect(page.getByRole('option', { name: 'Premier Cricket League' })).toBeVisible();
  await competition.press('ArrowDown');
  await competition.press('Enter');
  await expect(competition).toHaveValue('Premier Cricket League');

  await page.getByRole('button', { name: 'Show season options' }).click();
  await expect(page.getByRole('option', { name: /Premier Cricket League — 2026/ })).toBeVisible();
  await page.getByRole('option', { name: /Premier Cricket League — 2026/ }).click();
  await expect(page.getByRole('combobox', { name: 'Season' })).toHaveValue(
    'Premier Cricket League — 2026',
  );
  expect(
    requestedUrls.some((url) => url.includes('/seasons?competitionId=competition-1&limit=100')),
  ).toBe(true);

  await page.getByRole('button', { name: 'Clear competition' }).click();
  await expect(competition).toHaveValue('');
  await expect(page.getByRole('combobox', { name: 'Season' })).toHaveValue('');

  await page.getByLabel('Switch to Night Match theme').check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  await page.getByRole('button', { name: 'Show competition options' }).click();
  await page.getByRole('option', { name: 'Premier Cricket League' }).click();
  const team = page.getByRole('combobox', { name: 'Team' });
  await team.focus();
  await team.press('ArrowDown');
  await expect(team).toHaveAttribute('aria-expanded', 'true');
  await team.press('Escape');
  await expect(team).toHaveAttribute('aria-expanded', 'false');

  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page).toHaveURL(/competitionId=competition-1/);
  await expect(page.locator('.active-filter-summary')).toContainText(
    'Competition: Premier Cricket League',
  );
  await expect(page.locator('.active-filter-summary')).not.toContainText('competition-1');
  expect(
    requestedUrls.some((url) => url.includes('/fixtures?competitionId=competition-1&limit=50')),
  ).toBe(true);

  const accessibilityResults = await new AxeBuilder({ page }).analyze();
  expect(
    accessibilityResults.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    ),
  ).toEqual([]);
});

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
  await expect(
    page
      .getByRole('navigation', { name: 'Account' })
      .getByRole('link', { name: 'Login or Sign up' }),
  ).toHaveAttribute('href', '/sign-in');

  const compactCollectionLayout = await page.evaluate(() => {
    const heading = document.querySelector<HTMLElement>('.page-heading');
    const content = document.querySelector<HTMLElement>('.browse-page__content');
    if (!heading || !content) {
      throw new Error('The public collection layout was not rendered.');
    }

    const headingStyle = getComputedStyle(heading);
    const contentStyle = getComputedStyle(content);
    return {
      headingPaddingTop: Number.parseFloat(headingStyle.paddingTop),
      headingPaddingBottom: Number.parseFloat(headingStyle.paddingBottom),
      contentGap: Number.parseFloat(contentStyle.rowGap),
    };
  });
  const isMobile = (page.viewportSize()?.width ?? 0) < 900;
  expect(compactCollectionLayout).toEqual({
    headingPaddingTop: isMobile ? 24 : 32,
    headingPaddingBottom: isMobile ? 16 : 24,
    contentGap: isMobile ? 24 : 32,
  });
  expect(Object.values(compactCollectionLayout).every((value) => value % 4 === 0)).toBe(true);

  if (process.env.CAPTURE_ISSUE_195_EVIDENCE && !isMobile) {
    await page.screenshot({
      fullPage: true,
      path: 'evidence/validation/issue-195-collection-after-desktop.png',
    });
  }

  await page.getByLabel('Switch to Night Match theme').check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  const nightCollectionLayout = await page.evaluate(() => {
    const heading = document.querySelector<HTMLElement>('.page-heading');
    const content = document.querySelector<HTMLElement>('.browse-page__content');
    if (!heading || !content) {
      throw new Error('The public collection layout was not rendered.');
    }

    const headingStyle = getComputedStyle(heading);
    const contentStyle = getComputedStyle(content);
    return {
      headingPaddingTop: Number.parseFloat(headingStyle.paddingTop),
      headingPaddingBottom: Number.parseFloat(headingStyle.paddingBottom),
      contentGap: Number.parseFloat(contentStyle.rowGap),
    };
  });
  expect(nightCollectionLayout).toEqual(compactCollectionLayout);

  if (process.env.CAPTURE_ISSUE_195_EVIDENCE && isMobile) {
    await page.screenshot({
      fullPage: true,
      path: 'evidence/validation/issue-195-collection-after-mobile.png',
    });
  }

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

  if (!isMobile) {
    const viewport = page.viewportSize();
    if (!viewport) {
      throw new Error('The desktop viewport is unavailable.');
    }

    const session = await page.context().newCDPSession(page);
    await session.send('Emulation.setDeviceMetricsOverride', {
      width: Math.floor(viewport.width / 2),
      height: viewport.height,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await expect(page.getByRole('heading', { level: 1, name: 'Competitors' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Wanderers' })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      ),
    ).toBe(false);
    await session.send('Emulation.clearDeviceMetricsOverride');
    await session.detach();
  }
});
