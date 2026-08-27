import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const now = Math.floor(Date.now() / 1_000);
    window.localStorage.setItem(
      'sb-e2e-auth-token',
      JSON.stringify({
        access_token: 'administrator-e2e-token',
        refresh_token: 'managed-by-supabase',
        expires_in: 3_600,
        expires_at: now + 3_600,
        token_type: 'bearer',
        user: {
          id: 'administrator-user',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'administrator@example.com',
          app_metadata: {},
          user_metadata: {},
          identities: [],
          created_at: '2026-08-19T00:00:00.000Z',
        },
      }),
    );
  });
});

test('administrator rejects a pending submitter request with accessible responsive feedback', async ({
  page,
}) => {
  const updatedAt = '2026-08-19T10:00:00.000Z';
  let releaseRejection!: () => void;
  const rejectionCanComplete = new Promise<void>((resolve) => {
    releaseRejection = resolve;
  });

  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: '1',
          subject: 'administrator-user',
          displayName: 'Administrator',
          role: 'admin',
          approvalState: 'approved',
          requestedCompetition: null,
          competitionIds: [],
        },
      }),
    });
  });

  await page.route('**/api/v1/admin/users', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          users: [
            {
              id: '42',
              displayName: 'Pending Contributor',
              role: 'viewer',
              approvalState: 'pending',
              requestedCompetition: { competitionId: '7', name: 'Premier T20' },
              competitionScopes: [],
              disabled: false,
              updatedAt,
              submitterAccessUpdatedAt: null,
              submitterAccessUpdatedBy: null,
            },
          ],
          availableScopes: [{ competitionId: '7', name: 'Premier T20' }],
        },
      }),
    });
  });

  await page.route('**/api/v1/admin/users/42/submitter-access/rejection', async (route) => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().headers().authorization).toBe('Bearer administrator-e2e-token');
    await rejectionCanComplete;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: '42',
          displayName: 'Pending Contributor',
          role: 'viewer',
          approvalState: 'rejected',
          requestedCompetition: { competitionId: '7', name: 'Premier T20' },
          competitionScopes: [],
          disabled: false,
          updatedAt,
          submitterAccessUpdatedAt: updatedAt,
          submitterAccessUpdatedBy: { id: '1', displayName: 'Administrator' },
        },
      }),
    });
  });

  await page.goto('/admin/users');

  await expect(page.getByText(/this request is awaiting administrator review/i)).toBeVisible();
  const rejectButton = page.getByRole('button', { name: 'Reject request' });
  await rejectButton.focus();
  await expect(rejectButton).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.getByRole('button', { name: 'Rejecting request...' })).toBeDisabled();
  await expect(
    page.getByText('Rejecting the submitter access request. Please wait.'),
  ).toHaveAttribute('role', 'status');

  releaseRejection();

  await expect(
    page.getByText('Submitter request was rejected for Pending Contributor.'),
  ).toHaveAttribute('role', 'status');
  await expect(page.getByText('Not approved')).toBeVisible();
  await expect(
    page.getByText(/no submitter access request is currently awaiting review/i),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reject request' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Approve submitter' })).toHaveCount(0);

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
