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
    expect(screen.getByText('Supported API major version: v1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('shows an accessible loading state while fetching the backend specification', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => undefined)));

    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Loading API specification');
  });

  it('renders Swagger from the fetched contract and excludes planned operations', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okSpecification()));

    renderPage();

    const swagger = await screen.findByTestId('swagger-ui');
    expect(swagger).toHaveAttribute('data-paths', '/api/v1/health');
    expect(swagger).toHaveAttribute('data-auth-schemes', 'bearerAuth,apiKeyAuth');

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/openapi.yaml',
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
    expect(screen.getByTestId('swagger-ui')).toHaveAttribute('data-paths', '/api/v1/health');

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

    fireEvent.click(screen.getByRole('button', { name: 'Retry loading specification' }));

    expect(await screen.findByTestId('swagger-ui')).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
