import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const now = Math.floor(Date.now() / 1_000);
    window.localStorage.setItem(
      'sb-e2e-auth-token',
      JSON.stringify({
        access_token: 'requesting-e2e-token',
        refresh_token: 'managed-by-supabase',
        expires_in: 3_600,
        expires_at: now + 3_600,
        token_type: 'bearer',
        user: {
          id: 'requesting-user',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'viewer@example.com',
          app_metadata: {},
          user_metadata: {},
          identities: [],
          created_at: '2026-08-16T00:00:00.000Z',
        },
      }),
    );
  });
});

test(
  'eligible user requests access and reloads the persisted pending state',
  { tag: '@mobile' },
  async ({ page }) => {
    let approvalState: 'not_requested' | 'pending' = 'not_requested';
    let requestedCompetition: { competitionId: string; name: string } | null = null;

    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: '17',
            subject: 'requesting-user',
            displayName: 'Requesting User',
            role: 'viewer',
            approvalState,
            requestedCompetition,
            competitionIds: [],
          },
        }),
      });
    });

    await page.route('**/api/v1/competitions?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { competitionId: '5', name: 'Premier T20' },
            { competitionId: '8', name: 'University League' },
          ],
          pagination: { nextCursor: null },
        }),
      });
    });

    await page.route('**/api/v1/submitter-access-requests', async (route) => {
      expect(route.request().method()).toBe('POST');
      expect(route.request().headers().authorization).toBe('Bearer requesting-e2e-token');
      expect(route.request().postDataJSON()).toEqual({ competitionId: '8' });
      approvalState = 'pending';
      requestedCompetition = { competitionId: '8', name: 'University League' };

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            accountId: '17',
            approvalState: 'pending',
            requestedCompetition,
          },
        }),
      });
    });

    await page.goto('/account');

    const accessPanel = page.getByRole('region', { name: 'Submitter access' });
    const competitionSelect = accessPanel.getByRole('combobox', { name: 'Competition' });
    await expect(competitionSelect).toBeVisible();
    await expect(competitionSelect.locator('option')).toHaveText([
      'Premier T20',
      'University League',
    ]);
    await competitionSelect.selectOption('8');
    await expect(accessPanel.getByRole('combobox', { name: /fixture/i })).toHaveCount(0);

    const requestButton = page.getByRole('button', { name: 'Request submitter access' });
    await expect(requestButton).toBeVisible();
    await requestButton.focus();
    await expect(requestButton).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page.getByText('Pending approval')).toBeVisible();
    await expect(
      page
        .locator('.submitter-access-panel__message')
        .filter({ hasText: /request for University League.*awaiting administrator/i }),
    ).toBeVisible();
    await expect(requestButton).toHaveCount(0);

    await page.reload();

    await expect(page.getByText('Pending approval')).toBeVisible();
    await expect(requestButton).toHaveCount(0);

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
