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
      participantOnboarding: [],
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
  await expect(page).toHaveTitle(/Review queue/);
  await page.getByRole('link', { name: 'season.csv' }).click();
  await expect(page.getByRole('heading', { name: 'Review staged submission' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'season.csv' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Review decision' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('list', { name: 'Batch lifecycle' })).toBeVisible();
  const decisionTab = page.getByRole('tab', { name: 'Review decision' });
  await decisionTab.focus();
  await page.keyboard.press('Home');
  await expect(page.getByRole('tab', { name: 'Needs review (0)' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'References (0)' })).toBeFocused();
  await page.keyboard.press('End');
  await expect(decisionTab).toBeFocused();
  await page.getByRole('tab', { name: 'Batch summary' }).click();
  await expect(page.getByText('Data Submitter', { exact: true })).toBeVisible();
  await page.getByText(/Show resolved content/).click();
  await expect(page.getByText('cricsheet:delivery:100-original')).toBeVisible();
  await expect(page.getByText(/published delivery 88/)).toBeVisible();
  await expect(page.getByText('Lions vs Bears · 2026-09-01')).toBeVisible();
  await page.getByText(/1 rejection/).click();
  await expect(page.getByText('Runs total does not match its components.')).toBeVisible();
  await decisionTab.click();
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
  await page.getByRole('tab', { name: 'Batch summary' }).click();
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
        participantOnboarding: [],
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

  await page
    .getByLabel('Resolution reason')
    .fill('Correct the published score from the verified source.');
  await page.getByRole('button', { name: 'Approve submitted correction' }).click();

  await page.getByRole('tab', { name: 'Review decision' }).click();
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
        participantOnboarding: [],
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

  await page.getByLabel('Resolution reason').fill('The published delivery is the verified record.');
  await page.getByRole('button', { name: 'Keep published delivery' }).click();

  await expect(conflictCard.getByRole('status')).toHaveText(
    'The published-delivery conflict could not be resolved.',
  );
  await expect(page.getByText(/INTERNAL_SERVER_ERROR|unexpected server error/)).toHaveCount(0);
  await expect(conflictCard).toHaveCount(1);

  await page.getByRole('button', { name: 'Keep published delivery' }).click();

  await expect(conflictCard).toHaveCount(0);
  await page.getByRole('tab', { name: 'Review decision' }).click();
  await expect(page.getByRole('button', { name: 'Approve and publish' })).toBeEnabled();
  const expectedRequest = {
    itemOrdinal: 0,
    existingDeliveryId: '2342246',
    decision: 'use_existing',
    reason: 'The published delivery is the verified record.',
  };
  expect(requests).toEqual([expectedRequest, expectedRequest]);
});

test('reviewer onboards participants in one submission and corrects every fault @mobile', async ({
  page,
}) => {
  const ambiguous = '0b6f2f6e-6f6c-4a1a-9d0f-2a1d3c4b5e6f';
  const teamTask = '1c7f3a2b-4d5e-4f6a-8b9c-0d1e2f3a4b5c';
  let settled = false;

  const report = () => ({
    data: {
      batch: {
        batchReference: reference,
        competitionId: '5',
        status: 'awaiting_review',
        statusUrl: `/api/v1/batches/${reference}`,
        receivedAt: '2026-09-08T08:00:00.000Z',
        updatedAt: '2026-09-08T08:05:00.000Z',
        source: {
          fileName: 'season.csv',
          checksum: 'b'.repeat(64),
          packageVersion: '1.1',
          submitter: { accountId: '7', displayName: 'Data Submitter' },
        },
        progress: { total: 3, processed: 3, accepted: 0, rejected: 0 },
        counts: { accepted: 0, rejected: 0, unresolved: 3, duplicate: 0, conflicting: 0 },
        lineage: { replacesBatchReference: null, supersededByBatchReference: null },
        review: null,
      },
      errorGroups: [],
      reviewSummary: {
        validation: { accepted: 0, rejected: 0, blockingErrors: 0, duplicate: 0, conflicting: 0 },
        resolution: { resolved: 0, ambiguous: 0, unresolved: 3, invalid: 0, proposed: 0 },
        approvalBlocked: true,
        blockingReasons: ['Unresolved references remain.'],
      },
      fixtureSummaries: [
        {
          fixtureId: '22',
          label: 'Lions vs Bears · 2026-09-01',
          total: 3,
          accepted: 0,
          rejected: 0,
          unresolved: 3,
        },
      ],
      // Settled tasks leave the list, which is how the reviewer sees the work
      // shrink rather than having to remember what they already answered.
      participantOnboarding: settled
        ? []
        : [
            {
              taskReference: ambiguous,
              fixtureId: '22',
              submittedName: 'A. Smith',
              submittedTeamName: 'Lions',
              reason: 'ambiguous_name',
              candidates: [
                { personId: '11', displayName: 'Alan Smith' },
                { personId: '12', displayName: 'Amy Smith' },
              ],
              teams: [
                { teamId: '30', name: 'Lions' },
                { teamId: '31', name: 'Bears' },
              ],
            },
            {
              taskReference: teamTask,
              fixtureId: '22',
              submittedName: 'C. Khumalo',
              submittedTeamName: 'Wanderers',
              // The case deployed acceptance testing could not settle: the
              // reason is not team_not_recognised, but the submitted team is
              // still not one of the fixture's two, so the decision fails on
              // the team and the card has to offer that choice anyway.
              reason: 'no_durable_identifier',
              candidates: [{ personId: '13', displayName: 'Chris Khumalo' }],
              teams: [
                { teamId: '30', name: 'Lions' },
                { teamId: '31', name: 'Bears' },
              ],
            },
          ],
      acceptedSamples: [],
      blockingItems: [],
      items: [],
      pagination: { nextCursor: null },
      downloadUrl: `/api/v1/batches/${reference}/report/download`,
    },
  });

  await page.route(/\/api\/v1\/admin\/batches(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [report().data.batch], pagination: { nextCursor: null } }),
    });
  });

  await page.route(`**/api/v1/batches/${reference}/report`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(report()),
    });
  });

  let attempts = 0;
  await page.route(`**/api/v1/batches/${reference}/participants`, async (route) => {
    attempts += 1;
    const body = JSON.parse(route.request().postData() ?? '{}');
    // The whole array in one request, always.
    expect(body.decisions).toHaveLength(2);

    if (attempts === 1) {
      // All or nothing, with a fault for each decision that broke, so the
      // reviewer corrects both at once rather than one resubmission at a time.
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            code: 'BATCH_PARTICIPANT_ONBOARDING_CONFLICT',
            message: 'One or more participant onboarding decisions could not be applied.',
            details: [
              {
                taskReference: ambiguous,
                code: 'CANDIDATE_NOT_OFFERED',
                message: 'Choose one of the candidates this task offered.',
              },
              {
                taskReference: teamTask,
                code: 'TEAM_NOT_IN_FIXTURE',
                message: 'Name one of the two teams of the fixture this task belongs to.',
              },
            ],
          },
        }),
      });
      return;
    }

    settled = true;
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          batchReference: reference,
          decisionReference: '688a0bf0-e168-4b67-bf6f-f5857dbb1f87',
          status: 'queued',
          statusUrl: `/api/v1/batches/${reference}`,
          submittedAt: '2026-09-24T12:00:00.000Z',
          onboarded: 2,
          alreadyOnboarded: 0,
          revalidationQueued: true,
        },
      }),
    });
  });

  await page.goto(`/reviews/batches/${reference}`);
  await expect(page.getByRole('heading', { name: 'Participants to onboard' })).toBeVisible();

  // One card per decision, not one per delivery naming the participant.
  await expect(page.getByText('2 outstanding')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'A. Smith' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'C. Khumalo' })).toBeVisible();

  // The team is chosen from the fixture's two, never typed.
  const teamCard = page.getByRole('article').filter({ hasText: 'C. Khumalo' });
  await expect(
    teamCard.getByRole('group', { name: 'Which team do they belong to?' }),
  ).toBeVisible();

  await page.getByRole('radio', { name: 'Alan Smith' }).check();
  await page.getByRole('radio', { name: 'Chris Khumalo' }).check();
  await teamCard.getByRole('radio', { name: 'Bears' }).check();

  const submit = page.getByRole('button', { name: 'Submit 2 decisions' });
  await expect(submit).toBeEnabled();
  await submit.click();

  // Every fault, each against its own card.
  await expect(
    page
      .getByRole('article')
      .filter({ hasText: 'A. Smith' })
      .getByText('Choose one of the candidates this task offered.'),
  ).toBeVisible();
  await expect(
    teamCard.getByText('Name one of the two teams of the fixture this task belongs to.'),
  ).toBeVisible();
  await expect(page.getByText('Nothing was applied.')).toBeVisible();

  // Correct both and resubmit. Nothing was applied, so both are still open.
  await page.getByRole('radio', { name: 'Amy Smith' }).check();
  await teamCard.getByRole('radio', { name: 'Lions' }).check();
  await page.getByRole('button', { name: 'Submit 2 decisions' }).click();

  // Settling the last task empties the list, which drops the needs-review count
  // to zero and moves the workspace to the decision view, taking the section
  // with it. The receipt has to outlive that, or a reviewer is never told their
  // decisions were applied.
  await expect(page.getByRole('tab', { name: 'Review decision' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('heading', { name: 'Participants to onboard' })).toBeHidden();
  await expect(page.getByText(/2 settled/)).toBeVisible();

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
});
