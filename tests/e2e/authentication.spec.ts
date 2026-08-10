import { expect, test, type Page } from '@playwright/test';

const authStorageKey = 'sb-e2e-auth-token';

async function isolateSupabaseClientLock(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, 'locks', {
      configurable: true,
      value: undefined,
    });
  });
}

function createStoredSession() {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      aud: 'authenticated',
      exp: expiresAt,
      sub: 'e2e-user',
    }),
  ).toString('base64url');

  return JSON.stringify({
    access_token: `${header}.${payload}.e2e-signature`,
    refresh_token: 'e2e-refresh-token',
    expires_at: expiresAt,
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: 'e2e-user',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'browser@example.com',
      app_metadata: {},
      user_metadata: {},
      identities: [],
      created_at: '2026-08-09T00:00:00.000Z',
    },
  });
}

test('signed-out authentication pages are responsive and keyboard operable', async ({ page }) => {
  await isolateSupabaseClientLock(page);
  await page.goto('/create-account');

  await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create Account' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(
    page.getByRole('navigation', { name: 'Account' }).getByRole('link', { name: 'Sign In' }),
  ).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);

  await page.goto('/sign-in');
  const googleAction = page.getByRole('button', { name: 'Continue with Google' });
  await googleAction.focus();
  await expect(googleAction).toBeFocused();

  const oauthRequest = page.waitForRequest(
    (request) =>
      request.url().startsWith('https://e2e.supabase.co/auth/v1/authorize') &&
      request.url().includes('provider=google'),
  );
  await page.route('https://e2e.supabase.co/auth/v1/authorize**', async (route) => {
    await route.fulfill({ contentType: 'text/html', body: '<p>Managed OAuth boundary</p>' });
  });

  await page.keyboard.press('Enter');

  expect((await oauthRequest).url()).toContain(encodeURIComponent('http://127.0.0.1:4173/'));
});

test('stored Supabase identity updates navigation and can sign out', async ({ page }) => {
  await isolateSupabaseClientLock(page);
  await page.addInitScript(({ key, value }) => window.localStorage.setItem(key, value), {
    key: authStorageKey,
    value: createStoredSession(),
  });
  await page.route('https://e2e.supabase.co/auth/v1/logout**', async (route) => {
    await route.fulfill({ status: 204 });
  });

  await page.goto('/account');

  await expect(page.getByRole('link', { name: 'Account' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();
  await expect(page.getByText('browser@example.com')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create Account' })).toHaveCount(0);

  const signOut = page.getByRole('button', { name: 'Sign Out' });
  await signOut.focus();
  await expect(signOut).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('link', { name: 'Create Account' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign Out' })).toHaveCount(0);
});
