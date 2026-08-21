import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const competitors = [
  { competitorId: 'team-1', name: 'Wanderers' },
  { competitorId: 'team-2', name: 'Strikers' },
];

const fixture = {
  fixtureId: 'fixture-1',
  competitionId: 'competition-1',
  competitionName: 'Premier Cricket League',
  seasonId: 'season-1',
  season: '2026',
  seasonLabel: '2026 season',
  competitors,
  matchType: 'T20',
  teamType: 'club',
  gender: 'female',
  ballsPerOver: 6,
  scheduledOvers: 20,
  startDate: '2026-08-09',
  endDate: '2026-08-09',
};

function matchHistoryEntry(
  fixtureId: string,
  opponent: { competitorId: string; name: string },
  options: {
    batting: null | {
      runsScored: number;
      ballsFaced: number;
      strikeRate: number | null;
      fours: number;
      sixes: number;
    };
    bowling: null | {
      runsConceded: number;
      legalBallsBowled: number;
      oversBowled: string;
      economyRate: number | null;
      wicketsTaken: number;
    };
    status: 'complete' | 'partial';
    warnings?: Array<{ code: string; message: string }>;
  },
) {
  const matchCompetitors = [competitors[0], opponent];
  return {
    fixture: {
      ...fixture,
      fixtureId,
      competitors: matchCompetitors,
    },
    competitionName: 'Premier Cricket League',
    competitors: matchCompetitors,
    competitor: competitors[0],
    role: 'All-rounder',
    statisticsStatus: options.status,
    statisticsWarnings: options.warnings ?? [],
    batting: options.batting,
    bowling: options.bowling,
  };
}

const matchHistory = [
  matchHistoryEntry('fixture-1', competitors[1], {
    status: 'complete',
    batting: { runsScored: 42, ballsFaced: 30, strikeRate: 140, fours: 5, sixes: 1 },
    bowling: {
      runsConceded: 18,
      legalBallsBowled: 12,
      oversBowled: '2.0',
      economyRate: 9,
      wicketsTaken: 2,
    },
  }),
  matchHistoryEntry(
    'fixture-2',
    { competitorId: 'team-3', name: 'Titans' },
    {
      status: 'partial',
      warnings: [
        {
          code: 'SOURCE_DATA_INCOMPLETE',
          message: 'Published figures are based on incomplete source data.',
        },
      ],
      batting: { runsScored: 19, ballsFaced: 14, strikeRate: null, fours: 2, sixes: 0 },
      bowling: null,
    },
  ),
  matchHistoryEntry(
    'fixture-3',
    { competitorId: 'team-4', name: 'Lions' },
    {
      status: 'complete',
      batting: null,
      bowling: null,
    },
  ),
];

test('player overview presents multiple matches, partial data, and unavailable statistics', async ({
  page,
}) => {
  const requestedUrls: string[] = [];

  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    requestedUrls.push(url.toString());

    if (url.pathname.endsWith('/participants/player-1/fixtures')) {
      await route.fulfill({
        json: { data: matchHistory, pagination: { nextCursor: null } },
      });
      return;
    }

    if (url.pathname.endsWith('/participants/player-1')) {
      await route.fulfill({
        json: { data: { participantId: 'player-1', displayName: 'A Player' } },
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
              winnerCompetitorId: 'team-1',
              winnerCompetitorName: 'Wanderers',
              eliminatorCompetitorId: null,
              eliminatorCompetitorName: null,
              margin: { type: 'runs', value: 12 },
              method: null,
              decidedByBowlOut: false,
            },
            warnings: [],
            statistics: [],
          },
        },
      });
      return;
    }

    if (url.pathname.endsWith('/fixtures/fixture-1')) {
      await route.fulfill({ json: { data: fixture } });
      return;
    }

    if (url.pathname.endsWith('/participants')) {
      await route.fulfill({
        json: {
          data: [{ participantId: 'player-1', displayName: 'A Player' }],
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
  await page.goto('/participants');
  const playerLink = page.getByRole('link', { name: 'A Player' });
  await playerLink.focus();
  await expect(playerLink).toBeFocused();
  await page.keyboard.press('Enter');
  purposefulInteractions += 1;

  await expect(page.getByRole('heading', { level: 1, name: 'A Player' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Match history' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Wanderers vs Strikers' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Wanderers vs Titans' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Wanderers vs Lions' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Premier Cricket League' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: '2026 season' }).first()).toBeVisible();
  await expect(page.getByText('Partial data')).toBeVisible();
  await expect(
    page.getByText('Published figures are based on incomplete source data.'),
  ).toBeVisible();
  await expect(page.getByText('No bowling figures are available.')).toBeVisible();
  await expect(
    page.getByText('No batting or bowling figures are published for this player in this match.'),
  ).toBeVisible();
  expect(
    requestedUrls.some((url) => url.includes('/participants/player-1/fixtures?limit=10')),
  ).toBe(true);

  const matchLink = page.getByRole('link', { name: 'Wanderers vs Strikers' });
  await matchLink.focus();
  await expect(matchLink).toBeFocused();
  await page.keyboard.press('Enter');
  purposefulInteractions += 1;
  await expect(
    page.getByRole('heading', { level: 1, name: 'Wanderers vs Strikers' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Match statistics' })).toBeVisible();
  expect(purposefulInteractions).toBeLessThanOrEqual(3);

  await page.goBack();
  await expect(page.getByRole('heading', { level: 1, name: 'A Player' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'day');
  if ((page.viewportSize()?.width ?? 0) < 900) {
    await page.locator('.theme-toggle').tap();
  } else {
    await page.getByLabel('Switch to Night Match theme').check();
  }
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');

  if ((page.viewportSize()?.width ?? 0) >= 900) {
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
  }

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
  ).toBe(false);
  const mainText = await page.locator('main').innerText();
  expect(mainText).not.toMatch(/player-1|fixture-[123]|competition-1|season-1|team-[1234]/);
  expect(mainText).not.toMatch(/\bparticipant\b|technical reference/i);

  const accessibilityResults = await new AxeBuilder({ page }).analyze();
  expect(
    accessibilityResults.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    ),
  ).toEqual([]);
});
