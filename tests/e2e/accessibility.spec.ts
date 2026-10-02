import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const routes = ['/', '/sign-in', '/account', '/privacy', '/terms', '/accessibility'] as const;
const themes = ['day', 'night'] as const;

// Separate route/theme audits avoid combining twelve expensive Axe runs inside
// a single Playwright test's timeout. Desktop coverage remains 6 x 2;
// mobile coverage remains the two public/auth pages in day mode.
for (const route of routes) {
  for (const theme of themes) {
    const runsOnMobile = theme === 'day' && (route === '/' || route === '/sign-in');
    test(`public and authentication page themes have no serious accessibility violations: ${route} (${theme})${runsOnMobile ? ' @mobile' : ''}`, async ({
      page,
    }) => {
      await page.goto(route);
      await page.evaluate((selectedTheme) => {
        document.documentElement.dataset.theme = selectedTheme;
        document.documentElement.style.colorScheme = selectedTheme === 'night' ? 'dark' : 'light';
      }, theme);

      const results = await new AxeBuilder({ page }).analyze();
      const seriousOrCriticalViolations = results.violations.filter(
        (violation) => violation.impact === 'serious' || violation.impact === 'critical',
      );

      expect(
        seriousOrCriticalViolations,
        `${route} ${theme} theme: ${JSON.stringify(seriousOrCriticalViolations, null, 2)}`,
      ).toEqual([]);
    });
  }
}

// The home-page question widget (issue #816) is an overlay dialog, so its content
// only exists after an interaction and the route audits above cannot reach it. The
// backend is mocked: the real endpoint calls a paid provider.
for (const theme of themes) {
  const runsOnMobile = theme === 'day';
  test(`the open ask-a-question dialog has no serious accessibility violations (${theme})${runsOnMobile ? ' @mobile' : ''}`, async ({
    page,
  }) => {
    await page.route('**/api/v1/natural-language-queries', async (route) => {
      await route.fulfill({
        json: {
          data: {
            question: 'Who has taken the most wickets in the Indian Premier League?',
            model: 'claude-haiku-4-5-20251001',
            evaluation: {
              outcome: 'unsupported',
              definitionVersion: `qdv1_${'a'.repeat(43)}`,
              definition: { kind: 'unsupported', reason: 'venue' },
              reason: 'venue',
            },
          },
        },
      });
    });

    await page.goto('/');
    await page.evaluate((selectedTheme) => {
      document.documentElement.dataset.theme = selectedTheme;
      document.documentElement.style.colorScheme = selectedTheme === 'night' ? 'dark' : 'light';
    }, theme);

    const trigger = page.getByRole('button', { name: 'Ask a stats question' });
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    await expect(page.getByRole('dialog', { name: 'Ask a stats question' })).toBeVisible();
    await page.getByLabel('Your question').fill('Which ground has seen the most sixes?');
    await page.getByRole('button', { name: 'Ask', exact: true }).click();
    await expect(page.getByText(/Venues are not recorded/i)).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCriticalViolations = results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    );

    expect(
      seriousOrCriticalViolations,
      `ask-a-question dialog ${theme} theme: ${JSON.stringify(seriousOrCriticalViolations, null, 2)}`,
    ).toEqual([]);
  });
}
