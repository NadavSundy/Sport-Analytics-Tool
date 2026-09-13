import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

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

const inningsStatistic = {
  statisticId: 'stat-innings-1',
  fixtureId: 'fixture-1',
  scope: 'innings',
  statisticCode: 'team_total',
  inningsId: 'innings-1',
  inningsOrdinal: 0,
  competitorId: 'competitor-1',
  competitorName: 'Wanderers',
  sourceEventCount: 12,
  metrics: { deliveryRuns: 104, penaltyRuns: 0, totalRuns: 104 },
};

const playerStatistic = {
  statisticId: 'stat-player-1',
  fixtureId: 'fixture-1',
  scope: 'participant',
  statisticCode: 'participant_fixture',
  participantId: 'participant-1',
  participantName: 'A Player',
  competitorId: 'competitor-1',
  competitorName: 'Wanderers',
  sourceEventCount: 8,
  battingPosition: 1,
  battingParticipation: 'batted',
  dismissal: { status: 'not_out', kind: null, eventId: null },
  batting: { runsScored: 42, ballsFaced: 30, strikeRate: 140, fours: 5, sixes: 1 },
  bowling: null,
};

async function selectTheme(page: Page, theme: 'day' | 'night') {
  const currentTheme = await page.locator('html').getAttribute('data-theme');
  if (currentTheme !== theme) {
    const toggle = page.getByRole('checkbox', { name: /Switch to .* Match theme/ });
    if (theme === 'night') {
      await toggle.check();
    } else {
      await toggle.uncheck();
    }
  }
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
}

async function expectReadableAccessibleView(page: Page, internalValues: string[]) {
  const mainText = await page.locator('main').innerText();
  for (const internalValue of internalValues) {
    expect(mainText).not.toContain(internalValue);
  }
  expect(mainText).not.toMatch(
    /\b(?:competition|season|fixture|competitor|participant|statistic|event)\s+(?:id|reference)\b/i,
  );
  expect(mainText).not.toMatch(/\bcompetitor\b|\bparticipant\b|\bcursor\b/i);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
  ).toBe(false);

  const accessibilityResults = await new AxeBuilder({ page }).analyze();
  expect(
    accessibilityResults.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    ),
  ).toEqual([]);
}

test('competition, season, and team overviews embed readable related records', async ({ page }) => {
  const internalValues = [
    'competition-1',
    'season-1',
    'fixture-1',
    'competitor-1',
    'competitor-2',
    'participant-1',
    'stat-innings-1',
    'stat-player-1',
  ];

  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname.endsWith('/competitions/competition-1')) {
      await route.fulfill({
        json: { data: { competitionId: 'competition-1', name: 'Premier Cricket League' } },
      });
      return;
    }

    if (url.pathname.endsWith('/seasons/season-1')) {
      await route.fulfill({
        json: {
          data: {
            competitionId: 'competition-1',
            competitionName: 'Premier Cricket League',
            label: '2026 season',
            seasonId: 'season-1',
          },
        },
      });
      return;
    }

    if (url.pathname.endsWith('/fixtures/fixture-1/statistics')) {
      await route.fulfill({
        json: {
          data: {
            fixtureId: 'fixture-1',
            status: 'complete',
            scope: { superOversIncluded: false },
            outcome: {
              kind: 'won',
              winnerCompetitorId: 'competitor-1',
              winnerCompetitorName: 'Wanderers',
              eliminatorCompetitorId: null,
              eliminatorCompetitorName: null,
              margin: { type: 'runs', value: 12 },
              method: null,
              decidedByBowlOut: false,
            },
            warnings: [],
            statistics: [inningsStatistic, playerStatistic],
          },
        },
      });
      return;
    }

    if (url.pathname.endsWith('/fixtures/fixture-1/weather')) {
      await route.fulfill({
        json: {
          data: {
            fixtureId: 'fixture-1',
            date: '2026-08-09',
            availability: 'available',
            venue: { name: 'Wits Cricket Oval', city: 'Johannesburg' },
            weather: {
              date: '2026-08-09',
              latitude: -26.1929,
              longitude: 28.0305,
              temperatureMax: 24,
              temperatureMin: 11,
              precipitationSum: 0,
              windSpeedMax: 17,
            },
          },
        },
      });
      return;
    }

    if (url.pathname.endsWith('/fixtures/fixture-1')) {
      await route.fulfill({ json: { data: { ...fixture, seasonLabel: '2026 season' } } });
      return;
    }

    if (url.pathname.endsWith('/competitors/competitor-1')) {
      await route.fulfill({
        json: { data: { competitorId: 'competitor-1', name: 'Wanderers' } },
      });
      return;
    }

    if (url.pathname.endsWith('/competitions')) {
      await route.fulfill({
        json: {
          data: [{ competitionId: 'competition-1', name: 'Premier Cricket League' }],
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
              label: '2026 season',
              seasonId: 'season-1',
            },
          ],
          pagination: { nextCursor: null },
        },
      });
      return;
    }

    if (url.pathname.endsWith('/fixtures')) {
      await route.fulfill({
        json: {
          data: [{ ...fixture, seasonLabel: '2026 season' }],
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

    if (url.pathname.endsWith('/participants')) {
      await route.fulfill({
        json: {
          data: [{ participantId: 'participant-1', displayName: 'A Player' }],
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

  let purposefulInteractions = 0;
  await page.goto('/competitions');
  await expect(page.getByRole('combobox', { name: 'Competition name' })).toBeVisible();
  await selectTheme(page, 'day');
  await expectReadableAccessibleView(page, internalValues);
  await page.getByRole('link', { name: 'Premier Cricket League' }).focus();
  await page.keyboard.press('Enter');
  purposefulInteractions += 1;

  await expect(
    page.getByRole('heading', { level: 1, name: 'Premier Cricket League' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Fixtures by season' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Wanderers', exact: true })).toBeVisible();
  await expectReadableAccessibleView(page, internalValues);

  const seasonsSection = page
    .getByRole('heading', { level: 2, name: 'Seasons' })
    .locator('..')
    .locator('..');
  await seasonsSection.getByRole('link', { name: '2026 season' }).focus();
  await page.keyboard.press('Enter');
  purposefulInteractions += 1;

  await expect(page.getByRole('heading', { level: 1, name: '2026 season' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Fixtures' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Teams' })).toBeVisible();
  await expectReadableAccessibleView(page, internalValues);
  await page.getByRole('link', { name: 'Wanderers vs Strikers' }).focus();
  await page.keyboard.press('Enter');
  purposefulInteractions += 1;

  await expect(
    page.getByRole('heading', { level: 1, name: 'Wanderers vs Strikers' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Premier Cricket League' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Match weather' })).toBeVisible();
  await expect(page.getByText('24 °C')).toBeVisible();
  await expect(page.getByText('0 mm')).toBeVisible();
  await expect(page.getByText('17 km/h')).toBeVisible();
  await expect(page.getByText('Wanderers won by 12 runs.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Innings totals' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Player statistics' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'A Player' }).first()).toBeVisible();
  expect(purposefulInteractions).toBe(3);

  const isMobile = (page.viewportSize()?.width ?? 0) < 900;
  await selectTheme(page, 'day');
  await expectReadableAccessibleView(page, internalValues);
  if (process.env.CAPTURE_ISSUE_199_EVIDENCE && !isMobile) {
    await page.screenshot({
      fullPage: true,
      path: 'evidence/validation/issue-199-competition-journey-desktop-day.png',
    });
  }

  await selectTheme(page, 'night');
  await expect(page.getByText('Wanderers won by 12 runs.')).toBeVisible();
  await expectReadableAccessibleView(page, internalValues);
  if (process.env.CAPTURE_ISSUE_199_EVIDENCE && isMobile) {
    await page.screenshot({
      fullPage: true,
      path: 'evidence/validation/issue-199-competition-journey-mobile-night.png',
    });
  }

  await page.getByRole('link', { name: 'Teams', exact: true }).click();
  await expect(page).toHaveURL(/\/competitors$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Teams' })).toBeVisible();
  let teamInteractions = 0;
  await page.getByRole('link', { name: 'Wanderers', exact: true }).focus();
  await page.keyboard.press('Enter');
  teamInteractions += 1;
  await expect(page.getByRole('heading', { level: 1, name: 'Wanderers' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Wanderers vs Strikers' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'A Player' })).toBeVisible();
  await expectReadableAccessibleView(page, internalValues);
  await page.getByRole('link', { name: 'Wanderers vs Strikers' }).focus();
  await page.keyboard.press('Enter');
  teamInteractions += 1;
  await expect(page.getByText('Wanderers won by 12 runs.')).toBeVisible();
  expect(teamInteractions).toBe(2);
});

test('readable filter combobox supports routed selection and keyboard use', async ({ page }) => {
  const requestedUrls: string[] = [];

  await page.route('**/api/v1/**', async (route) => {
    const requestUrl = route.request().url();
    const url = new URL(requestUrl);
    requestedUrls.push(requestUrl);

    if (url.pathname.endsWith('/fixtures/fixture-1/statistics')) {
      await route.fulfill({
        json: {
          data: {
            fixtureId: 'fixture-1',
            status: 'complete',
            scope: { superOversIncluded: false },
            outcome: {
              kind: 'won',
              winnerCompetitorId: 'competitor-1',
              winnerCompetitorName: 'Wanderers',
              eliminatorCompetitorId: null,
              eliminatorCompetitorName: null,
              margin: { type: 'runs', value: 12 },
              method: null,
              decidedByBowlOut: false,
            },
            warnings: [],
            statistics: [inningsStatistic, playerStatistic],
          },
        },
      });
      return;
    }

    if (url.pathname.endsWith('/fixtures/fixture-1')) {
      await route.fulfill({ json: { data: fixture } });
      return;
    }

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
          data:
            url.searchParams.get('name') === 'South Africa'
              ? [{ competitorId: 'competitor-sa', name: 'South Africa' }]
              : [{ competitorId: 'competitor-1', name: 'Wanderers' }],
          pagination: {
            nextCursor: url.searchParams.has('name') ? null : 'teams-page-2',
          },
        },
      });
      return;
    }

    if (url.pathname.endsWith('/fixtures')) {
      await route.fulfill({
        json: {
          data: url.searchParams.has('competitionId') ? [fixture] : [],
          pagination: { nextCursor: null },
        },
      });
      return;
    }

    if (url.pathname.endsWith('/participants')) {
      await route.fulfill({
        json: {
          data: [{ participantId: 'participant-1', displayName: 'A Player' }],
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

  await page.goto('/fixtures');
  const competition = page.getByRole('combobox', { name: 'Competition' });
  await competition.fill('prem');
  await expect(page.getByRole('option', { name: 'Premier Cricket League' })).toBeVisible();
  await competition.press('ArrowDown');
  await competition.press('Enter');
  await expect(competition).toHaveValue('Premier Cricket League');
  expect(requestedUrls.some((url) => url.includes('/competitions?limit=100&name=prem'))).toBe(true);

  await page.getByRole('button', { name: 'Show season options' }).click();
  await expect(page.getByRole('option', { name: /Premier Cricket League — 2026/ })).toBeVisible();
  await page.getByRole('option', { name: /Premier Cricket League — 2026/ }).click();
  await expect(page.getByRole('combobox', { name: 'Season' })).toHaveValue(
    'Premier Cricket League — 2026',
  );
  expect(
    requestedUrls.some((url) => url.includes('/seasons?competitionId=competition-1&limit=100')),
  ).toBe(true);

  const scopedTeam = page.getByRole('combobox', { name: 'Team' });
  await scopedTeam.fill('South Africa');
  await expect(page.getByRole('option', { name: 'South Africa' })).toBeVisible();
  expect(
    requestedUrls.some((url) =>
      url.includes(
        '/competitors?competitionId=competition-1&seasonId=season-1&limit=100&name=South+Africa',
      ),
    ),
  ).toBe(true);
  await scopedTeam.press('Escape');

  await page.getByRole('button', { name: 'Clear competition' }).click();
  await expect(competition).toHaveValue('');
  await expect(page.getByRole('combobox', { name: 'Season' })).toHaveValue('');

  await page.getByLabel('Switch to Night Match theme').check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  await competition.fill('prem');
  await expect(page.getByRole('option', { name: 'Premier Cricket League' })).toBeVisible();
  await competition.press('ArrowDown');
  await competition.press('Enter');
  let searchJourneyInteractions = 1;
  const team = page.getByRole('combobox', { name: 'Team' });
  await team.focus();
  await team.press('ArrowDown');
  await expect(team).toHaveAttribute('aria-expanded', 'true');
  await team.press('Escape');
  await expect(team).toHaveAttribute('aria-expanded', 'false');

  await page.getByRole('button', { name: 'Apply filters' }).click();
  searchJourneyInteractions += 1;
  await expect(page).toHaveURL(/competitionId=competition-1/);
  await expect(page.locator('.active-filter-summary')).toContainText(
    'Competition: Premier Cricket League',
  );
  await expect(page.locator('.active-filter-summary')).not.toContainText('competition-1');
  expect(
    requestedUrls.some((url) => url.includes('/fixtures?competitionId=competition-1&limit=50')),
  ).toBe(true);

  const filteredFixture = page.getByRole('link', { name: 'Wanderers vs Strikers' });
  await filteredFixture.focus();
  await expect(filteredFixture).toBeFocused();
  await page.keyboard.press('Enter');
  searchJourneyInteractions += 1;
  await expect(
    page.getByRole('heading', { level: 1, name: 'Wanderers vs Strikers' }),
  ).toBeVisible();
  await expect(page.getByText('Wanderers won by 12 runs.')).toBeVisible();
  expect(searchJourneyInteractions).toBe(3);
  await expectReadableAccessibleView(page, [
    'competition-1',
    'season-1',
    'fixture-1',
    'competitor-1',
    'competitor-2',
    'participant-1',
  ]);
});

test(
  'anonymous browsing preserves filters, pagination and keyboard navigation',
  { tag: '@mobile' },
  async ({ page }) => {
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
    await expect(page.getByRole('link', { name: 'Wanderers vs Strikers' })).toBeVisible({
      timeout: 15_000,
    });
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

    const competitorsLink = page.getByRole('link', { name: 'Teams', exact: true });
    await competitorsLink.focus();
    await expect(competitorsLink).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page.getByRole('heading', { level: 1, name: 'Teams' })).toBeVisible();
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
      await expect(page.getByRole('heading', { level: 1, name: 'Teams' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Wanderers' })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        ),
      ).toBe(false);
      await session.send('Emulation.clearDeviceMetricsOverride');
      await session.detach();
    }
  },
);
