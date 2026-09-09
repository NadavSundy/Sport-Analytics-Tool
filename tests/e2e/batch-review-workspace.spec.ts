import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { join } from 'node:path';

const reference = '123e4567-e89b-42d3-a456-426614174000';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const now = Math.floor(Date.now() / 1_000);
    window.localStorage.setItem(
      'sb-e2e-auth-token',
      JSON.stringify({
        access_token: 'reviewer-e2e-token',
        refresh_token: 'managed-by-supabase',
        expires_in: 3_600,
        expires_at: now + 3_600,
        token_type: 'bearer',
        user: {
          id: 'reviewer-subject',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'reviewer@example.com',
          app_metadata: {},
          user_metadata: {},
          identities: [],
          created_at: '2026-09-08T00:00:00.000Z',
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
          id: '9',
          subject: 'reviewer-subject',
          displayName: 'A Reviewer',
          role: 'admin',
          approvalState: 'approved',
          requestedCompetition: null,
          competitionIds: ['5'],
        },
      }),
    });
  });
});

test('reviewer inspects and safely rejects a staged batch @mobile', async ({ page }, testInfo) => {
  let status: 'awaiting_review' | 'rejected' = 'awaiting_review';
  const batch = () => ({
    batchReference: reference,
    competitionId: '5',
    status,
    statusUrl: `/api/v1/batches/${reference}`,
    receivedAt: '2026-09-08T08:00:00.000Z',
    updatedAt: '2026-09-08T08:05:00.000Z',
    source: {
      fileName: 'season.csv',
      checksum: 'a'.repeat(64),
      packageVersion: '1.0',
      submitter: { accountId: '7', displayName: 'Data Submitter' },
    },
    progress: { total: 20_000, processed: 20_000, accepted: 19_999, rejected: 1 },
    counts: { accepted: 19_999, rejected: 1, unresolved: 0, duplicate: 0, conflicting: 0 },
    review: null,
  });
  const acceptedSample = {
    ordinal: 0,
    outcome: 'accepted',
    location: {
      filePath: 'season.csv',
      sheetName: null,
      rowNumber: 2,
      jsonPath: null,
      ordinal: 0,
    },
    context: {
      eventReference: 'event-0',
      fixtureId: '22',
      fixtureLabel: 'Lions vs Bears · 2026-09-01',
      inningsId: '31',
      overNumber: 1,
      positionInOver: 1,
      description: 'Event event-0 at over 1, delivery 1.',
    },
    stagedRecordId: '40',
    acceptedRecordId: '90',
    referenceResolutions: [],
    errors: [],
  };
  const report = () => ({
    data: {
      batch: batch(),
      errorGroups: [{ ruleCode: 'EVENT_SCHEMA_INVALID', count: 1 }],
      reviewSummary: {
        validation: {
          accepted: 19_999,
          rejected: 1,
          blockingErrors: 1,
          duplicate: 0,
          conflicting: 0,
        },
        resolution: { resolved: 20_000, ambiguous: 0, unresolved: 0, invalid: 0, proposed: 0 },
        approvalBlocked: true,
        blockingReasons: ['Validation errors remain.'],
      },
      fixtureSummaries: [
        {
          fixtureId: '22',
          label: 'Lions vs Bears · 2026-09-01',
          total: 20_000,
          accepted: 19_999,
          rejected: 1,
          unresolved: 0,
        },
      ],
      acceptedSamples: [acceptedSample],
      items: [
        {
          ordinal: 1,
          outcome: 'rejected',
          location: {
            filePath: 'season.csv',
            sheetName: null,
            rowNumber: 3,
            jsonPath: 'runs.total',
            ordinal: 1,
          },
          context: {
            eventReference: 'event-1',
            fixtureId: '22',
            fixtureLabel: 'Lions vs Bears · 2026-09-01',
            inningsId: '31',
            overNumber: 2,
            positionInOver: 1,
            description: 'Event event-1 at over 2, delivery 1.',
          },
          stagedRecordId: '41',
          acceptedRecordId: null,
          referenceResolutions: [],
          errors: [
            {
              ruleCode: 'EVENT_SCHEMA_INVALID',
              message: 'Runs total does not match its components.',
              location: {
                filePath: 'season.csv',
                sheetName: null,
                rowNumber: 3,
                jsonPath: 'runs.total',
                ordinal: 1,
              },
              context: {
                eventReference: 'event-1',
                fixtureId: '22',
                fixtureLabel: 'Lions vs Bears · 2026-09-01',
                inningsId: '31',
                overNumber: 2,
                positionInOver: 1,
                description: 'Event event-1 at over 2, delivery 1.',
              },
            },
          ],
        },
      ],
      pagination: { nextCursor: null },
      downloadUrl: `/api/v1/batches/${reference}/report/download`,
    },
  });

  await page.route('**/api/v1/batches?**', async (route) => {
    expect(route.request().url()).toContain('status=awaiting_review');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [batch()], pagination: { nextCursor: null } }),
    });
  });
  await page.route(`**/api/v1/batches/${reference}/report`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(report()),
    });
  });
  await page.route(`**/api/v1/batches/${reference}/review`, async (route) => {
    expect(route.request().headers().authorization).toBe('Bearer reviewer-e2e-token');
    expect(route.request().postDataJSON()).toEqual({
      decision: 'rejected',
      reason: 'Source totals do not reconcile.',
    });
    status = 'rejected';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: batch() }),
    });
  });

  await page.goto('/reviews/batches');
  await expect(page).toHaveTitle(/Batch review queue/);
  await page.getByRole('link', { name: 'season.csv' }).click();
  await expect(page.getByRole('heading', { name: 'Review staged batch' })).toBeVisible();
  await expect(page.getByText('Data Submitter')).toBeVisible();
  await expect(page.getByText('Lions vs Bears · 2026-09-01')).toBeVisible();
  await page.getByText(/1 rejection/).click();
  await expect(page.getByText('Runs total does not match its components.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Approve and publish' })).toBeDisabled();

  await page.getByLabel(/Reason/).fill('Source totals do not reconcile.');
  const reject = page.getByRole('button', { name: 'Reject batch' });
  await reject.click();
  const dialog = page.getByRole('dialog', { name: 'Confirm reject batch' });
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Confirm reject batch' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(reject).toBeFocused();
  await reject.click();
  await dialog.getByRole('button', { name: 'Confirm reject batch' }).click();
  await expect(page.getByText('Current state: Rejected')).toBeVisible();

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
  ).toBe(false);
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    ),
  ).toEqual([]);
  if (process.env.ISSUE_362_SCREENSHOT_DIRECTORY) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: join(
        process.env.ISSUE_362_SCREENSHOT_DIRECTORY,
        `batch-review-${testInfo.project.name}.png`,
      ),
      fullPage: false,
    });
  }
});
