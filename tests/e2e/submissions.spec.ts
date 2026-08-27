import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const fixture = {
  fixtureId: '7',
  competitionId: '5',
  competitionName: 'Example Competition',
  seasonId: '15',
  season: '2026',
  seasonLabel: '2026',
  competitors: [
    { competitorId: '20', name: 'Wanderers' },
    { competitorId: '21', name: 'Strikers' },
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
    eventId: '123e4567-e89b-42d3-a456-426614174000',
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

  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: '17',
          subject: 'approved-user',
          displayName: 'Submitter User',
          role: 'submitter',
          approvalState: 'approved',
          requestedCompetition: { competitionId: '5', name: 'Premier T20' },
          competitionIds: ['5'],
        },
      }),
    });
  });

  await page.route('**/api/v1/fixtures?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [fixture], pagination: { nextCursor: null } }),
    });
  });
});

test('submitter completes the responsive workflow with a keyboard', async ({ page }) => {
  await page.route('**/api/v1/submissions', async (route) => {
    const body = route.request().postDataJSON();
    expect(body).toEqual({ fixtureId: '7', schemaVersion: '1.0', events });

    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          submissionId: '300',
          fixtureId: '7',
          submitterId: '17',
          status: 'accepted',
          receivedAt: '2026-08-16T09:30:00.000Z',
          schemaVersion: '1.0',
          eventCount: 1,
        },
      }),
    });
  });

  await page.goto('/submissions/new');

  const fixtureSelector = page.getByLabel('Fixture');
  const editor = page.getByLabel('Delivery events JSON');
  const submitButton = page.getByRole('button', { name: 'Submit events' });

  await expect(fixtureSelector).toHaveValue('7');
  await editor.fill(JSON.stringify(events, null, 2));

  await fixtureSelector.focus();
  await page.keyboard.press('Tab');
  await expect(editor).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(submitButton).toBeFocused();
  await page.keyboard.press('Enter');

  const acceptedHeading = page.getByRole('heading', { name: 'Submission accepted' });
  await expect(acceptedHeading).toBeFocused();
  await expect(page.getByText('300')).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);

  const results = await new AxeBuilder({ page }).analyze();
  const seriousOrCriticalViolations = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(seriousOrCriticalViolations).toEqual([]);
});

test('validation results remain associated with the editor and receive focus', async ({ page }) => {
  await page.route('**/api/v1/submissions', async (route) => {
    await route.fulfill({
      status: 422,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'The submission is invalid.',
          details: [
            {
              code: 'INVALID_FIELD',
              message: 'Total runs must equal off-bat runs plus extras.',
              field: 'events.0.runs.total',
              eventIndex: 0,
            },
          ],
        },
      }),
    });
  });

  await page.goto('/submissions/new');
  const editor = page.getByLabel('Delivery events JSON');
  await editor.fill(JSON.stringify(events));
  await page.getByRole('button', { name: 'Submit events' }).click();

  await expect(page.getByRole('heading', { name: 'Submission rejected' })).toBeFocused();
  await expect(page.getByText('Event 1 — runs.total')).toBeVisible();
  await expect(editor).toHaveAttribute('aria-invalid', 'true');
  await expect(editor).toHaveAttribute('aria-describedby', /submission-validation-results/);
});
