import { expect, test, type Page } from '@playwright/test';

/**
 * The home-page "Ask a stats question" widget (issue #816).
 *
 * The backend is mocked throughout: the deployed natural-language endpoint calls a
 * paid provider, so no test may reach it.
 */

const ASK_ENDPOINT = '**/api/v1/natural-language-queries';

const ANSWERED = {
  data: {
    question: 'Who scored the most runs in the 2024 Indian Premier League season?',
    model: 'claude-haiku-4-5-20251001',
    evaluation: {
      outcome: 'answered',
      definitionVersion: `qdv1_${'a'.repeat(43)}`,
      definition: {
        kind: 'leaderboard',
        metric: 'most_runs',
        scope: 'season',
        season: { competitionName: 'Indian Premier League', seasonLabel: '2024' },
        limit: 10,
      },
      resolved: {
        participantIds: [],
        competitionId: '4',
        seasonId: 'season_test',
        season: '2024',
      },
      sources: [
        {
          endpoint: '/api/v1/statistics/leaderboards?scope=season&metric=most_runs',
          statisticIds: [],
        },
      ],
      result: {
        scope: 'season',
        competitionId: '4',
        competitionName: 'Indian Premier League',
        season: '2024',
        seasonId: 'season_test',
        metric: 'most_runs',
        limit: 10,
        qualification: null,
        tieBreakers: ['metricValue', 'participantName', 'participantId'],
        entries: [
          { rank: 1, participantId: '8452', participantName: 'V Kohli', value: 741 },
          { rank: 2, participantId: '12703', participantName: 'RD Gaikwad', value: 583 },
        ],
      },
    },
  },
};

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
  ).toBe(false);
}

async function openWidget(page: Page) {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Ask a stats question' });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  await expect(page.getByRole('dialog', { name: 'Ask a stats question' })).toBeVisible();
  return trigger;
}

test(
  'a visitor asks a question and reads the interpretation before the answer',
  { tag: '@mobile' },
  async ({ page }) => {
    await page.route(ASK_ENDPOINT, async (route) => {
      expect(route.request().method()).toBe('POST');
      // No credential is sent: the operation is public.
      expect(route.request().headers()['authorization']).toBeUndefined();
      await route.fulfill({ json: ANSWERED });
    });

    await openWidget(page);

    await expect(page.getByText(/sent to Anthropic/i)).toBeVisible();
    await page
      .getByRole('button', {
        name: 'Who scored the most runs in the 2024 Indian Premier League season?',
      })
      .click();
    await page.getByRole('button', { name: 'Ask', exact: true }).click();

    await expect(page.getByText('Most runs · Indian Premier League 2024 · top 10')).toBeVisible();
    await expect(page.getByRole('link', { name: 'V Kohli' })).toHaveAttribute(
      'href',
      '/participants/8452',
    );
    await expect(page.getByRole('link', { name: 'this season' })).toHaveAttribute(
      'href',
      '/seasons/season_test',
    );
    await expectNoHorizontalOverflow(page);
  },
);

test('the widget reports a service that is busy today', async ({ page }) => {
  await page.route(ASK_ENDPOINT, async (route) => {
    await route.fulfill({
      status: 429,
      headers: { 'Retry-After': '3600' },
      json: {
        error: {
          code: 'GLOBAL_DAILY_LIMIT_REACHED',
          message: 'The service has answered its maximum number of questions today.',
        },
      },
    });
  });

  await openWidget(page);
  await page.getByLabel('Your question').fill('Who has taken the most wickets in the IPL?');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();

  await expect(page.getByText(/as many questions as it can today/i)).toBeVisible();
  await expect(page.getByText(/published statistics pages remain available/i)).toBeVisible();
});

test('Escape closes the widget and returns focus to the trigger', async ({ page }) => {
  const trigger = await openWidget(page);

  await page.keyboard.press('Escape');

  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('the answered widget does not make the page scroll sideways @mobile', async ({ page }) => {
  await page.route(ASK_ENDPOINT, async (route) => {
    await route.fulfill({ json: ANSWERED });
  });

  await openWidget(page);
  await page.getByLabel('Your question').fill('Who scored the most runs in the 2024 IPL season?');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  await expect(page.getByText('Most runs · Indian Premier League 2024 · top 10')).toBeVisible();

  await expectNoHorizontalOverflow(page);
});

test('the question field is keyboard-operable and bounded at 300 characters', async ({ page }) => {
  await openWidget(page);

  const field = page.getByLabel('Your question');
  await expect(field).toBeFocused();
  await expect(page.getByText('0 of 300 characters')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ask', exact: true })).toBeDisabled();

  await field.fill('a'.repeat(320));

  await expect(field).toHaveValue('a'.repeat(300));
  await expect(page.getByText('300 of 300 characters')).toBeVisible();
});

const VERSION = `qdv1_${'a'.repeat(43)}`;

function battingFigures(overrides: Record<string, unknown> = {}) {
  return {
    innings: 15,
    runsScored: 741,
    ballsFaced: 479,
    dismissals: 12,
    notOuts: 3,
    battingAverage: 61.75,
    fours: 62,
    sixes: 38,
    fifties: 5,
    hundreds: 1,
    highestScore: 113,
    highestScoreNotOut: false,
    strikeRate: 154.7,
    ...overrides,
  };
}

function seasonRow(
  participantId: string,
  participantName: string,
  statisticId: string,
  batting: Record<string, unknown>,
  competitionId: string,
  competitionName: string,
  season: string,
  seasonId: string,
) {
  return {
    statisticId,
    participantId,
    participantName,
    appearances: 15,
    fixtureCount: 15,
    sourceEventCount: 400,
    batting,
    bowling: null,
    fielding: { catches: 1, stumpings: 0, runOutInvolvements: 0 },
    scope: 'season',
    statisticCode: 'participant_season',
    competitionId,
    competitionName,
    season,
    seasonId,
  };
}

/**
 * A published aggregate carries every season the player has, because the endpoint
 * behind it takes no season filter. The second row is the one an answer must not
 * show when the reader asked about 2024.
 */
function aggregate(
  participantId: string,
  participantName: string,
  statisticId: string,
  batting: Record<string, unknown>,
) {
  return {
    participantId,
    participantName,
    status: 'complete',
    scope: { superOversIncluded: false },
    warnings: [],
    statistics: [
      seasonRow(
        participantId,
        participantName,
        statisticId,
        batting,
        '4',
        'Indian Premier League',
        '2024',
        'season_ipl_2024',
      ),
      seasonRow(
        participantId,
        participantName,
        statisticId + '-other',
        { ...batting, runsScored: 11111 },
        '326',
        'Asia Cup',
        '2022',
        'season_asia_2022',
      ),
    ],
  };
}

test('a season-scoped answer shows the season asked about and not every other one', async ({
  page,
}) => {
  await page.route(ASK_ENDPOINT, async (route) => {
    await route.fulfill({
      json: {
        data: {
          question: 'What was V Kohli average in the 2024 IPL season?',
          model: 'claude-haiku-4-5-20251001',
          evaluation: {
            outcome: 'answered',
            definitionVersion: VERSION,
            definition: {
              kind: 'participant_statistics',
              participant: { name: 'V Kohli' },
              scope: 'season',
              season: { competitionName: 'Indian Premier League', seasonLabel: '2024' },
            },
            resolved: {
              participantIds: ['8452'],
              competitionId: '4',
              seasonId: 'season_test',
              season: '2024',
            },
            sources: [
              {
                endpoint: '/api/v1/participants/8452/statistics?scope=season',
                statisticIds: ['stat_2024'],
              },
            ],
            result: aggregate('8452', 'V Kohli', 'stat_2024', battingFigures()),
          },
        },
      },
    });
  });

  await openWidget(page);
  await page.getByLabel('Your question').fill('What was V Kohli average in the 2024 IPL season?');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();

  await expect(page.getByText('V Kohli · Indian Premier League 2024')).toBeVisible();
  await expect(page.getByText('741').first()).toBeVisible();
  // The row from another season must not reach the reader.
  await expect(page.getByText('11111')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test('a comparison shows a compact head-to-head naming the leader in words @mobile', async ({
  page,
}) => {
  await page.route(ASK_ENDPOINT, async (route) => {
    await route.fulfill({
      json: {
        data: {
          question: 'Compare V Kohli and RD Gaikwad in the 2024 IPL season',
          model: 'claude-haiku-4-5-20251001',
          evaluation: {
            outcome: 'answered',
            definitionVersion: VERSION,
            definition: {
              kind: 'participant_comparison',
              participants: [{ name: 'V Kohli' }, { name: 'RD Gaikwad' }],
              scope: 'season',
              season: { competitionName: 'Indian Premier League', seasonLabel: '2024' },
            },
            resolved: {
              participantIds: ['8452', '12703'],
              competitionId: '4',
              seasonId: 'season_test',
              season: '2024',
            },
            sources: [
              {
                endpoint: '/api/v1/participants/8452/statistics?scope=season',
                statisticIds: ['stat_k'],
              },
              {
                endpoint: '/api/v1/participants/12703/statistics?scope=season',
                statisticIds: ['stat_g'],
              },
            ],
            result: [
              aggregate('8452', 'V Kohli', 'stat_k', battingFigures()),
              aggregate(
                '12703',
                'RD Gaikwad',
                'stat_g',
                battingFigures({ runsScored: 583, battingAverage: 53 }),
              ),
            ],
          },
        },
      },
    });
  });

  await openWidget(page);
  await page
    .getByLabel('Your question')
    .fill('Compare V Kohli and RD Gaikwad in the 2024 IPL season');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();

  const runs = page.getByRole('row', { name: /Runs/i });
  await expect(runs).toBeVisible();
  await expect(runs).toContainText('leads');
  await expect(page.getByText('Full published statistics')).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('a refused question offers something answerable, with no further model call', async ({
  page,
}) => {
  let askCalls = 0;
  let evaluateCalls = 0;

  await page.route(ASK_ENDPOINT, async (route) => {
    askCalls += 1;
    await route.fulfill({
      json: {
        data: {
          question: 'Who is the best batter in the IPL?',
          model: 'claude-haiku-4-5-20251001',
          evaluation: {
            outcome: 'unsupported',
            definitionVersion: VERSION,
            definition: { kind: 'unsupported', reason: 'ambiguous' },
            reason: 'ambiguous',
          },
          suggestions: [
            {
              kind: 'leaderboard',
              metric: 'most_runs',
              scope: 'competition',
              competition: { name: 'Indian Premier League' },
              limit: 10,
            },
          ],
        },
      },
    });
  });

  await page.route('**/api/v1/query-definitions/evaluate', async (route) => {
    evaluateCalls += 1;
    await route.fulfill({ json: { data: ANSWERED.data.evaluation } });
  });

  await openWidget(page);
  await page.getByLabel('Your question').fill('Who is the best batter in the IPL?');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();

  await expect(page.getByText('Questions this can answer:')).toBeVisible();
  const suggestion = page.getByRole('button', {
    name: 'Most runs · Indian Premier League · top 10',
  });
  await expect(suggestion).toBeVisible();
  await suggestion.click();

  await expect(page.getByRole('link', { name: 'V Kohli' })).toBeVisible();
  expect(askCalls).toBe(1);
  expect(evaluateCalls).toBe(1);
});
