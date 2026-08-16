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

const inningsStatistic = {
  statisticId: 'stat-innings-1',
  fixtureId: 'fixture-1',
  scope: 'innings',
  statisticCode: 'team_total',
  inningsId: 'innings-1',
  inningsOrdinal: 0,
  competitorId: 'team-1',
  sourceEventCount: 1,
  metrics: { deliveryRuns: 5, penaltyRuns: 0, totalRuns: 5 },
};

const participantStatistic = {
  statisticId: 'stat-participant-1',
  fixtureId: 'fixture-1',
  scope: 'participant',
  statisticCode: 'participant_fixture',
  participantId: 'striker-1',
  competitorId: 'team-1',
  sourceEventCount: 1,
  batting: { runsScored: 4, ballsFaced: 1, strikeRate: 400, fours: 1, sixes: 0 },
  bowling: null,
};

test('anonymous users navigate the responsive fixture statistics and event trace', async ({
  page,
}) => {
  const requestedUrls: string[] = [];

  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    requestedUrls.push(url.toString());

    if (url.pathname.endsWith('/statistics/stat-innings-1')) {
      await route.fulfill({
        json: {
          data: {
            ...inningsStatistic,
            contributingEvents: [
              {
                eventId: 'event-1',
                fixtureId: 'fixture-1',
                inningsId: 'innings-1',
                inningsOrdinal: 0,
                sequenceNumber: 1,
                strikerParticipantId: 'striker-1',
                bowlerParticipantId: 'bowler-1',
                runs: { offBat: 4, extras: 1, total: 5 },
                extras: {
                  wides: 1,
                  noBalls: null,
                  byes: null,
                  legByes: null,
                  penalty: null,
                },
                nonBoundary: false,
                bowlerWickets: 0,
              },
            ],
          },
        },
      });
      return;
    }

    if (url.pathname.endsWith('/statistics')) {
      await route.fulfill({
        json: {
          data: {
            fixtureId: 'fixture-1',
            status: 'complete',
            scope: { superOversIncluded: false },
            outcome: {
              kind: 'won',
              winnerCompetitorId: 'team-1',
              eliminatorCompetitorId: null,
              margin: { type: 'wickets', value: 5 },
              method: null,
              decidedByBowlOut: false,
            },
            warnings: [],
            statistics: [inningsStatistic, participantStatistic],
          },
        },
      });
      return;
    }

    if (url.pathname.endsWith('/fixtures/fixture-1')) {
      await route.fulfill({ json: { data: fixture } });
      return;
    }

    await route.fulfill({
      status: 404,
      json: { error: { code: 'NOT_FOUND', message: 'Not found.' } },
    });
  });

  await page.goto('/fixtures/fixture-1');
  const statisticsLink = page.getByRole('link', { name: 'View statistics' });
  await statisticsLink.focus();
  await expect(statisticsLink).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.getByRole('heading', { level: 1, name: 'Fixture statistics' })).toBeVisible();
  await expect(page.getByText('Competitor team-1 won by 5 wickets.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Participant statistics' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Participant striker-1' })).toBeVisible();
  await expect(page).not.toHaveURL(/sign-in/);

  const accessibilityResults = await new AxeBuilder({ page }).analyze();
  expect(
    accessibilityResults.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    ),
  ).toEqual([]);

  const calculationLink = page.getByRole('link', { name: 'How calculated' }).first();
  await calculationLink.focus();
  await expect(calculationLink).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.getByRole('heading', { level: 1, name: 'Innings 1 team total' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Contributing events' })).toBeVisible();
  await expect(page.getByText('event-1')).toBeVisible();
  expect(requestedUrls.some((url) => url.includes('includeContributors=true'))).toBe(true);

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
