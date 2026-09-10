import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
  ).toBe(false);
}

const THREE_INITIALISATION_TIMEOUT_MS = 15_000;

async function hasWebGL(page: Page) {
  return page.evaluate(() => {
    if (typeof window.WebGLRenderingContext === 'undefined') {
      return false;
    }
    const testCanvas = document.createElement('canvas');
    return Boolean(testCanvas.getContext('webgl2') ?? testCanvas.getContext('webgl'));
  });
}

test(
  'homepage presents the public event-to-statistic journey in both themes',
  { tag: '@mobile' },
  async ({ page, isMobile }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { level: 1, name: 'The game, measured ball by ball.' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse fixtures' }).first()).toHaveAttribute(
      'href',
      '/fixtures',
    );
    await expect(page.getByRole('link', { name: 'Explore competitions' }).first()).toHaveAttribute(
      'href',
      '/competitions',
    );
    await expect(page.getByRole('heading', { name: 'Explosive', exact: true })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'See the event inside the statistic.' }),
    ).toBeVisible();
    await expect(page.getByText('/api/v1/fixtures/{fixtureId}/statistics')).toBeVisible();
    await expect(page.getByText('Event → derived values')).toBeVisible();
    await expectNoHorizontalOverflow(page);

    for (const theme of ['day', 'night'] as const) {
      await page.evaluate((selectedTheme) => {
        document.documentElement.dataset.theme = selectedTheme;
        document.documentElement.style.colorScheme = selectedTheme === 'night' ? 'dark' : 'light';
      }, theme);

      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      const canvas = page.locator('.hero-scene');
      if ((await canvas.count()) > 0) {
        await expect(canvas).toHaveAttribute('data-scene-theme', theme);
      }
      const results = await new AxeBuilder({ page }).analyze();
      expect(
        results.violations.filter(
          (violation) => violation.impact === 'serious' || violation.impact === 'critical',
        ),
        `${theme} homepage accessibility violations`,
      ).toEqual([]);
    }

    if (!isMobile) {
      const viewport = page.viewportSize();
      if (!viewport) {
        throw new Error('The desktop viewport is unavailable.');
      }
      const session = await page.context().newCDPSession(page);
      await session.send('Emulation.setDeviceMetricsOverride', {
        width: Math.floor(viewport.width / 2),
        height: viewport.height,
        deviceScaleFactor: 2,
        mobile: false,
      });
      await expect(
        page.getByRole('heading', { level: 1, name: 'The game, measured ball by ball.' }),
      ).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await session.send('Emulation.clearDeviceMetricsOverride');
      await session.detach();
    }
  },
);

test('homepage remains complete with reduced motion and without WebGL', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const visual = page.locator('[data-hero-enhancement]');
  await expect(visual).toHaveAttribute('data-hero-enhancement', 'fallback');
  await expect(visual.locator('canvas')).toHaveCount(0);
  await expect(page.getByTestId('hero-scene-fallback')).toBeVisible();
  await expect(page.getByText('Event → derived values')).toBeVisible();
  expect(
    await visual.evaluate((element) =>
      element
        .getAnimations({ subtree: true })
        .some((animation) => animation.playState === 'running'),
    ),
  ).toBe(false);

  await page.addInitScript(() => {
    Object.defineProperty(window, 'WebGLRenderingContext', {
      configurable: true,
      value: undefined,
    });
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload();

  await expect(visual).toHaveAttribute('data-hero-enhancement', 'fallback');
  await expect(visual.locator('canvas')).toHaveCount(0);
  await expect(page.getByText('Event → derived values')).toBeVisible();
});

test('primary homepage journey works from the keyboard', async ({ page }) => {
  await page.goto('/');
  const primaryLink = page.getByRole('link', { name: 'Browse fixtures' }).first();

  for (let index = 0; index < 16; index += 1) {
    await page.keyboard.press('Tab');
    if (await primaryLink.evaluate((element) => element === document.activeElement)) {
      break;
    }
  }

  await expect(primaryLink).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/fixtures$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Fixtures' })).toBeVisible();
});

test('Three.js enhancement pauses off-screen and unmounts without page errors', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.stack ?? error.message));
  await page.addInitScript(() => {
    const diagnostics = window as typeof window & { __heroContextLosses?: number };
    diagnostics.__heroContextLosses = 0;
    document.addEventListener(
      'webglcontextlost',
      (event) => {
        if (event.target instanceof HTMLCanvasElement && event.target.matches('.hero-scene')) {
          diagnostics.__heroContextLosses = (diagnostics.__heroContextLosses ?? 0) + 1;
        }
      },
      true,
    );
  });
  await page.goto('/');

  const visual = page.locator('[data-hero-enhancement]');
  const canvas = visual.locator('canvas');
  const webglAvailable = await hasWebGL(page);

  if (!webglAvailable) {
    test.skip(true, 'WebGL is unavailable in this browser runtime.');
  }

  await expect(visual).toHaveAttribute('data-hero-enhancement', 'three');
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toHaveAttribute('data-context-state', 'ready');
  await expect(canvas).toHaveAttribute('data-animation-state', /running|idle/);
  await page.waitForTimeout(3_000);
  expect(
    await page.evaluate(
      () => (window as typeof window & { __heroContextLosses?: number }).__heroContextLosses,
    ),
  ).toBe(0);
  await expect(canvas).toHaveAttribute('data-animation-state', /running|idle/);
  await page.locator('.home-cta').scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-animation-state', 'paused');

  await page.getByRole('link', { name: 'Browse fixtures' }).last().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Fixtures' })).toBeVisible();
  await expect(page.locator('.hero-scene')).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

test('Three.js enhancement reveals the fallback during context loss and restores in place', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.stack ?? error.message));
  await page.goto('/');

  const webglAvailable = await hasWebGL(page);
  test.skip(!webglAvailable, 'WebGL is unavailable in this browser runtime.');

  const visual = page.locator('[data-hero-enhancement]');
  const canvas = visual.locator('.hero-scene');

  await expect(
    canvas,
    'Three.js should initialise when the browser runtime reports WebGL support.',
  ).toHaveAttribute('data-context-state', 'ready', {
    timeout: THREE_INITIALISATION_TIMEOUT_MS,
  });
  await expect(visual).toHaveAttribute('data-hero-enhancement', 'three');

  const canSimulateContextLoss = await canvas.evaluate((element) => {
    const context = element.getContext('webgl2') ?? element.getContext('webgl');
    const extension = context?.getExtension('WEBGL_lose_context');
    if (!extension) {
      return false;
    }

    element.dataset.rendererInstance = 'original';
    const diagnostics = window as typeof window & { __restoreHeroContext?: () => void };
    diagnostics.__restoreHeroContext = () => extension.restoreContext();
    extension.loseContext();
    return true;
  });
  test.skip(!canSimulateContextLoss, 'WEBGL_lose_context is unavailable in this browser runtime.');

  await expect(visual).toHaveAttribute('data-hero-enhancement', 'fallback');
  await expect(canvas).toHaveAttribute('data-context-state', 'lost');
  await expect(canvas).toHaveAttribute('data-animation-state', 'context-lost');
  await expect(canvas).toHaveCSS('opacity', '0');
  await expect(canvas).toHaveCount(1);

  await page.evaluate(() => {
    (window as typeof window & { __restoreHeroContext?: () => void }).__restoreHeroContext?.();
  });

  await expect(visual).toHaveAttribute('data-hero-enhancement', 'three');
  await expect(canvas).toHaveAttribute('data-context-state', 'ready');
  await expect(canvas).toHaveAttribute('data-animation-state', /running|idle/);
  await expect(canvas).toHaveAttribute('data-renderer-instance', 'original');
  await expect(canvas).toHaveCount(1);
  expect(pageErrors).toEqual([]);
});
