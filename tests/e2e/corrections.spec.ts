import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';

const eventId = '123e4567-e89b-42d3-a456-426614174000';

const fixture = {
  fixtureId: '7',
  competitionId: '5',
  competitionName: 'Premier T20',
  seasonId: '15',
  season: '2026',
  seasonLabel: '2026',
  competitors: [
    { competitorId: '30', name: 'Wanderers' },
    { competitorId: '31', name: 'Strikers' },
  ],
  matchType: 'T20',
  teamType: 'international',
  gender: 'female',
  ballsPerOver: 6,
  scheduledOvers: 20,
  startDate: '2026-08-20',
  endDate: '2026-08-20',
};

const events = [
  {
    eventId,
    inningsId: '10',
    sequenceNumber: 1,
    overNumber: 0,
    positionInOver: 0,
    ballNumber: '0.1',
    strikerId: '20',
    nonStrikerId: '21',
    bowlerId: '22',
    runs: { offBat: 4, extras: 0, total: 4, nonBoundary: false },
    extras: {},
    wickets: [],
  },
];

function currentUser(role: 'viewer' | 'submitter' | 'admin') {
  return {
    user: {
      id: '17',
      subject: 'approved-user',
      displayName: 'Submitter User',
      role,
      approvalState: role === 'viewer' ? 'pending' : 'approved',
      requestedCompetition: role === 'viewer' ? null : { competitionId: '5', name: 'Premier T20' },
      competitionIds: role === 'viewer' ? [] : ['5'],
    },
  };
}

function statistics(totalRuns: number) {
  return {
    data: {
      fixtureId: '7',
      status: 'complete',
      scope: { superOversIncluded: false },
      outcome: {
        kind: 'no_result',
        winnerCompetitorId: null,
        winnerCompetitorName: null,
        eliminatorCompetitorId: null,
        eliminatorCompetitorName: null,
        margin: null,
        method: null,
        decidedByBowlOut: false,
      },
      warnings: [],
      statistics: [
        {
          statisticId: '100',
          fixtureId: '7',
          scope: 'innings',
          statisticCode: 'team_total',
          inningsId: '10',
          inningsOrdinal: 0,
          competitorId: '30',
          competitorName: 'Wanderers',
          sourceEventCount: 1,
          metrics: { deliveryRuns: totalRuns, penaltyRuns: 0, totalRuns },
        },
      ],
    },
  };
}

async function fulfill(route: Route, status: number, body: unknown) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function openAcceptedSubmission(page: Page) {
  await page.goto('/submissions/new');
  await page.getByRole('radio', { name: /Advanced technical JSON/ }).click();
  await page.getByLabel('Delivery events JSON').fill(JSON.stringify(events, null, 2));
  await page.getByRole('button', { name: 'Submit events' }).click();
  await expect(page.getByRole('heading', { name: 'Submission accepted' })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Save correction' })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const now = Math.floor(Date.now() / 1_000);
    window.localStorage.setItem(
      'sb-e2e-auth-token',
      JSON.stringify({
        access_token: 'approved-e2e-token',
        refresh_token: 'managed-by-supabase',
        expires_in: 3_600,
        expires_at: now + 3_600,
        token_type: 'bearer',
        user: {
          id: 'approved-user',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'submitter@example.com',
          app_metadata: {},
          user_metadata: {},
          identities: [],
          created_at: '2026-08-16T00:00:00.000Z',
        },
      }),
    );
  });
});

test('administrator direct-import correction works by keyboard and refreshes statistics', async ({
  page,
}) => {
  let statisticsRequests = 0;

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname.endsWith('/auth/me')) {
      await fulfill(route, 200, currentUser('admin'));
      return;
    }
    if (url.pathname.endsWith('/fixtures')) {
      await fulfill(route, 200, { data: [fixture], pagination: { nextCursor: null } });
      return;
    }
    if (url.pathname.endsWith('/submissions') && request.method() === 'POST') {
      await fulfill(route, 201, {
        data: {
          submissionId: '300',
          fixtureId: '7',
          submitterId: '17',
          status: 'accepted',
          receivedAt: '2026-08-16T09:30:00.000Z',
          schemaVersion: '1.0',
          eventCount: 1,
        },
      });
      return;
    }
    if (url.pathname.endsWith('/participants')) {
      await fulfill(route, 200, {
        data: [
          { participantId: '20', displayName: 'Opening Batter' },
          { participantId: '21', displayName: 'Non-striker' },
          { participantId: '22', displayName: 'Opening Bowler' },
        ],
        pagination: { nextCursor: null },
      });
      return;
    }
    if (url.pathname.endsWith('/fixtures/7/statistics')) {
      statisticsRequests += 1;
      await fulfill(route, 200, statistics(statisticsRequests === 1 ? 4 : 6));
      return;
    }
    if (url.pathname.endsWith(`/submissions/events/${eventId}`)) {
      const body = request.postDataJSON();
      expect(body).toMatchObject({
        fixtureId: '7',
        schemaVersion: '1.0',
        reason: 'Correct scorer transcription.',
        event: { runs: { offBat: 6, extras: 0, total: 6 } },
      });
      expect(body.event).not.toHaveProperty('sequenceNumber');
      expect(JSON.stringify(body)).not.toMatch(/statistics|finalScore/i);
      await fulfill(route, 200, {
        data: {
          eventId,
          fixtureId: '7',
          revision: 2,
          refreshedScopes: [
            { scope: 'fixture', participantId: null, competitionId: '5', season: '2026' },
          ],
        },
      });
      return;
    }

    await fulfill(route, 404, { error: { code: 'NOT_FOUND', message: 'Not found.' } });
  });

  await openAcceptedSubmission(page);
  await expect(page.getByLabel('Striker', { exact: true })).toHaveValue('20');
  await expect(page.getByLabel('Striker', { exact: true })).toContainText('Opening Batter');

  const offBat = page.getByLabel(/Runs off the bat/);
  await offBat.focus();
  await offBat.fill('6');
  await page.getByLabel('Reason for correction').fill('Correct scorer transcription.');
  const save = page.getByRole('button', { name: 'Save correction' });
  await save.focus();
  await page.keyboard.press('Enter');

  await expect(page.getByRole('heading', { name: 'Correction saved' })).toBeFocused();
  await expect(page.getByText(/Revision 2 is now current/)).toBeVisible();
  await expect(page.getByText('Delivery total').locator('..')).toContainText('6');
  await expect.poll(() => statisticsRequests).toBe(2);

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
});

test('administrator correction validation remains associated with the relevant input', async ({
  page,
}) => {
  let statisticsRequests = 0;

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname.endsWith('/auth/me')) {
      await fulfill(route, 200, currentUser('admin'));
    } else if (url.pathname.endsWith('/fixtures')) {
      await fulfill(route, 200, { data: [fixture], pagination: { nextCursor: null } });
    } else if (url.pathname.endsWith('/submissions') && request.method() === 'POST') {
      await fulfill(route, 201, {
        data: {
          submissionId: '300',
          fixtureId: '7',
          submitterId: '17',
          status: 'accepted',
          receivedAt: '2026-08-16T09:30:00.000Z',
          schemaVersion: '1.0',
          eventCount: 1,
        },
      });
    } else if (url.pathname.endsWith('/participants')) {
      await fulfill(route, 200, {
        data: [
          { participantId: '20', displayName: 'Opening Batter' },
          { participantId: '21', displayName: 'Non-striker' },
          { participantId: '22', displayName: 'Opening Bowler' },
        ],
        pagination: { nextCursor: null },
      });
    } else if (url.pathname.endsWith('/fixtures/7/statistics')) {
      statisticsRequests += 1;
      await fulfill(route, 200, statistics(4));
    } else if (url.pathname.endsWith(`/submissions/events/${eventId}`)) {
      await fulfill(route, 422, {
        error: {
          code: 'VALIDATION_FAILED',
          message: 'The correction is invalid.',
          details: [
            {
              code: 'INVALID_FIELD',
              message: 'Use a printed ball number such as 5.1.',
              field: 'event.ballNumber',
            },
          ],
        },
      });
    } else {
      await fulfill(route, 404, { error: { code: 'NOT_FOUND', message: 'Not found.' } });
    }
  });

  await openAcceptedSubmission(page);
  const ballNumber = page.getByLabel(/Printed ball number/);
  await ballNumber.fill('invalid');
  await page.getByLabel('Reason for correction').fill('Correct scorer transcription.');
  await page.getByRole('button', { name: 'Save correction' }).click();

  await expect(page.getByRole('heading', { name: 'Correction rejected' })).toBeFocused();
  await expect(ballNumber).toHaveAttribute('aria-invalid', 'true');
  await expect(ballNumber).toHaveAttribute('aria-describedby', /correction-ball-number-error/);
  await expect(page.getByText('Use a printed ball number such as 5.1.')).toBeVisible();
  expect(statisticsRequests).toBe(1);
});

test('viewer is denied submission and is never offered a correction action', async ({ page }) => {
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/auth/me')) {
      await fulfill(route, 200, currentUser('viewer'));
      return;
    }
    await fulfill(route, 403, { error: { code: 'FORBIDDEN', message: 'Forbidden.' } });
  });

  await page.goto('/submissions/new');
  await expect(page.getByRole('heading', { name: 'Submitter role required' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit events' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save correction' })).toHaveCount(0);
});
