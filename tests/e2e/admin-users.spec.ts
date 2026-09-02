import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const authStorageKey = 'sb-e2e-auth-token';
const accessTime = '2026-08-16T12:00:00.000Z';

interface ManagedUser {
  id: string;
  email: string;
  displayName: string;
  role: 'viewer' | 'submitter' | 'admin';
  approvalState: 'not_requested' | 'pending' | 'approved' | 'rejected';
  requestedCompetition: { competitionId: string; name: string } | null;
  competitionScopes: { competitionId: string; name: string }[];
  disabled: boolean;
  updatedAt: string;
  submitterAccessUpdatedAt: string | null;
  submitterAccessUpdatedBy: { id: string; displayName: string | null } | null;
}

const availableScopes = [
  { competitionId: '7', name: 'Premier T20' },
  { competitionId: '8', name: 'University League' },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ storageKey }) => {
      const now = Math.floor(Date.now() / 1_000);
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          access_token: 'administrator-e2e-token',
          refresh_token: 'managed-by-supabase',
          expires_in: 3_600,
          expires_at: now + 3_600,
          token_type: 'bearer',
          user: {
            id: 'admin-subject',
            aud: 'authenticated',
            role: 'authenticated',
            email: 'admin@example.com',
            app_metadata: {},
            user_metadata: {},
            identities: [],
            created_at: '2026-08-16T00:00:00.000Z',
          },
        }),
      );
    },
    { storageKey: authStorageKey },
  );
});

test('administrator approves, re-scopes, and revokes a submitter access request', async ({
  page,
}, testInfo) => {
  const administrator: ManagedUser = {
    id: '1',
    email: 'amina.administrator@example.com',
    displayName: 'Amina Administrator',
    role: 'admin',
    approvalState: 'not_requested',
    requestedCompetition: null,
    competitionScopes: [],
    disabled: false,
    updatedAt: accessTime,
    submitterAccessUpdatedAt: null,
    submitterAccessUpdatedBy: null,
  };
  let contributor: ManagedUser = {
    id: '42',
    email: 'pending.contributor@example.com',
    displayName: 'Pending Contributor',
    role: 'viewer',
    approvalState: 'pending',
    requestedCompetition: availableScopes[0]!,
    competitionScopes: [],
    disabled: false,
    updatedAt: accessTime,
    submitterAccessUpdatedAt: null,
    submitterAccessUpdatedBy: null,
  };

  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: '1',
          subject: 'admin-subject',
          displayName: 'Amina Administrator',
          role: 'admin',
          approvalState: 'not_requested',
          requestedCompetition: null,
          competitionIds: [],
        },
      }),
    });
  });

  await page.route('**/api/v1/admin/users', async (route) => {
    expect(route.request().headers().authorization).toBe('Bearer administrator-e2e-token');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          users: [administrator, contributor],
          availableScopes,
        },
      }),
    });
  });

  await page.route('**/api/v1/admin/users/42/submitter-access', async (route) => {
    expect(route.request().method()).toBe('PATCH');
    expect(route.request().headers().authorization).toBe('Bearer administrator-e2e-token');

    const update = route.request().postDataJSON() as {
      approved: boolean;
      competitionIds: string[];
    };
    if (contributor.role === 'viewer' && update.approved) {
      expect(update.competitionIds).toEqual(['7']);
    }
    contributor = {
      ...contributor,
      role: update.approved ? 'submitter' : 'viewer',
      approvalState: update.approved ? 'approved' : 'rejected',
      competitionScopes: update.approved
        ? availableScopes.filter((scope) => update.competitionIds.includes(scope.competitionId))
        : [],
      submitterAccessUpdatedAt: accessTime,
      submitterAccessUpdatedBy: { id: '1', displayName: 'Amina Administrator' },
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: contributor }),
    });
  });

  await page.goto('/admin/users');

  const contributorCard = page
    .getByRole('heading', { name: 'Pending Contributor' })
    .locator('xpath=ancestor::article');
  await expect(contributorCard.getByText('Pending approval')).toBeVisible();
  await expect(
    contributorCard
      .getByRole('group', { name: 'Approve requested competition' })
      .getByText('Premier T20', { exact: true }),
  ).toBeVisible();
  await expect(contributorCard.getByRole('checkbox')).toHaveCount(0);

  const approveButton = contributorCard.getByRole('button', { name: 'Approve submitter' });
  await approveButton.focus();
  await expect(approveButton).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(
    contributorCard.getByText('Pending Contributor is now an approved submitter.'),
  ).toBeVisible();
  await expect(contributorCard.getByText('Approved', { exact: true })).toBeVisible();
  await expect(
    contributorCard.getByRole('button', { name: 'Revoke submitter access' }),
  ).toBeVisible();

  if (process.env.CAPTURE_ISSUE_45_EVIDENCE) {
    await contributorCard.screenshot({
      path: `evidence/validation/issue-45-admin-users-${testInfo.project.name}.png`,
    });
  }

  await contributorCard.getByRole('checkbox', { name: 'Premier T20' }).uncheck();
  await contributorCard.getByRole('checkbox', { name: 'University League' }).check();
  await contributorCard.getByRole('button', { name: 'Save scope changes' }).click();
  await expect(
    contributorCard.getByText('Competition scope was updated for Pending Contributor.'),
  ).toBeVisible();
  await expect(contributorCard.getByRole('checkbox', { name: 'University League' })).toBeChecked();

  await contributorCard.getByRole('button', { name: 'Revoke submitter access' }).click();
  await expect(
    contributorCard.getByText('Submitter access was revoked for Pending Contributor.'),
  ).toBeVisible();
  await expect(contributorCard.getByText('Not approved', { exact: true })).toBeVisible();
  await expect(contributorCard.getByText('None assigned', { exact: true })).toBeVisible();

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
