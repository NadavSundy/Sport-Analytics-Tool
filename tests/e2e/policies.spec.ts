import { expect, test } from '@playwright/test';

const policyRoutes = [
  { path: '/privacy', heading: 'Privacy Notice' },
  { path: '/terms', heading: 'Terms of Use' },
  { path: '/accessibility', heading: 'Accessibility Statement' },
] as const;

test(
  'policy routes are public, responsive, and reachable from the footer',
  { tag: '@mobile' },
  async ({ page }) => {
    for (const policy of policyRoutes) {
      await page.goto(policy.path);

      // A public policy route must remain on its requested URL rather than
      // redirecting to authentication.
      await expect(page).toHaveURL(new RegExp(`${policy.path}$`));

      await expect(
        page.getByRole('heading', {
          level: 1,
          name: policy.heading,
        }),
      ).toBeVisible();

      const footer = page.getByRole('contentinfo');
      const footerNavigation = footer.getByRole('navigation', {
        name: 'Footer navigation',
      });

      // API and policy resources intentionally share one footer navigation.
      await expect(footerNavigation.getByRole('link', { name: 'API Explorer' })).toHaveAttribute(
        'href',
        '/api',
      );

      await expect(
        footerNavigation.getByRole('link', { name: 'API Documentation' }),
      ).toHaveAttribute('href', 'https://sports-analytics-tool.pages.dev/api/overview/');

      await expect(footerNavigation.getByRole('link', { name: 'Privacy Notice' })).toHaveAttribute(
        'href',
        '/privacy',
      );

      await expect(footerNavigation.getByRole('link', { name: 'Terms of Use' })).toHaveAttribute(
        'href',
        '/terms',
      );

      await expect(footerNavigation.getByRole('link', { name: 'Accessibility' })).toHaveAttribute(
        'href',
        '/accessibility',
      );

      // Contact information remains inside the policies rather than in
      // the global footer.
      await expect(footer.getByRole('link', { name: 'statsthegame@gmail.com' })).toHaveCount(0);

      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );

      expect(hasHorizontalOverflow).toBe(false);
    }
  },
);

test('footer policy links can be activated from the keyboard', async ({ page }) => {
  await page.goto('/');

  const footerNavigation = page.getByRole('contentinfo').getByRole('navigation', {
    name: 'Footer navigation',
  });

  const privacyLink = footerNavigation.getByRole('link', {
    name: 'Privacy Notice',
  });

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

  await privacyLink.focus();
  await expect(privacyLink).toBeFocused();

  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/privacy$/);

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Privacy Notice',
    }),
  ).toBeVisible();

  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});
