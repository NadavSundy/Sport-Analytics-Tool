import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const authStorageKey = 'supabase.auth.token';
const createdAt = '2026-10-04T08:30:00.000Z';
const responsiveViewports = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
];

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  for (const viewport of responsiveViewports) {
    await page.setViewportSize(viewport);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      ),
    ).toBe(false);
  }
}

test.beforeEach(async ({ page }) => {
  const expiresAt = Math.floor(Date.now() / 1_000) + 3_600;
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ aud: 'authenticated', exp: expiresAt, sub: 'admin-subject' }),
  ).toString('base64url');
  await page.addInitScript(
    ({ storageKey, accessToken, tokenExpiry, accountCreatedAt }) => {
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
            created_at: accountCreatedAt,
          },
        }),
      );
    },
    {
      storageKey: authStorageKey,
      accessToken: `${header}.${payload}.e2e-signature`,
      tokenExpiry: expiresAt,
      accountCreatedAt: createdAt,
    },
  );
});

test('administrator reviews access and manages safe consumer metadata @mobile', async ({
  page,
}) => {
  const consumer = {
    id: '17',
    name: 'Match data partner',
    rateLimitPerMinute: 25,
    dailyQuota: 500,
    createdAt,
    keys: [{ id: '31', prefix: 'sat_live_safe', createdAt, revokedAt: null }],
  };
  let consumers = [consumer];
  const pending = {
    id: '9',
    requesterAccountId: '44',
    name: 'University model',
    intendedUse: 'Evaluate match predictions for a university research project.',
    state: 'pending',
    createdAt,
    reviewedAt: null,
    reviewedBy: null,
    reviewReason: null,
    requester: {
      displayName: 'University Researcher',
      email: 'researcher@example.com',
    },
  };

  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
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
  await page.route('**/api/v1/admin/api-consumers/all', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { consumers } }),
    }),
  );
  await page.route('**/api/v1/admin/api-access-requests', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { requests: [pending] } }),
    }),
  );
  await page.route('**/api/v1/admin/api-access-requests/9', async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      decision: 'approved',
      rateLimitPerMinute: 60,
      dailyQuota: 10000,
    });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: pending.id,
          requesterAccountId: pending.requesterAccountId,
          name: pending.name,
          intendedUse: pending.intendedUse,
          state: 'approved',
          createdAt: pending.createdAt,
          reviewedAt: createdAt,
          reviewedBy: { id: '1', displayName: 'Amina Administrator' },
          reviewReason: null,
        },
      }),
    });
  });
  await page.route('**/api/v1/admin/api-consumers/17/usage*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          consumer: { id: '17', name: consumer.name, rateLimitPerMinute: 25, dailyQuota: 500 },
          from: '2026-09-28',
          to: '2026-10-04',
          totalRequests: 14,
          entries: [
            {
              date: '2026-10-04',
              endpoint: 'GET /consumer/fixtures/:fixtureId/events',
              statusClass: '2xx',
              requestCount: 14,
            },
          ],
        },
      }),
    }),
  );
  await page.route('**/api/v1/admin/api-consumers/17/keys/31', async (route) => {
    consumers = [{ ...consumer, keys: [{ ...consumer.keys[0], revokedAt: createdAt }] }];
    await route.fulfill({ status: 204 });
  });

  await page.goto('/admin');
  await page.getByRole('link', { name: 'Manage API consumers' }).click();
  await page.getByRole('button', { name: 'Review pending requests' }).click();
  await expect(page.getByText(pending.intendedUse)).toBeVisible();
  await expect(page.getByText('University Researcher')).toBeVisible();
  await expect(page.getByRole('link', { name: 'researcher@example.com' })).toBeVisible();
  await expect(page.getByText(/Requested by account/)).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  await page.getByRole('button', { name: 'Approve request' }).click();
  await expect(page.getByText(pending.intendedUse)).toHaveCount(0);
  await expect(page.getByText(/sat_live_/)).toHaveCount(0);

  await page.getByRole('link', { name: 'Manage Match data partner' }).click();
  await expect(page.getByRole('region', { name: 'API consumer usage table' })).toContainText('14');
  await expect(page.getByRole('button', { name: 'Rotate key' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Revoke key sat_live_safe' }).click();
  await page
    .getByRole('dialog', { name: 'Revoke API key?' })
    .getByRole('button', { name: 'Revoke key' })
    .click();
  await expect(page.getByText('No active keys')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical'),
  ).toEqual([]);
});

test('approved owner generates and dismisses a one-time key by keyboard @mobile', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const accessRequest = {
    id: '9',
    requesterAccountId: '44',
    name: 'University model',
    intendedUse: 'University research.',
    state: 'approved',
    createdAt,
    reviewedAt: createdAt,
    reviewedBy: { id: '1', displayName: 'Amina Administrator' },
    reviewReason: null,
  };
  const consumer = {
    id: '17',
    name: 'University model',
    rateLimitPerMinute: 25,
    dailyQuota: 500,
    createdAt,
    keys: [],
  };
  await page.route('**/api/v1/account/api-access', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { request: accessRequest, consumer } }),
    }),
  );
  await page.route('**/api/v1/account/api-consumers/17/keys', (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          ...consumer,
          keys: [{ id: '31', prefix: 'sat_live_safe', createdAt, revokedAt: null }],
          apiKey: 'sat_live_one_time_e2e_secret',
        },
      }),
    }),
  );
  await page.route('**/api/v1/account/api-consumers/17/usage*', (route) => {
    expect(route.request().url()).toContain('from=2026-10-01&to=2026-10-05');
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          consumer: { id: '17', name: consumer.name, rateLimitPerMinute: 25, dailyQuota: 500 },
          from: '2026-10-01',
          to: '2026-10-05',
          totalRequests: 12,
          entries: [],
        },
      }),
    });
  });

  await page.goto('/account/api-access');
  await page.getByLabel('From date (UTC)').fill('2026-10-01');
  await page.getByLabel('To date (UTC)').fill('2026-10-05');
  await page.getByRole('button', { name: 'View API usage' }).click();
  await expect(page.getByText('Requests in period: 12')).toBeVisible();
  await page.getByRole('button', { name: 'Generate API key' }).click();
  const dialog = page.getByRole('dialog', { name: 'Copy your API key now' });
  await expect(dialog).toContainText('sat_live_one_time_e2e_secret');
  await dialog.getByRole('button', { name: 'Copy API key' }).click();
  await expect(dialog.getByRole('status')).toHaveText('API key copied.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'sat_live_one_time_e2e_secret',
  );
  await dialog.press('Escape');
  await expect(page.getByText('sat_live_one_time_e2e_secret')).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem('sat_live_one_time_e2e_secret')),
  ).toBeNull();
});

test('requester submits the responsive API access form in Night Match @mobile', async ({
  page,
}) => {
  const pending = {
    id: '22',
    requesterAccountId: '44',
    name: 'University insights',
    intendedUse: 'Analyse match trends for a university research dashboard.',
    state: 'pending',
    createdAt,
    reviewedAt: null,
    reviewedBy: null,
    reviewReason: null,
  };

  await page.addInitScript(() => window.localStorage.setItem('statsthegame-theme', 'night'));
  await page.route('**/api/v1/account/api-access', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { request: null, consumer: null } }),
    }),
  );
  await page.route('**/api/v1/account/api-access/requests', async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      name: pending.name,
      intendedUse: pending.intendedUse,
    });
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ data: pending }),
    });
  });

  await page.goto('/account/api-access');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  const form = page.getByRole('form', { name: 'API access request' });
  const name = form.getByLabel(/^Consumer or application name/);
  const intendedUse = form.getByLabel(/^Intended use/);
  await name.fill(pending.name);
  await name.press('Tab');
  await expect(intendedUse).toBeFocused();
  await intendedUse.fill(pending.intendedUse);
  await expectNoHorizontalOverflow(page);
  await form.getByRole('button', { name: 'Request API access' }).click();
  await expect(page.getByRole('heading', { name: 'Awaiting administrator review' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical'),
  ).toEqual([]);
});
