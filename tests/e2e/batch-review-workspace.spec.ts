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

test('reviewer publishes the accepted subset of a mixed batch @mobile', async ({
  page,
}, testInfo) => {
  let status: 'awaiting_review' | 'published' = 'awaiting_review';
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
    lineage: { replacesBatchReference: null, supersededByBatchReference: null },
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
    operation: 'correction',
    correctionTarget: {
      sourceEventId: 'cricsheet:delivery:100-original',
      resolvedDeliveryId: '88',
    },
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
          blockingErrors: 0,
          duplicate: 0,
          conflicting: 0,
        },
        resolution: { resolved: 20_000, ambiguous: 0, unresolved: 0, invalid: 0, proposed: 0 },
        approvalBlocked: false,
        blockingReasons: [],
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
      blockingItems: [],
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

  await page.route(/\/api\/v1\/admin\/batches(?:\?.*)?$/, async (route) => {
    const url = new URL(route.request().url());
    const isReviewQueue = url.searchParams.get('status') === 'awaiting_review';

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: isReviewQueue ? [batch()] : [],
        pagination: { nextCursor: null },
      }),
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
      decision: 'approved',
      reason: 'Publish the independently accepted records.',
    });
    status = 'published';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: batch() }),
    });
  });

  await page.goto('/reviews/batches');
  await expect(page).toHaveTitle(/Batch management/);
  await page.getByRole('link', { name: 'season.csv' }).click();
  await expect(page.getByRole('heading', { name: 'Review staged batch' })).toBeVisible();
  await expect(page.getByText('Data Submitter')).toBeVisible();
  await expect(page.getByText('cricsheet:delivery:100-original')).toBeVisible();
  await expect(page.getByText(/published delivery 88/)).toBeVisible();
  await expect(page.getByText('Lions vs Bears · 2026-09-01')).toBeVisible();
  await page.getByText(/1 rejection/).click();
  await expect(page.getByText('Runs total does not match its components.')).toBeVisible();
  await expect(page.getByText('Only the accepted subset will publish')).toBeVisible();
  const approve = page.getByRole('button', { name: 'Approve and publish' });
  await expect(approve).toBeEnabled();

  await page.getByLabel(/Reason/).fill('Publish the independently accepted records.');
  await approve.click();
  const dialog = page.getByRole('dialog', { name: 'Confirm approve and publish' });
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Confirm approve and publish' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(approve).toBeFocused();
  await approve.click();
  await dialog.getByRole('button', { name: 'Confirm approve and publish' }).click();
  await expect(page.getByText('Current state: Published')).toBeVisible();
  await expect(page.getByText('Runs total does not match its components.')).toBeVisible();

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

test('reviewer reconciles a published delivery conflict as an immutable correction', async ({
  page,
}) => {
  let resolved = false;
  const batch = () => ({
    batchReference: reference,
    competitionId: '5',
    status: 'awaiting_review',
    statusUrl: `/api/v1/batches/${reference}`,
    receivedAt: '2026-09-13T08:00:00.000Z',
    updatedAt: '2026-09-13T08:05:00.000Z',
    source: {
      fileName: 'conflicting-season.json',
      checksum: 'b'.repeat(64),
      packageVersion: '1.0',
      submitter: { accountId: '7', displayName: 'Data Submitter' },
    },
    progress: { total: 1, processed: 1, accepted: resolved ? 1 : 0, rejected: resolved ? 0 : 1 },
    counts: {
      accepted: resolved ? 1 : 0,
      rejected: resolved ? 0 : 1,
      unresolved: 0,
      duplicate: 0,
      conflicting: resolved ? 0 : 1,
    },
    lineage: { replacesBatchReference: null, supersededByBatchReference: null },
    review: null,
  });
  const report = () => {
    const response = {
    data: {
      batch: batch(),
      errorGroups: resolved ? [] : [{ ruleCode: 'PUBLISHED_DELIVERY_CONFLICT', count: 1 }],
      reviewSummary: {
        validation: {
          accepted: resolved ? 1 : 0,
          rejected: resolved ? 0 : 1,
          blockingErrors: resolved ? 0 : 1,
          duplicate: 0,
          conflicting: resolved ? 0 : 1,
        },
        resolution: { resolved: 1, ambiguous: 0, unresolved: 0, invalid: 0, proposed: 0 },
        approvalBlocked: !resolved,
        blockingReasons: resolved
          ? []
          : ['Blocking validation errors remain.', 'Conflicting records remain.'],
      },
      fixtureSummaries: [
        {
          fixtureId: '22',
          label: 'Lions vs Bears · 2026-09-01',
          total: 1,
          accepted: resolved ? 1 : 0,
          rejected: resolved ? 0 : 1,
          unresolved: 0,
        },
      ],
      acceptedSamples: [],
      items: [
        {
          ordinal: 0,
          outcome: resolved ? 'accepted' : 'conflicting',
          location: {
            filePath: 'events.json',
            sheetName: null,
            rowNumber: null,
            jsonPath: 'delivery',
            ordinal: 0,
          },
          context: {
            eventReference: 'cricsheet:delivery:fixture-1:0',
            fixtureId: '22',
            fixtureLabel: 'Lions vs Bears · 2026-09-01',
            inningsId: '31',
            overNumber: 1,
            positionInOver: 1,
            description: 'Event cricsheet:delivery:fixture-1:0 at over 1, delivery 1.',
          },
          stagedRecordId: '41',
          acceptedRecordId: null,
          operation: resolved ? 'correction' : 'upsert',
          correctionTarget: resolved
            ? {
                sourceEventId: 'cricsheet:delivery:fixture-1:0',
                resolvedDeliveryId: '88',
              }
            : null,
          publishedConflict: resolved
            ? null
            : {
                existingDeliveryId: '88',
                existingSourceEventId: null,
                correctionPermitted: true,
                differences: [{ fieldPath: 'runs.offBat', submittedValue: 4, publishedValue: 0 }],
              },
          referenceResolutions: [],
          errors: resolved
            ? []
            : [
                {
                  ruleCode: 'PUBLISHED_DELIVERY_CONFLICT',
                  message:
                    'A published delivery or published source identity exists with different cricket content.',
                  location: {
                    filePath: 'events.json',
                    sheetName: null,
                    rowNumber: null,
                    jsonPath: 'delivery',
                    ordinal: 0,
                  },
                  context: {
                    eventReference: 'cricsheet:delivery:fixture-1:0',
                    fixtureId: '22',
                    fixtureLabel: 'Lions vs Bears · 2026-09-01',
                    inningsId: '31',
                    overNumber: 1,
                    positionInOver: 1,
                    description: 'Event cricsheet:delivery:fixture-1:0 at over 1, delivery 1.',
                  },
                },
              ],
        },
      ],
      pagination: { nextCursor: null },
      downloadUrl: `/api/v1/batches/${reference}/report/download`,
    },
    };
    return {
      data: {
        ...response.data,
        blockingItems: resolved ? [] : response.data.items,
      },
    };
  };

  await page.route(`**/api/v1/batches/${reference}/report`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(report()),
    });
  });
  await page.route(`**/api/v1/batches/${reference}/conflicts/resolve`, async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      itemOrdinal: 0,
      existingDeliveryId: '88',
      decision: 'replace_published',
      reason: 'Correct the published score from the verified source.',
    });
    resolved = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: batch() }),
    });
  });

  await page.goto(`/reviews/batches/${reference}`);
  await expect(page.getByRole('heading', { name: 'Published delivery conflicts' })).toBeVisible();
  const conflictCard = page.locator('.published-conflict-resolution');
  const differenceRow = conflictCard.getByRole('row', { name: /runs\.offBat/ });
  await expect(differenceRow).toContainText('4');
  await expect(differenceRow).toContainText('0');
  await expect(page.getByRole('button', { name: 'Approve and publish' })).toBeDisabled();

  await page
    .getByLabel('Resolution reason')
    .fill('Correct the published score from the verified source.');
  await page.getByRole('button', { name: 'Approve submitted correction' }).click();

  await expect(page.getByRole('button', { name: 'Approve and publish' })).toBeEnabled();
});

test('reviewer sees a generic failure, then keeps the published delivery', async ({ page }) => {
  // #529: the deployed resolution failed as an unexpected server error. The
  // reviewer must see the generic message with no server detail, and a retry that
  // keeps the published delivery must clear the conflict.
  let kept = false;
  const requests: unknown[] = [];
  const context = {
    eventReference: 'cricsheet:delivery:fixture-0-innings-0-delivery-32',
    fixtureId: '22',
    fixtureLabel: 'Lions vs Bears · 2026-09-01',
    inningsId: '31',
    overNumber: 5,
    positionInOver: 1,
    description: 'Event cricsheet:delivery:fixture-0-innings-0-delivery-32 at over 5, delivery 1.',
  };
  const location = {
    filePath: 'conflicting-season.json',
    sheetName: null,
    rowNumber: null,
    jsonPath: 'delivery',
    ordinal: 0,
  };
  const batch = () => ({
    batchReference: reference,
    competitionId: '5',
    status: 'awaiting_review',
    statusUrl: `/api/v1/batches/${reference}`,
    receivedAt: '2026-09-13T08:00:00.000Z',
    updatedAt: '2026-09-13T08:05:00.000Z',
    source: {
      fileName: 'conflicting-season.json',
      checksum: 'b'.repeat(64),
      packageVersion: '1.0',
      submitter: { accountId: '7', displayName: 'Data Submitter' },
    },
    progress: { total: 1, processed: 1, accepted: 0, rejected: kept ? 0 : 1 },
    counts: {
      accepted: 0,
      rejected: kept ? 0 : 1,
      unresolved: 0,
      duplicate: kept ? 1 : 0,
      conflicting: kept ? 0 : 1,
    },
    lineage: { replacesBatchReference: null, supersededByBatchReference: null },
    review: null,
  });
  const report = () => {
    const response = {
    data: {
      batch: batch(),
      errorGroups: kept ? [] : [{ ruleCode: 'PUBLISHED_DELIVERY_CONFLICT', count: 1 }],
      reviewSummary: {
        validation: {
          accepted: 0,
          rejected: kept ? 0 : 1,
          blockingErrors: kept ? 0 : 1,
          duplicate: kept ? 1 : 0,
          conflicting: kept ? 0 : 1,
        },
        resolution: { resolved: 1, ambiguous: 0, unresolved: 0, invalid: 0, proposed: 0 },
        approvalBlocked: !kept,
        blockingReasons: kept
          ? []
          : ['Blocking validation errors remain.', 'Conflicting records remain.'],
      },
      fixtureSummaries: [
        {
          fixtureId: '22',
          label: 'Lions vs Bears · 2026-09-01',
          total: 1,
          accepted: 0,
          rejected: kept ? 0 : 1,
          unresolved: 0,
        },
      ],
      acceptedSamples: [],
      items: [
        {
          ordinal: 0,
          outcome: kept ? 'duplicate' : 'conflicting',
          location,
          context,
          stagedRecordId: '41',
          acceptedRecordId: kept ? '2342246' : null,
          operation: 'upsert',
          correctionTarget: null,
          publishedConflict: kept
            ? null
            : {
                existingDeliveryId: '2342246',
                existingSourceEventId: null,
                correctionPermitted: true,
                differences: [
                  { fieldPath: 'ballNumber', submittedValue: '5.2', publishedValue: '5.1' },
                ],
              },
          referenceResolutions: [],
          errors: kept
            ? []
            : [
                {
                  ruleCode: 'PUBLISHED_DELIVERY_CONFLICT',
                  message:
                    'A published delivery or published source identity exists with different cricket content.',
                  location,
                  context,
                },
              ],
        },
      ],
      pagination: { nextCursor: null },
      downloadUrl: `/api/v1/batches/${reference}/report/download`,
    },
    };
    return {
      data: {
        ...response.data,
        blockingItems: kept ? [] : response.data.items,
      },
    };
  };

  await page.route(`**/api/v1/batches/${reference}/report`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(report()),
    });
  });
  await page.route(`**/api/v1/batches/${reference}/conflicts/resolve`, async (route) => {
    requests.push(route.request().postDataJSON());
    if (requests.length === 1) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected server error occurred.' },
        }),
      });
      return;
    }
    kept = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: batch() }),
    });
  });

  await page.goto(`/reviews/batches/${reference}`);
  const conflictCard = page.locator('.published-conflict-resolution');
  await expect(conflictCard.getByRole('row', { name: /ballNumber/ })).toContainText('5.2');
  await expect(page.getByRole('button', { name: 'Approve and publish' })).toBeDisabled();

  await page.getByLabel('Resolution reason').fill('The published delivery is the verified record.');
  await page.getByRole('button', { name: 'Keep published delivery' }).click();

  await expect(conflictCard.getByRole('status')).toHaveText(
    'The published-delivery conflict could not be resolved.',
  );
  await expect(page.getByText(/INTERNAL_SERVER_ERROR|unexpected server error/)).toHaveCount(0);
  await expect(conflictCard).toHaveCount(1);

  await page.getByRole('button', { name: 'Keep published delivery' }).click();

  await expect(conflictCard).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Approve and publish' })).toBeEnabled();
  const expectedRequest = {
    itemOrdinal: 0,
    existingDeliveryId: '2342246',
    decision: 'use_existing',
    reason: 'The published delivery is the verified record.',
  };
  expect(requests).toEqual([expectedRequest, expectedRequest]);
});
