import AxeBuilder from '@axe-core/playwright';
import type { ParticipantFixtureStatistic } from '@sport-analytics/contracts';
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
  venue: null,
  toss: null,
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
  metrics: {
    deliveryRuns: 5,
    penaltyRuns: 0,
    totalRuns: 5,
    wicketsLost: 0,
    legalBalls: 0,
    overs: '0.0',
    runRate: null,
    powerplay: {
      ranges: [{ fromBall: 0.1, toBall: 5.6, type: 'mandatory' }],
      runs: 42,
      wicketsLost: 1,
      legalBalls: 36,
      overs: '6.0',
      runRate: 7,
      sourceEventCount: 38,
    },
    extras: { total: 1, wides: 1, noBalls: 0, byes: 0, legByes: 0, penaltyRuns: 0 },
  },
};

const secondInningsStatistic = {
  ...inningsStatistic,
  statisticId: 'stat-innings-2',
  inningsId: 'innings-2',
  inningsOrdinal: 1,
  competitorId: 'team-2',
  competitorName: 'Team Two',
  metrics: { ...inningsStatistic.metrics, powerplay: null },
};

const participantStatistic: ParticipantFixtureStatistic = {
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
  bowling: {
    runsConceded: 5,
    wides: 0,
    noBalls: 0,
    legalBallsBowled: 6,
    oversBowled: '1.0',
    economyRate: 5,
    wicketsTaken: 1,
  },
};

const secondParticipantStatistic = {
  ...participantStatistic,
  statisticId: 'stat-participant-2',
  participantId: 'striker-2',
  participantName: 'Second Batter',
  competitorId: 'team-2',
  competitorName: 'Team Two',
};

function fullTeamScorecard(
  seed: ParticipantFixtureStatistic,
  prefix: string,
): ParticipantFixtureStatistic[] {
  return Array.from({ length: 11 }, (_, index) => ({
    ...seed,
    statisticId: `${seed.statisticId}-${index + 1}`,
    participantId: `${prefix}-${index + 1}`,
    participantName:
      index === 0 ? seed.participantName : `${seed.competitorName} Player ${index + 1}`,
    battingPosition: index + 1,
    battingParticipation: index === 10 ? ('did_not_bat' as const) : ('batted' as const),
    dismissal:
      index === 10
        ? null
        : index === 0
          ? seed.dismissal
          : { status: 'dismissed' as const, kind: 'caught at deep midwicket', eventId: null },
    batting:
      index === 10
        ? null
        : {
            runsScored: index,
            ballsFaced: index + 1,
            strikeRate: index === 0 ? (seed.batting?.strikeRate ?? null) : index * 10,
            fours: index % 3,
            sixes: index % 2,
          },
    bowling: index < 6 ? seed.bowling : null,
  }));
}

const teamOneScorecard = fullTeamScorecard(participantStatistic, 'team-one-player');
const teamTwoScorecard = fullTeamScorecard(secondParticipantStatistic, 'team-two-player');

async function readDetailSpacing(page: Page) {
  return page.evaluate(() => {
    const detailPage = document.querySelector<HTMLElement>('.detail-page');
    const heading = document.querySelector<HTMLElement>('.page-heading--detail');
    const firstFact = document.querySelector<HTMLElement>('.record-facts > div');
    const matchStatistics = document.querySelector<HTMLElement>('.fixture-statistics-overview');
    const summary = document.querySelector<HTMLElement>('.match-summary');
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

async function readScorecardLayoutAudit(page: Page) {
  return page.evaluate(() => {
    const tables = [
      ...document.querySelectorAll<HTMLTableElement>(
        '.fixture-statistics-overview .statistics-table',
      ),
    ].filter((table) => {
      const details = table.closest('details');
      return table.getClientRects().length > 0 && (!details || details.open);
    });
    return {
      pageWidth: {
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      },
      tables: tables.map((table) => {
        const wrapper = table.closest<HTMLElement>('.ui-data-table');
        if (!wrapper) throw new Error('Scorecard table has no responsive wrapper.');
        const rows = [...table.tBodies[0]!.rows];
        const tableRect = table.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();
        const section = wrapper.closest<HTMLElement>('.statistics-section, .scorecard-group');
        if (!section) throw new Error('Statistics table has no containing section.');
        const sectionRect = section.getBoundingClientRect();
        const finalHeader = table.tHead?.rows[0]?.cells.item(table.tHead.rows[0].cells.length - 1);
        if (!finalHeader) throw new Error('Scorecard table has no final header.');
        const firstRowCells = [...rows[0]!.cells];
        const headerCells = [...finalHeader.parentElement!.children] as HTMLElement[];
        const finalColumnCells = [
          finalHeader,
          ...rows.map((row) => row.cells.item(row.cells.length - 1)),
        ].filter((cell): cell is HTMLTableCellElement => cell !== null);
        const contentEndGaps = finalColumnCells.map((cell) => {
          const range = document.createRange();
          range.selectNodeContents(cell);
          return cell.getBoundingClientRect().right - range.getBoundingClientRect().right;
        });
        const contentRange = document.createRange();
        contentRange.selectNodeContents(finalHeader);
        const contentRect = contentRange.getBoundingClientRect();
        const previousContentRange = document.createRange();
        previousContentRange.selectNodeContents(headerCells[headerCells.length - 2] as HTMLElement);
        const previousContentRect = previousContentRange.getBoundingClientRect();
        const wrapperStyle = getComputedStyle(wrapper);
        return {
          caption: table.caption?.textContent?.trim() ?? '',
          tableWidth: Math.round(tableRect.width),
          rows: rows.length,
          visibleRows: rows.filter((row) => {
            const style = getComputedStyle(row);
            const rect = row.getBoundingClientRect();
            return (
              style.display !== 'none' &&
              style.visibility !== 'hidden' &&
              rect.width > 0 &&
              rect.height > 0 &&
              rect.top >= tableRect.top &&
              rect.bottom <= tableRect.bottom + 1
            );
          }).length,
          wrapperClientHeight: wrapper.clientHeight,
          wrapperScrollHeight: wrapper.scrollHeight,
          hasVerticalOverflow:
            ['auto', 'scroll'].includes(wrapperStyle.overflowY) &&
            wrapper.scrollHeight > wrapper.clientHeight + 1,
          tableWithinWrapper:
            tableRect.left >= wrapperRect.left - 1 &&
            tableRect.right <= wrapperRect.right + 1 &&
            tableRect.top >= wrapperRect.top - 1 &&
            tableRect.bottom <= wrapperRect.bottom + 1,
          tableFillsWrapper:
            Math.abs(tableRect.left - wrapperRect.left) <= 1 &&
            Math.abs(tableRect.right - wrapperRect.right) <= 1,
          wrapperWithinSection:
            wrapperRect.left >= sectionRect.left - 1 &&
            wrapperRect.right <= sectionRect.right + 1 &&
            wrapperRect.top >= sectionRect.top - 1 &&
            wrapperRect.bottom <= sectionRect.bottom + 1,
          columnsAligned: headerCells.every((cell, index) => {
            const headerRect = cell.getBoundingClientRect();
            const bodyRect = firstRowCells[index]?.getBoundingClientRect();
            return (
              bodyRect !== undefined &&
              Math.abs(headerRect.left - bodyRect.left) <= 1 &&
              Math.abs(headerRect.width - bodyRect.width) <= 1
            );
          }),
          columnWidths: headerCells.map((cell) => Math.round(cell.getBoundingClientRect().width)),
          finalContentEndGap: Math.round(Math.min(...contentEndGaps)),
          adjacentContentGap: Math.round(contentRect.left - previousContentRect.right),
        };
      }),
    };
  });
}

function expectCompleteScorecardLayout(
  audit: Awaited<ReturnType<typeof readScorecardLayoutAudit>>,
  desktop: boolean,
) {
  expect(audit.pageWidth.scroll).toBe(audit.pageWidth.client);
  expect(audit.tables.map(({ caption }) => caption)).toEqual([
    'Score, progress, run rate and extras for each standard innings',
    'Authoritative powerplay performance by innings',
    'Team One batting scorecard',
    'Team Two batting scorecard',
    'Team One bowling scorecard',
    'Team Two bowling scorecard',
  ]);
  expect(audit.tables.map(({ rows }) => rows)).toEqual([2, 1, 11, 11, 6, 6]);
  expect(audit.tables.every(({ rows, visibleRows }) => rows === visibleRows)).toBe(true);
  expect(audit.tables.every(({ hasVerticalOverflow }) => !hasVerticalOverflow)).toBe(true);
  expect(audit.tables.every(({ wrapperWithinSection }) => wrapperWithinSection)).toBe(true);
  expect(audit.tables.every(({ columnsAligned }) => columnsAligned)).toBe(true);

  if (!desktop) return;

  expect(audit.tables.every(({ tableWithinWrapper }) => tableWithinWrapper)).toBe(true);
  expect(audit.tables.every(({ tableFillsWrapper }) => tableFillsWrapper)).toBe(true);
  const [innings, , ...scorecards] = audit.tables;
  const inningsMetricWidths = innings?.columnWidths.slice(1) ?? [];
  expect(Math.max(...inningsMetricWidths)).toBeLessThanOrEqual(128);
  expect(innings?.columnWidths[0]).toBeGreaterThan(Math.max(...inningsMetricWidths));
  expect(innings?.adjacentContentGap).toBeGreaterThanOrEqual(32);
  expect(innings?.adjacentContentGap).toBeLessThanOrEqual(112);
  for (const table of scorecards) {
    const numericWidths = table.caption.includes('batting')
      ? table.columnWidths.slice(1, -1)
      : table.columnWidths.slice(1);
    expect(Math.max(...numericWidths)).toBeLessThanOrEqual(128);
    expect(table.columnWidths[0]).toBeGreaterThan(Math.max(...numericWidths));
    expect(table.finalContentEndGap).toBeGreaterThanOrEqual(28);
    expect(table.finalContentEndGap).toBeLessThanOrEqual(192);
    if (table.caption.includes('batting')) {
      expect(table.columnWidths.at(-1)).toBeGreaterThan(Math.max(...numericWidths));
      expect(table.columnWidths.at(-1)).toBeLessThan(table.columnWidths[0]!);
      expect(table.adjacentContentGap).toBeGreaterThanOrEqual(24);
      expect(table.adjacentContentGap).toBeLessThanOrEqual(64);
    } else {
      expect(table.adjacentContentGap).toBeGreaterThanOrEqual(32);
      expect(table.adjacentContentGap).toBeLessThanOrEqual(112);
    }
  }
}

test(
  'anonymous users open the responsive match overview and calculation trace',
  { tag: '@mobile' },
  async ({ page }) => {
    const isMobile = (page.viewportSize()?.width ?? 0) < 900;
    if (!isMobile) {
      await page.setViewportSize({ width: 1440, height: 900 });
    }
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
                  wicketsLost: 0,
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
              highestScorers: [],
              warnings: [],
              statistics: [
                inningsStatistic,
                secondInningsStatistic,
                ...teamOneScorecard,
                ...teamTwoScorecard,
              ],
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
    await expect(page.getByRole('heading', { name: 'Batting scorecard' })).toBeVisible();
    const powerplay = page.getByRole('region', { name: 'Powerplay' });
    await expect(powerplay).toContainText('Team One');
    await expect(powerplay).toContainText('42/1');
    await expect(powerplay).toContainText('6.0');
    await expect(powerplay).toContainText(
      'Team Two innings 2: authoritative powerplay information is unavailable.',
    );
    await expect(powerplay).not.toContainText('0.1');
    const powerplayTable = powerplay.getByRole('table');
    await powerplayTable.locator('..').focus();
    await expect(powerplayTable.locator('..')).toBeFocused();
    if (process.env.CAPTURE_ISSUE_634_EVIDENCE) {
      await page.screenshot({
        fullPage: true,
        path: `evidence/validation/issue-634-powerplay-${isMobile ? 'mobile' : 'desktop'}.png`,
      });
    }
    await expect(page.getByRole('link', { name: 'Opening Batter' }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Participating players' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View fixture statistics' })).toHaveCount(0);
    expect(requestedUrls.some((url) => url.endsWith('/fixtures/fixture-1/statistics'))).toBe(true);
    const detailSpacing = await readDetailSpacing(page);
    expect(detailSpacing).toEqual({
      pagePaddingTop: isMobile ? 24 : 32,
      headingPaddingTop: 16,
      headingPaddingBottom: 16,
      factPaddingTop: 16,
      matchStatisticsMarginTop: 32,
      summaryMarginTop: 24,
    });
    expect(Object.values(detailSpacing).every((value) => value === null || value % 4 === 0)).toBe(
      true,
    );

    if (!isMobile) {
      for (const viewport of [
        { width: 1280, height: 720 },
        { width: 1366, height: 768 },
        { width: 1440, height: 900 },
        { width: 1600, height: 900 },
        { width: 1920, height: 1080 },
      ]) {
        await page.setViewportSize(viewport);
        const layoutAudit = await readScorecardLayoutAudit(page);
        if (process.env.MEASURE_ISSUE_582_LAYOUT && [1280, 1920].includes(viewport.width)) {
          console.log(`issue-582-layout-${viewport.width} ${JSON.stringify(layoutAudit.tables)}`);
        }
        expectCompleteScorecardLayout(layoutAudit, true);
        if (process.env.CAPTURE_ISSUE_582_EVIDENCE && process.env.TEMP) {
          await page.screenshot({
            fullPage: true,
            path: `${process.env.TEMP}/issue-582-statistics-${viewport.width}.png`,
          });
        }
      }
    } else {
      expectCompleteScorecardLayout(await readScorecardLayoutAudit(page), false);
      if (process.env.CAPTURE_ISSUE_582_EVIDENCE && process.env.TEMP) {
        await page.screenshot({
          fullPage: true,
          path: `${process.env.TEMP}/issue-582-statistics-pixel-7.png`,
        });
      }
      await page.setViewportSize({ width: 360, height: 800 });
      expectCompleteScorecardLayout(await readScorecardLayoutAudit(page), false);
      if (process.env.CAPTURE_ISSUE_582_EVIDENCE && process.env.TEMP) {
        await page.screenshot({
          fullPage: true,
          path: `${process.env.TEMP}/issue-582-statistics-360.png`,
        });
      }
    }

    await expect(page).not.toHaveURL(/sign-in/);

    const dayStatisticsSpacing = await readDetailSpacing(page);
    expect(dayStatisticsSpacing).toEqual({
      pagePaddingTop: isMobile ? 24 : 32,
      headingPaddingTop: 16,
      headingPaddingBottom: 16,
      factPaddingTop: 16,
      matchStatisticsMarginTop: 32,
      summaryMarginTop: 24,
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

    await page.getByText('How these match statistics are calculated', { exact: true }).click();
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
