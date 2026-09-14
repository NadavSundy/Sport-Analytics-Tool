import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const fixture = {
  fixtureId: 'fixture-1',
  competitionId: 'competition-1',
  competitionName: 'Premier Cricket League',
  seasonId: 'season-1',
  season: '2026',
  seasonLabel: '2026 season',
  competitors: [
    { competitorId: 'team-1', name: 'Team One' },
    { competitorId: 'team-2', name: 'Team Two' },
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
  competitorId: 'team-1',
  competitorName: 'Team One',
  sourceEventCount: 1,
  metrics: { deliveryRuns: 5, penaltyRuns: 0, totalRuns: 5 },
};

const participantStatistic = {
  statisticId: 'stat-participant-1',
  fixtureId: 'fixture-1',
  scope: 'participant',
  statisticCode: 'participant_fixture',
  participantId: 'striker-1',
  participantName: 'Opening Batter',
  competitorId: 'team-1',
  competitorName: 'Team One',
  sourceEventCount: 1,
  battingPosition: 1,
  battingParticipation: 'batted',
  dismissal: { status: 'not_out', kind: null, eventId: null },
  batting: { runsScored: 4, ballsFaced: 1, strikeRate: 400, fours: 1, sixes: 0 },
  bowling: null,
};

async function readDetailSpacing(page: Page) {
  return page.evaluate(() => {
    const detailPage = document.querySelector<HTMLElement>('.detail-page');
    const heading = document.querySelector<HTMLElement>('.page-heading--detail');
    const firstFact = document.querySelector<HTMLElement>('.record-facts > div');
    const matchStatistics = document.querySelector<HTMLElement>('.fixture-statistics-overview');
    const summary = document.querySelector<HTMLElement>('.statistics-summary');
    if (!detailPage || !heading || !firstFact || !matchStatistics || !summary) {
      throw new Error('The public detail layout was not rendered.');
    }

    return {
      pagePaddingTop: Number.parseFloat(getComputedStyle(detailPage).paddingTop),
      headingPaddingTop: Number.parseFloat(getComputedStyle(heading).paddingTop),
      headingPaddingBottom: Number.parseFloat(getComputedStyle(heading).paddingBottom),
      factPaddingTop: Number.parseFloat(getComputedStyle(firstFact).paddingTop),
      matchStatisticsMarginTop: Number.parseFloat(getComputedStyle(matchStatistics).marginTop),
      summaryMarginTop: Number.parseFloat(getComputedStyle(summary).marginTop),
    };
  });
}

test(
  'anonymous users open the responsive match overview and calculation trace',
  { tag: '@mobile' },
  async ({ page }) => {
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
                  strikerParticipantName: 'Opening Batter',
                  nonStrikerParticipantId: 'non-striker-1',
                  nonStrikerParticipantName: 'Non-striker',
                  bowlerParticipantId: 'bowler-1',
                  bowlerParticipantName: 'Opening Bowler',
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

      if (
        url.pathname.endsWith('/events/export.csv') ||
        url.pathname.endsWith('/events/export.json')
      ) {
        await route.fulfill({
          body: url.pathname.endsWith('.csv')
            ? 'eventId\n event-1\n'
            : JSON.stringify({ data: [] }),
          contentType: url.pathname.endsWith('.csv')
            ? 'text/csv; charset=utf-8'
            : 'application/json',
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
                winnerCompetitorName: 'Team One',
                eliminatorCompetitorId: null,
                eliminatorCompetitorName: null,
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

      if (url.pathname.endsWith('/participants')) {
        await route.fulfill({
          json: {
            data: [{ participantId: 'striker-1', displayName: 'Opening Batter' }],
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

    await page.goto('/fixtures/fixture-1');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Team One vs Team Two' }),
    ).toBeVisible();
    await expect(page.getByText('Team One won by 5 wickets.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Player statistics' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Opening Batter' }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Participating players' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View fixture statistics' })).toHaveCount(0);
    expect(requestedUrls.some((url) => url.endsWith('/fixtures/fixture-1/statistics'))).toBe(true);
    const isMobile = (page.viewportSize()?.width ?? 0) < 900;
    const detailSpacing = await readDetailSpacing(page);
    expect(detailSpacing).toEqual({
      pagePaddingTop: isMobile ? 24 : 32,
      headingPaddingTop: 16,
      headingPaddingBottom: 16,
      factPaddingTop: 16,
      matchStatisticsMarginTop: 32,
      summaryMarginTop: 32,
    });
    expect(Object.values(detailSpacing).every((value) => value === null || value % 4 === 0)).toBe(
      true,
    );

    await expect(page).not.toHaveURL(/sign-in/);

    const dayStatisticsSpacing = await readDetailSpacing(page);
    expect(dayStatisticsSpacing).toEqual({
      pagePaddingTop: isMobile ? 24 : 32,
      headingPaddingTop: 16,
      headingPaddingBottom: 16,
      factPaddingTop: 16,
      matchStatisticsMarginTop: 32,
      summaryMarginTop: 32,
    });

    if (process.env.CAPTURE_ISSUE_195_EVIDENCE && !isMobile) {
      await page.screenshot({
        fullPage: true,
        path: 'evidence/validation/issue-195-statistics-after-desktop.png',
      });
    }

    await page.getByLabel('Switch to Night Match theme').check();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
    expect(await readDetailSpacing(page)).toEqual(dayStatisticsSpacing);

    if (process.env.CAPTURE_ISSUE_195_EVIDENCE && isMobile) {
      await page.screenshot({
        fullPage: true,
        path: 'evidence/validation/issue-195-statistics-after-mobile.png',
      });
    }

    const accessibilityResults = await new AxeBuilder({ page }).analyze();
    expect(
      accessibilityResults.violations.filter(
        (violation) => violation.impact === 'serious' || violation.impact === 'critical',
      ),
    ).toEqual([]);

    const calculationLink = page.getByRole('link', { name: 'View calculation trace' }).first();
    await calculationLink.focus();
    await expect(calculationLink).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Team One innings 0 total' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Contributing events' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Delivery 1' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Opening Bowler' })).toBeVisible();
    await expect(page.getByText('event-1')).toHaveCount(0);
    expect(requestedUrls.some((url) => url.includes('includeContributors=true'))).toBe(true);

    await expect(
      page.getByText('Download the 1 event shown in this trace, in match order, for analysis.'),
    ).toBeVisible();
    const csvDownload = page.getByRole('button', { name: 'Download CSV' });
    await csvDownload.focus();
    await expect(csvDownload).toBeFocused();
    const [csv] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Enter')]);
    expect(csv.suggestedFilename()).toBe(
      'fixture-fixture-1-innings-innings-1-team-team-1-events.csv',
    );
    await expect(page.getByText('CSV export of 1 event downloaded.')).toBeVisible();
    // Issue #467: the trace exports its own statistic's events, never a
    // filtered slice or a single page of one.
    await expect
      .poll(() =>
        requestedUrls.some((url) =>
          url.endsWith('/fixtures/fixture-1/statistics/stat-innings-1/events/export.csv'),
        ),
      )
      .toBe(true);
    expect(requestedUrls.some((url) => url.includes('/fixtures/fixture-1/events/export'))).toBe(
      false,
    );

    const [json] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download JSON' }).click(),
    ]);
    expect(json.suggestedFilename()).toBe(
      'fixture-fixture-1-innings-innings-1-team-team-1-events.json',
    );
    await expect
      .poll(() =>
        requestedUrls.some((url) =>
          url.endsWith('/fixtures/fixture-1/statistics/stat-innings-1/events/export.json'),
        ),
      )
      .toBe(true);

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  },
);
