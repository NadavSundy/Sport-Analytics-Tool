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
