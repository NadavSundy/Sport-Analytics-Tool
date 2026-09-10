import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const authStorageKey = 'sb-e2e-auth-token';
const release = {
  releaseId: '01234567-89ab-cdef-0123-456789abcdef',
  version: '2026.09.2',
  createdAt: '2026-09-10T10:00:00.000Z',
  formatVersion: '1.0',
  scope: 'published-accepted-deliveries',
  eventCount: 1234,
  checksum: 'a'.repeat(64),
  fields: [
    { name: 'eventId', description: 'Stable identifier of the accepted delivery revision.' },
  ],
};

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

test('administrator publishes a snapshot that appears in the public catalogue @mobile', async ({
  page,
}) => {
  let releaseRequests = 0;

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
  await page.route('**/api/v1/admin/dataset-releases', async (route) => {
    releaseRequests += 1;
    expect(route.request().headers().authorization).toContain('Bearer ');
    expect(route.request().postDataJSON()).toEqual({ version: release.version });
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ data: release }),
    });
  });
  await page.route('**/api/v1/dataset-releases', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [release] }),
    });
  });

  await page.goto('/account');
  const publishLink = page.getByRole('link', { name: 'Publish dataset release' });
  await expect(publishLink).toBeVisible();
  await publishLink.click();

  await expect(page.getByRole('heading', { name: 'Publish dataset release' })).toBeVisible();
  await expect(page.getByText(/immediately creates an immutable snapshot/i)).toBeVisible();
  await page.getByRole('textbox', { name: 'Release version' }).fill(release.version);
  await page.getByRole('button', { name: 'Generate and publish snapshot' }).click();

  const status = page.getByRole('status');
  await expect(status.getByRole('heading', { name: `Dataset ${release.version}` })).toBeVisible();
  expect(releaseRequests).toBe(1);
  await status.getByRole('link', { name: 'Browse release catalogue' }).click();
  await expect(page.getByRole('link', { name: `Dataset ${release.version}` })).toBeVisible();

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
