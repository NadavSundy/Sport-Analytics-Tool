import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const authStorageKey = 'sb-e2e-auth-token';
const accessTime = '2026-08-16T12:00:00.000Z';
const availableScopes = [
  { competitionId: '7', name: 'Premier T20' },
  { competitionId: '8', name: 'University League' },
];

interface ManagedUser {
  id: string;
  email: string;
  displayName: string;
  role: 'viewer' | 'submitter' | 'admin';
  approvalState: 'not_requested' | 'pending' | 'approved' | 'rejected';
  requestedCompetition: { competitionId: string; name: string } | null;
  competitionScopes: { competitionId: string; name: string }[];
  disabled: boolean;
  previouslyRevoked: boolean;
  updatedAt: string;
  submitterAccessUpdatedAt: string | null;
  submitterAccessUpdatedBy: { id: string; displayName: string | null } | null;
}

test.beforeEach(async ({ page }) => {
  const expiresAt = Math.floor(Date.now() / 1_000) + 3_600;
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ aud: 'authenticated', exp: expiresAt, sub: 'admin-subject' }),
  ).toString('base64url');
  await page.addInitScript(
    ({ storageKey, accessToken, tokenExpiry }) => {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          access_token: accessToken,
          refresh_token: 'managed-by-supabase',
          expires_in: 3_600,
          expires_at: tokenExpiry,
          token_type: 'bearer',
          user: {
            id: 'admin-subject',
            aud: 'authenticated',
            role: 'authenticated',
            email: 'admin@example.com',
            app_metadata: {},
            user_metadata: {},
            identities: [],
            created_at: '2026-08-16T12:00:00.000Z',
          },
        }),
      );
    },
    {
      storageKey: authStorageKey,
      accessToken: `${header}.${payload}.e2e-signature`,
      tokenExpiry: expiresAt,
    },
  );
});

test('administrator finds and safely manages a user across responsive layouts @mobile', async ({
  page,
}) => {
  const administrator: ManagedUser = {
    id: '1',
    email: 'amina.administrator@example.com',
    displayName: 'Amina Administrator',
    role: 'admin',
    approvalState: 'not_requested',
    requestedCompetition: null,
    competitionScopes: [],
    disabled: false,
    previouslyRevoked: false,
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
    requestedCompetition: availableScopes[0],
    competitionScopes: [],
    disabled: false,
    previouslyRevoked: false,
    updatedAt: accessTime,
    submitterAccessUpdatedAt: null,
    submitterAccessUpdatedBy: null,
  };

  await page.route(
    '**/api/v1/auth/me',
    async (route) =>
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
      }),
  );
  await page.route(
    '**/api/v1/admin/users',
    async (route) =>
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { users: [administrator, contributor], availableScopes } }),
      }),
  );
  await page.route('**/api/v1/admin/users/42/submitter-access', async (route) => {
    expect(route.request().headers().authorization).toContain('Bearer ');
    const update = route.request().postDataJSON() as {
      approved: boolean;
      competitionIds: string[];
    };
    contributor = {
      ...contributor,
      role: update.approved ? 'submitter' : 'viewer',
      approvalState: update.approved ? 'approved' : 'rejected',
      requestedCompetition: null,
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
  await expect(page.getByText('pending.contributor@example.com')).toBeVisible();
  await expect(page.getByRole('table').getByText('Pending', { exact: true })).toBeVisible();
  await page.getByLabel('Role').selectOption('viewer');
  await expect(page.getByText('amina.administrator@example.com')).toBeHidden();
  await page.getByLabel('Search users').fill('pending.contributor@');

  const manage = page.getByRole('button', { name: 'Manage pending.contributor@example.com' });
  await manage.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Pending Contributor' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: /close management view/i })).toBeFocused();
  await expect(dialog.getByText('Premier T20')).toHaveCount(2);

  await dialog.getByRole('button', { name: 'Approve submitter' }).click();
  await expect(dialog.getByRole('alertdialog')).toContainText(
    'Approve pending.contributor@example.com',
  );
  await dialog.getByRole('button', { name: 'Confirm change' }).click();
  await expect(dialog.getByText(/now an approved submitter/i)).toBeVisible();
  await expect(dialog.getByRole('checkbox', { name: 'Premier T20' })).toBeChecked();

  await dialog.getByRole('checkbox', { name: 'Premier T20' }).uncheck();
  await dialog.getByRole('checkbox', { name: 'University League' }).check();
  await dialog.getByRole('button', { name: 'Save scope changes' }).click();
  await dialog.getByRole('button', { name: 'Confirm change' }).click();
  await expect(dialog.getByText(/competition scope was updated/i)).toBeVisible();

  const revokeButton = dialog.getByRole('button', { name: 'Revoke submitter access' });
  await revokeButton.click();
  await expect(dialog.getByRole('alertdialog')).toContainText('Revoke all submitter access');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog.getByRole('alertdialog')).toBeHidden();
  await expect(revokeButton).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByLabel('Search users')).toBeFocused();
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

test('administrator distinguishes and approves an additional competition scope request @mobile', async ({
  page,
}) => {
  const administrator: ManagedUser = {
    id: '1',
    email: 'amina.administrator@example.com',
    displayName: 'Amina Administrator',
    role: 'admin',
    approvalState: 'not_requested',
    requestedCompetition: null,
    competitionScopes: [],
    disabled: false,
    previouslyRevoked: false,
    updatedAt: accessTime,
    submitterAccessUpdatedAt: null,
    submitterAccessUpdatedBy: null,
  };
  let submitter: ManagedUser = {
    id: '42',
    email: 'approved.submitter@example.com',
    displayName: 'Approved Submitter',
    role: 'submitter',
    approvalState: 'approved',
    requestedCompetition: availableScopes[1],
    competitionScopes: [availableScopes[0]],
    disabled: false,
    previouslyRevoked: false,
    updatedAt: accessTime,
    submitterAccessUpdatedAt: accessTime,
    submitterAccessUpdatedBy: { id: '1', displayName: 'Amina Administrator' },
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
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { users: [administrator, submitter], availableScopes } }),
    });
  });

  await page.route('**/api/v1/admin/users/42/submitter-access', async (route) => {
    expect(route.request().method()).toBe('PATCH');
    expect(route.request().headers().authorization).toContain('Bearer ');
    expect(route.request().postDataJSON()).toEqual({
      approved: true,
      competitionIds: ['7', '8'],
    });
    submitter = {
      ...submitter,
      requestedCompetition: null,
      competitionScopes: availableScopes,
      submitterAccessUpdatedAt: accessTime,
      submitterAccessUpdatedBy: { id: '1', displayName: 'Amina Administrator' },
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: submitter }),
    });
  });

  await page.goto('/admin/users');

  await expect(page.getByRole('table').getByText('Scope request pending')).toBeVisible();
  const manage = page.getByRole('button', { name: 'Manage approved.submitter@example.com' });
  await manage.click();

  const dialog = page.getByRole('dialog', { name: 'Approved Submitter' });
  await expect(dialog.getByText('Pending additional scope request')).toBeVisible();
  await expect(
    dialog.locator('.admin-user-facts').getByText('University League', { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByText(/requested University League/i)).toBeVisible();
  await expect(dialog.getByRole('checkbox', { name: 'Premier T20' })).toBeChecked();
  await expect(dialog.getByRole('checkbox', { name: 'University League' })).toBeChecked();
  await expect(dialog.getByRole('button', { name: 'Reject scope request' })).toBeVisible();

  await dialog.getByRole('button', { name: 'Approve additional scope' }).click();
  await expect(dialog.getByRole('alertdialog')).toContainText(
    "Approve approved.submitter@example.com's additional scope request for University League?",
  );
  await dialog.getByRole('button', { name: 'Confirm change' }).click();

  await expect(dialog.getByText(/competition scope was updated/i)).toBeVisible();
  await expect(dialog.getByText('Pending additional scope request')).toHaveCount(0);
  await expect(dialog.getByRole('checkbox', { name: 'Premier T20' })).toBeChecked();
  await expect(dialog.getByRole('checkbox', { name: 'University League' })).toBeChecked();

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
});
