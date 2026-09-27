import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const openApiDocument = `openapi: 3.1.0
info:
  title: Sport Analytics API
  version: 1.0.0
paths:
  /api/v1/health:
    get:
      tags: [Health]
      summary: Check API health
      operationId: getHealth
      x-implementation-status: implemented
      security: []
      responses:
        '200':
          description: Healthy
  /api/v1/future-statistic:
    get:
      tags: [Statistics]
      summary: Future statistic
      operationId: getFutureStatistic
      x-implementation-status: planned
      security: []
      responses:
        '200':
          description: Future response
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
    apiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
`;

async function stubOpenApi(page: Page) {
  await page.route('**/openapi.yaml', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/yaml',
      body: openApiDocument,
    });
  });
}

test(
  'public navigation reaches the explorer and the page does not overflow',
  { tag: '@mobile' },
  async ({ page }) => {
    await stubOpenApi(page);
    await page.goto('/');

    if ((page.viewportSize()?.width ?? 0) < 900) {
      await page.getByRole('button', { name: 'Menu' }).click();
      await page
        .getByRole('navigation', { name: 'Mobile navigation' })
        .getByRole('link', { name: 'API' })
        .click();
    } else {
      const navigation = page.getByRole('navigation', { name: 'Public records' });
      await expect(navigation.getByRole('link', { name: 'API' })).toBeVisible();
      await navigation.getByRole('link', { name: 'API' }).click();
    }

    await expect(page).toHaveURL(/\/api$/);
    await expect(page.getByRole('heading', { level: 1, name: 'API Explorer' })).toBeVisible();
    await expect(page.getByText('Supported API major version: v1')).toBeVisible();

    await expect(
      page.locator('.swagger-ui .opblock-summary-path', { hasText: '/api/v1/health' }),
    ).toBeVisible();

    // The app owns title/version/onboarding, while endpoint-level Schema tabs
    // remain available inside Swagger. Duplicate/global Swagger chrome stays hidden.
    await expect(page.locator('.swagger-ui .info')).toBeHidden();
    await expect(page.locator('.swagger-ui section.models')).toHaveCount(0);

    await expect(
      page.locator('.swagger-ui .opblock-summary-path', {
        hasText: '/api/v1/future-statistic',
      }),
    ).toHaveCount(0);

    const pageOverflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(pageOverflows).toBe(false);

    const footer = page.getByRole('contentinfo');
    await expect(footer.getByRole('link', { name: 'API Explorer' })).toHaveAttribute(
      'href',
      '/api',
    );
    await expect(footer.getByRole('link', { name: 'API Documentation' })).toHaveAttribute(
      'href',
      'https://sports-analytics-tool.pages.dev/api/overview/',
    );
  },
);

test('planned operations are explicit, separate from Swagger, and non-executable', async ({
  page,
}) => {
  await stubOpenApi(page);
  await page.goto('/api');

  await page.getByRole('checkbox', { name: /Show planned operations/ }).check();

  const plannedRegion = page.getByRole('region', { name: 'Planned operations' });
  await expect(plannedRegion).toBeVisible();
  await expect(plannedRegion.getByText('/api/v1/future-statistic')).toBeVisible();
  await expect(plannedRegion.getByText('Future statistic')).toBeVisible();
  await expect(plannedRegion.locator('.api-explorer__planned-state')).toHaveText('PLANNED');
  await expect(plannedRegion.getByRole('button')).toHaveCount(0);

  await expect(
    page.locator('.swagger-ui .opblock-summary-path', {
      hasText: '/api/v1/future-statistic',
    }),
  ).toHaveCount(0);

  await expect(
    page.locator('.swagger-ui .opblock-summary-path', { hasText: '/api/v1/health' }),
  ).toBeVisible();
});

test('project-owned explorer shell and controls have no serious accessibility violations', async ({
  page,
}) => {
  await stubOpenApi(page);
  await page.goto('/api');

  await expect(page.getByRole('heading', { level: 1, name: 'API Explorer' })).toBeVisible();
  await expect(page.locator('.swagger-ui')).toBeVisible();

  const results = await new AxeBuilder({ page }).exclude('.swagger-ui').analyze();
  const seriousOrCritical = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );

  expect(seriousOrCritical).toEqual([]);
});
