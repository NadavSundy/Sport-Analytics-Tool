import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const authStorageKey = 'sb-e2e-auth-token';
const createdAt = '2026-09-27T08:30:00.000Z';
const issuedKey = 'sat_live_e2e-created-secret-never-commit-a-real-key';
const rotatedKey = 'sat_live_e2e-rotated-secret-never-commit-a-real-key';

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
            created_at: '2026-09-10T10:00:00.000Z',
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

test('administrator creates, copies, rotates, and revokes an API consumer key @mobile', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  let consumers: Array<Record<string, unknown>> = [];
  let nextKeyId = 31;

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
  await page.route('**/api/v1/admin/api-consumers', async (route) => {
    expect(route.request().headers().authorization).toContain('Bearer ');
    if (route.request().method() === 'POST') {
      expect(route.request().postDataJSON()).toEqual({
        name: 'Match data partner',
        rateLimitPerMinute: 25,
        dailyQuota: 500,
      });
      const consumer = {
        id: '17',
        name: 'Match data partner',
        rateLimitPerMinute: 25,
        dailyQuota: 500,
        createdAt,
        keys: [
          { id: String(nextKeyId), prefix: issuedKey.slice(0, 17), createdAt, revokedAt: null },
        ],
      };
      consumers = [consumer];
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: { ...consumer, apiKey: issuedKey } }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { consumers } }),
    });
  });
  await page.route('**/api/v1/admin/api-consumers/17/keys/rotate', async (route) => {
    nextKeyId += 1;
    const previous = consumers[0] as { keys: Array<Record<string, unknown>> };
    const consumer = {
      ...previous,
      keys: [
        { ...previous.keys[0], revokedAt: createdAt },
        { id: String(nextKeyId), prefix: rotatedKey.slice(0, 17), createdAt, revokedAt: null },
      ],
    };
    consumers = [consumer];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { ...consumer, apiKey: rotatedKey } }),
    });
  });
  await page.route('**/api/v1/admin/api-consumers/17/keys/32', async (route) => {
    const consumer = consumers[0] as { keys: Array<Record<string, unknown>> };
    consumers = [
      {
        ...consumer,
        keys: consumer.keys.map((key) =>
          key.id === '32' ? { ...key, revokedAt: createdAt } : key,
        ),
      },
    ];
    await route.fulfill({ status: 204 });
  });

  await page.goto('/admin');
  await page.getByRole('link', { name: 'Manage API consumers' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'API consumers' })).toBeVisible();
  await page.getByLabel('Consumer name').fill('Match data partner');
  await page.getByLabel('Rate limit (requests per minute)').fill('25');
  await page.getByLabel('Daily quota (requests per UTC day)').fill('500');
  await page.getByRole('button', { name: 'Create consumer' }).click();

  const createdDialog = page.getByRole('dialog', { name: 'API key created' });
  await expect(createdDialog.getByLabel('New API key')).toHaveText(issuedKey);
  await createdDialog.getByRole('button', { name: 'Copy API key' }).click();
  await expect(createdDialog.getByRole('status')).toHaveText('API key copied.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(issuedKey);
  await createdDialog.getByRole('button', { name: 'Dismiss key' }).click();
  await expect(page.getByText(issuedKey)).toHaveCount(0);

  await page.getByRole('link', { name: 'Manage Match data partner' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Match data partner' })).toBeVisible();
  await page.getByRole('button', { name: 'Rotate key' }).click();
  const rotateDialog = page.getByRole('dialog', { name: 'Rotate API key?' });
  await expect(rotateDialog).toContainText('stop every previous active key');
  await rotateDialog.getByRole('button', { name: 'Rotate key' }).click();
  const rotatedDialog = page.getByRole('dialog', { name: 'API key rotated' });
  await expect(rotatedDialog.getByLabel('New API key')).toHaveText(rotatedKey);
  await rotatedDialog.getByRole('button', { name: 'Dismiss key' }).click();
  await expect(page.getByText(rotatedKey)).toHaveCount(0);

  await page.getByRole('button', { name: `Revoke key ${rotatedKey.slice(0, 17)}` }).click();
  const revokeDialog = page.getByRole('dialog', { name: 'Revoke API key?' });
  await revokeDialog.getByRole('button', { name: 'Revoke key' }).click();
  await expect(page.getByText('No active keys')).toBeVisible();
  await expect(page.locator('.admin-status-badge', { hasText: 'Revoked' })).toHaveCount(2);
  await expect(page.getByRole('link', { name: 'Open API Explorer' })).toHaveAttribute(
    'href',
    '/api',
  );

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
