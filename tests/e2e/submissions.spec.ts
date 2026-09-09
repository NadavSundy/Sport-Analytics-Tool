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

const batchReference = '123e4567-e89b-42d3-a456-426614174000';

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

test(
  'submitter completes the responsive workflow with a keyboard',
  { tag: '@mobile' },
  async ({ page }) => {
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
    await page.getByRole('radio', { name: 'Paste technical JSON' }).click();

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
  },
);

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
  await page.getByRole('radio', { name: 'Paste technical JSON' }).click();
  const editor = page.getByLabel('Delivery events JSON');
  await editor.fill(JSON.stringify(events));
  await page.getByRole('button', { name: 'Submit events' }).click();

  await expect(page.getByRole('heading', { name: 'Submission rejected' })).toBeFocused();
  await expect(page.getByText('Event 1 — runs.total')).toBeVisible();
  await expect(editor).toHaveAttribute('aria-invalid', 'true');
  await expect(editor).toHaveAttribute('aria-describedby', /submission-validation-results/);
});

test('submitter uploads a JSON file through the accessible file-first workflow', async ({
  page,
}) => {
  await page.route('**/api/v1/submissions/uploads', async (route) => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().headers().authorization).toBe('Bearer approved-e2e-token');
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          submissionId: '301',
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
  await expect(page.getByText('Example Competition')).toBeVisible();
  const fileInput = page.getByLabel('Event data file');
  await fileInput.setInputFiles({
    name: 'events.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ fixtureId: '7', schemaVersion: '1.0', events })),
  });
  await expect(page.getByText(/Selected: events.json/)).toBeVisible();
  await page.getByRole('button', { name: 'Upload and submit file' }).click();

  await expect(page.getByRole('heading', { name: 'Submission accepted' })).toBeFocused();
  await expect(page.getByText('301')).toBeVisible();
});

test('file validation identifies a rejected CSV row and returns focus to the result', async ({
  page,
}) => {
  await page.route('**/api/v1/submissions/uploads', async (route) => {
    await route.fulfill({
      status: 422,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'The uploaded submission file is invalid.',
          details: [
            {
              code: 'INVALID_FILE_ROW',
              message: 'CSV row 2 is invalid.',
              field: 'file',
              eventIndex: 0,
            },
          ],
        },
      }),
    });
  });

  await page.goto('/submissions/new');
  const fileInput = page.getByLabel('Event data file');
  await fileInput.setInputFiles({
    name: 'events.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('bad'),
  });
  await page.getByRole('button', { name: 'Upload and submit file' }).click();

  await expect(page.getByRole('heading', { name: 'Submission rejected' })).toBeFocused();
  await expect(page.getByText(/Row 1.*file/)).toBeVisible();
  await expect(fileInput).toHaveAttribute('aria-invalid', 'true');
});

test(
  'submitter uploads and resolves a batch through the responsive guided workflow',
  { tag: '@mobile' },
  async ({ page }) => {
    await page.route('**/api/v1/competitions/5', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { competitionId: '5', name: 'Premier T20' } }),
      }),
    );
    await page.route('**/api/v1/seasons?**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              seasonId: '15',
              competitionId: '5',
              competitionName: 'Premier T20',
              label: '2026/27',
            },
          ],
          pagination: { nextCursor: null },
        }),
      }),
    );
    await page.route('**/api/v1/batches', async (route) => {
      expect(route.request().headers()['x-competition-id']).toBe('5');
      expect(route.request().headers()['x-file-name']).toBe('back-catalogue.csv');
      await new Promise((resolve) => setTimeout(resolve, 100));
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            batchReference,
            status: 'stored',
            statusUrl: `/api/v1/batches/${batchReference}`,
            receivedAt: '2026-09-08T09:30:00.000Z',
          },
        }),
      });
    });

    await page.goto('/submissions/batches/new');
    await expect(page.getByLabel('Competition')).toHaveValue('5');
    await expect(page.getByLabel('Season context')).toContainText('2026/27 — Premier T20');
    await page.getByLabel('Batch package').setInputFiles({
      name: 'back-catalogue.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('contractVersion,packageId\n1.0,provider:package:2026'),
    });
    await page.getByRole('button', { name: 'Upload batch package' }).click();
    await expect(page.getByRole('progressbar', { name: 'Upload progress' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Batch received safely' })).toBeFocused();
    await expect(page.getByText(/Processing continues after you leave/)).toBeVisible();

    await page.route(`**/api/v1/batches/${batchReference}/report`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            batch: {
              batchReference,
              competitionId: '5',
              status: 'rejected',
              statusUrl: `/api/v1/batches/${batchReference}`,
              receivedAt: '2026-09-08T09:30:00.000Z',
              updatedAt: '2026-09-08T09:35:00.000Z',
              source: {
                fileName: 'back-catalogue.csv',
                checksum: 'a'.repeat(64),
                packageVersion: '1.0',
                submitter: { accountId: '17', displayName: 'E2E Submitter' },
              },
              progress: { total: 1, processed: 1, accepted: 0, rejected: 1 },
              counts: { accepted: 0, rejected: 1, unresolved: 1, duplicate: 0, conflicting: 0 },
              review: null,
            },
            errorGroups: [{ ruleCode: 'REFERENCE_AMBIGUOUS', count: 1 }],
            reviewSummary: {
              validation: {
                accepted: 0,
                rejected: 1,
                blockingErrors: 0,
                duplicate: 0,
                conflicting: 0,
              },
              resolution: { resolved: 0, ambiguous: 1, unresolved: 0, invalid: 0, proposed: 1 },
              approvalBlocked: true,
              blockingReasons: ['Ambiguous references remain.'],
            },
            fixtureSummaries: [
              {
                fixtureId: null,
                label: 'Fixture unresolved',
                total: 1,
                accepted: 0,
                rejected: 1,
                unresolved: 1,
              },
            ],
            acceptedSamples: [],
            items: [
              {
                ordinal: 0,
                outcome: 'unresolved',
                location: {
                  filePath: 'back-catalogue.csv',
                  sheetName: 'Events',
                  rowNumber: 2,
                  jsonPath: 'striker',
                  ordinal: 0,
                },
                context: {
                  eventReference: 'provider:event:1',
                  fixtureId: null,
                  fixtureLabel: null,
                  inningsId: null,
                  overNumber: 0,
                  positionInOver: 1,
                  description: 'Premier T20, Wanderers v Strikers, over 0 delivery 1.',
                },
                stagedRecordId: null,
                acceptedRecordId: null,
                errors: [
                  {
                    ruleCode: 'REFERENCE_AMBIGUOUS',
                    message: 'More than one participant is named A. Smith.',
                    location: {
                      filePath: 'back-catalogue.csv',
                      sheetName: 'Events',
                      rowNumber: 2,
                      jsonPath: 'striker',
                      ordinal: 0,
                    },
                    context: {
                      eventReference: 'provider:event:1',
                      fixtureId: null,
                      fixtureLabel: null,
                      inningsId: null,
                      overNumber: 0,
                      positionInOver: 1,
                      description: 'Premier T20, Wanderers v Strikers, over 0 delivery 1.',
                    },
                  },
                ],
                referenceResolutions: [
                  {
                    referencePath: 'events.0.striker',
                    entityType: 'participant',
                    state: 'ambiguous',
                    submittedReference: { name: 'A. Smith' },
                    reason: 'Two participants have this alias.',
                    requiredAction: 'select_candidate',
                    candidates: [
                      {
                        candidateReference: '223e4567-e89b-42d3-a456-426614174000',
                        label: 'Alex Smith — Wanderers, 2026/27',
                      },
                    ],
                  },
                ],
              },
            ],
            pagination: { nextCursor: null },
            downloadUrl: `/api/v1/batches/${batchReference}/report/download`,
          },
        }),
      }),
    );
    await page.route(`**/api/v1/batches/${batchReference}/reference-mappings`, (route) =>
      route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            batchReference,
            decisionReference: '323e4567-e89b-42d3-a456-426614174000',
            status: 'queued',
            statusUrl: `/api/v1/batches/${batchReference}`,
            submittedAt: '2026-09-08T09:40:00.000Z',
          },
        }),
      }),
    );

    await page.getByRole('link', { name: 'Track this batch' }).click();
    await expect(page.getByLabel('Choose the matching participant')).toHaveValue(
      '223e4567-e89b-42d3-a456-426614174000',
    );
    const mapButton = page.getByRole('button', { name: 'Use selected match' });
    await mapButton.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Match queued' })).toBeDisabled();
    await expect(page.getByText(/Background validation continues after you leave/)).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter(
        (violation) => violation.impact === 'serious' || violation.impact === 'critical',
      ),
    ).toEqual([]);
  },
);
