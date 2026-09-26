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

async function signedOutNavigationAction(page: Page) {
  if ((page.viewportSize()?.width ?? 0) < 900) {
    await page.getByRole('button', { name: 'Menu' }).click();
    return page
      .getByRole('navigation', { name: 'Mobile navigation' })
      .getByRole('link', { name: 'Sign in' });
  }
  return page.getByRole('navigation', { name: 'Account' }).getByRole('link', { name: 'Sign in' });
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

test(
  'signed-out authentication pages are responsive and keyboard operable',
  { tag: '@mobile' },
  async ({ page }) => {
    await isolateSupabaseClientLock(page);
    await page.goto('/');

    const authenticationAction = await signedOutNavigationAction(page);
    await expect(authenticationAction).toHaveAttribute('href', '/sign-in');

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);

    await authenticationAction.click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole('heading', { name: 'Login or Sign up' })).toBeVisible();

    const googleAction = page.getByRole('button', { name: 'Sign in with Google' });
    await expect(googleAction).toHaveText('Sign in');
    await expect(googleAction.locator('svg[aria-hidden="true"]')).toBeVisible();
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

    const port = process.env.PLAYWRIGHT_PORT ?? '4173';
    expect((await oauthRequest).url()).toContain(encodeURIComponent(`http://127.0.0.1:${port}/`));
  },
);

test('OAuth cancellation returns a safe signed-out callback state', async ({ page }) => {
  await isolateSupabaseClientLock(page);

  await page.goto('/auth/callback#error=access_denied&error_description=private+provider+detail');

  await expect(page.getByRole('heading', { name: 'Completing Sign In' })).toBeVisible();

  await expect(page.getByRole('alert')).toHaveText('Sign-in was cancelled. No changes were made.');

  await expect(page).toHaveURL(/\/auth\/callback$/);

  await expect(page.getByText(/private provider detail/i)).toHaveCount(0);

  await expect(page.getByRole('link', { name: 'Try Again' })).toHaveAttribute('href', '/sign-in');

  await expect(page.getByRole('link', { name: 'Return Home' })).toHaveAttribute('href', '/');

  await expect(
    page.getByRole('navigation', { name: 'Account' }).getByRole('link', {
      name: 'Sign in',
    }),
  ).toBeVisible();
});

test('OAuth provider failure returns a safe recoverable callback state', async ({ page }) => {
  await isolateSupabaseClientLock(page);

  await page.goto(
    '/auth/callback?error=server_error&error_code=500&error_description=provider+secret+response',
  );

  await expect(page.getByRole('alert')).toHaveText(
    'We could not complete sign-in. Please try again.',
  );

  await expect(page).toHaveURL(/\/auth\/callback$/);

  await expect(page.getByText(/provider secret response/i)).toHaveCount(0);

  await expect(page.getByRole('link', { name: 'Try Again' })).toBeVisible();

  await expect(page.getByRole('link', { name: 'Return Home' })).toBeVisible();
});

test('stored Supabase identity completes the callback and opens the account', async ({ page }) => {
  await isolateSupabaseClientLock(page);

  await page.addInitScript(({ key, value }) => window.localStorage.setItem(key, value), {
    key: authStorageKey,
    value: createStoredSession(),
  });

  await page.goto('/auth/callback');

  await expect(page).toHaveURL(/\/account\/overview$/);

  await expect(page.getByRole('heading', { name: 'Account', exact: true })).toBeVisible();

  await expect(page.getByText('browser@example.com')).toBeVisible();

  await expect(page.getByRole('link', { name: 'Account management' })).toHaveAttribute(
    'href',
    '/account/security',
  );
  await expect(page.getByRole('link', { name: 'Manage account' })).toHaveAttribute(
    'href',
    '/account',
  );
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

  await page.goto('/account/security');

  await expect(page.getByRole('link', { name: 'Manage account' })).toHaveAttribute(
    'href',
    '/account',
  );
  await expect(page.getByRole('link', { name: 'Account management' })).toHaveAttribute(
    'href',
    '/account/security',
  );
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in' })).toHaveCount(0);

  const signOut = page.getByRole('button', { name: 'Sign out' });
  await signOut.focus();
  await expect(signOut).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL('/');
  await expect(await signedOutNavigationAction(page)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign out' })).toHaveCount(0);
});
