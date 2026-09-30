import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PublicApp } from '../../App';
import { ApiExplorerPage } from './ApiExplorerPage';

vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    isLoading: false,
    signOut: vi.fn(),
  }),
}));

vi.mock('swagger-ui-react', () => ({
  default: ({
    spec,
  }: {
    spec?: {
      components?: { securitySchemes?: Record<string, unknown> };
      paths?: Record<string, unknown>;
    };
  }) => (
    <div
      data-testid="swagger-ui"
      data-auth-schemes={Object.keys(spec?.components?.securitySchemes ?? {}).join(',')}
      data-paths={Object.keys(spec?.paths ?? {}).join(',')}
    >
      Swagger UI
    </div>
  ),
}));

const SPECIFICATION = `openapi: 3.1.0
info:
  title: Sport Analytics API
  version: 1.0.0
servers:
  - url: https://api.example.test
paths:
  /api/v1/health:
    get:
      tags: [Health]
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

const testApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

function okSpecification(): Response {
  return {
    ok: true,
    status: 200,
    text: vi.fn().mockResolvedValue(SPECIFICATION),
  } as unknown as Response;
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ApiExplorerPage />
    </MemoryRouter>,
  );
}

async function loadInteractiveExplorer() {
  fireEvent.click(await screen.findByRole('button', { name: 'Load interactive API Explorer' }));
  return screen.findByTestId('swagger-ui');
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('ApiExplorerPage', () => {
  it('renders the public /api route without requiring a signed-in user', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okSpecification()));

    render(
      <MemoryRouter initialEntries={['/api']}>
        <PublicApp />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'API Explorer' }, { timeout: 5_000 }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Supported API major version: v1')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'How to access the API' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('explains public, consumer, and application access before the explorer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okSpecification()));

    renderPage();

    const accessRegion = screen.getByRole('region', { name: 'How to access the API' });
    expect(within(accessRegion).getByRole('heading', { name: 'Public API' })).toBeVisible();
    expect(within(accessRegion).getByText(/without authentication/)).toBeVisible();

    expect(within(accessRegion).getByRole('heading', { name: 'Consumer API' })).toBeVisible();
    expect(within(accessRegion).getByText(/administrator-issued API key/)).toBeVisible();
    expect(within(accessRegion).getByText(/X-API-Key/)).toBeVisible();
    expect(within(accessRegion).getByText(/ask a Stat'sTheGame administrator/)).toBeVisible();
    expect(within(accessRegion).getByText(/rate limits and daily quotas/)).toBeVisible();

    expect(
      within(accessRegion).getByRole('link', {
        name: 'Consumer API access and key guidance',
      }),
    ).toHaveAttribute('href', 'https://sports-analytics-tool.pages.dev/api/consumer-keys/');

    expect(
      within(accessRegion).getByRole('heading', { name: 'Application and admin API' }),
    ).toBeVisible();
    expect(within(accessRegion).getByText(/does not grant administrator/)).toBeVisible();
    expect(accessRegion).not.toHaveTextContent(/sat_live_/);

    expect(await loadInteractiveExplorer()).toBeInTheDocument();
  });

  it('keeps a visible accessible loading indicator until the specification is ready', async () => {
    let resolveSpecification: ((response: Response) => void) | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(
        new Promise<Response>((resolve) => {
          resolveSpecification = resolve;
        }),
      ),
    );

    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Loading API specification');
    expect(
      screen.getByRole('progressbar', { name: 'Loading API specification' }),
    ).toBeInTheDocument();

    resolveSpecification?.(okSpecification());

    expect(await loadInteractiveExplorer()).toBeInTheDocument();
    expect(
      screen.queryByRole('progressbar', { name: 'Loading API specification' }),
    ).not.toBeInTheDocument();
  });

  it('renders Swagger from the fetched contract and excludes planned operations', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okSpecification()));

    renderPage();

    const swagger = await loadInteractiveExplorer();
    expect(swagger).toHaveAttribute('data-paths', '/api/v1/health');
    expect(swagger).toHaveAttribute('data-auth-schemes', 'bearerAuth,apiKeyAuth');

    expect(fetch).toHaveBeenCalledWith(
      `${testApiBaseUrl.replace(/\/api\/v1$/, '')}/openapi.yaml`,
      expect.objectContaining({
        cache: 'no-store',
        headers: expect.objectContaining({
          Accept: expect.stringContaining('application/yaml'),
        }),
      }),
    );
  });

  it('shows planned operations separately as non-executable contract information', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okSpecification()));

    renderPage();

    const toggle = await screen.findByRole('checkbox', { name: /Show planned operations/ });
    expect(await loadInteractiveExplorer()).toHaveAttribute('data-paths', '/api/v1/health');

    fireEvent.click(toggle);

    const plannedRegion = await screen.findByRole('region', { name: 'Planned operations' });
    expect(within(plannedRegion).getByText('/api/v1/future-statistic')).toBeInTheDocument();
    expect(within(plannedRegion).getByText('Future statistic')).toBeInTheDocument();
    expect(within(plannedRegion).getByText('PLANNED')).toBeInTheDocument();
    expect(within(plannedRegion).queryByRole('button')).not.toBeInTheDocument();

    expect(screen.getByTestId('swagger-ui')).toHaveAttribute('data-paths', '/api/v1/health');
  });

  it('shows a clear failure state and retries the specification request', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: vi.fn(),
      } as unknown as Response)
      .mockResolvedValueOnce(okSpecification());

    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not load the API specification',
    );
    expect(
      screen.queryByRole('progressbar', { name: 'Loading API specification' }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry loading specification' }));

    expect(await loadInteractiveExplorer()).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
