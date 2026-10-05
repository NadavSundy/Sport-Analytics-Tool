import { expect, test, type Page } from '@playwright/test';
import { mockPublishedRecord, reviewedRoutes, type MockRole } from './support/published-record-mocks';

// Issue #800: the header must never overlap, clip or wrap its controls at any
// width, and no route may scroll sideways at 320 CSS pixels — the width a
// 1280px window reaches at 400% zoom (WCAG 2.2 SC 1.4.10 Reflow).

interface HeaderBox {
  name: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  clipped: boolean;
}

async function visibleHeaderItems(page: Page): Promise<HeaderBox[]> {
  return page.locator('.site-header__inner').evaluate((inner) => {
    const candidates = inner.querySelectorAll<HTMLElement>(
      '.brand-link, .site-navigation > a, .site-navigation .navigation-menu > button, .auth-navigation > a, .auth-navigation .navigation-menu > button, .theme-toggle, .mobile-navigation__toggle',
    );
    return [...candidates]
      .filter((element) => element.getClientRects().length > 0)
      .map((element) => {
        const box = element.getBoundingClientRect();
        return {
          name: (element.textContent || element.getAttribute('aria-label') || '').trim(),
          left: box.left,
          right: box.right,
          top: box.top,
          bottom: box.bottom,
          clipped: element.scrollWidth > element.clientWidth + 1,
        };
      });
  });
}

function overlaps(a: HeaderBox, b: HeaderBox) {
  return a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
}

for (const role of ['signed-out', 'admin'] as MockRole[]) {
  test(`header controls never overlap, clip or wrap (${role})`, async ({ page }) => {
    await mockPublishedRecord(page, role);
    await page.goto('/fixtures');
    if (role === 'admin') {
      await expect(page.locator('.site-header').getByText('Administration')).toHaveCount(1);
    }

    for (const width of [320, 360, 390, 600, 768, 900, 960, 1024, 1100, 1180, 1280, 1440]) {
      await page.setViewportSize({ width, height: 800 });
      const items = await visibleHeaderItems(page);
      const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);

      for (const item of items) {
        expect(item.right, `${item.name} ends inside the viewport at ${width}px`).toBeLessThanOrEqual(
          viewportWidth,
        );
        expect(item.clipped, `${item.name} is not clipped at ${width}px`).toBe(false);
        // A header control taller than one 44px row has wrapped its label.
        expect(item.bottom - item.top, `${item.name} stays on one line at ${width}px`).toBeLessThanOrEqual(
          48,
        );
      }
      for (const [index, item] of items.entries()) {
        for (const other of items.slice(index + 1)) {
          expect(overlaps(item, other), `${item.name} / ${other.name} at ${width}px`).toBe(false);
        }
      }
    }
  });
}

test('every reviewed route reflows at 320 CSS pixels without sideways scrolling', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await mockPublishedRecord(page, 'admin');
  await page.setViewportSize({ width: 320, height: 800 });
  const overflowing: string[] = [];

  for (const route of [...reviewedRoutes.public, ...reviewedRoutes.workspace]) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    if (scrollWidth > 320) overflowing.push(`${route} (${scrollWidth}px)`);
  }

  expect(overflowing).toEqual([]);
});
