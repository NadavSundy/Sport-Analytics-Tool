import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../features/auth/AuthProvider';
import { PublicShell } from './PublicShell';

type AuthClient = ComponentProps<typeof AuthProvider>['client'];
type AuthStateListener = (event: AuthChangeEvent, session: Session | null) => void;

function createSignedOutAuthClient() {
  return {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: vi.fn((listener: AuthStateListener) => ({
      data: {
        subscription: {
          id: 'public-shell-test-subscription',
          callback: listener,
          unsubscribe: vi.fn(),
        },
      },
    })),
    signInWithOAuth: vi
      .fn()
      .mockResolvedValue({ data: { provider: 'google', url: null }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  } as unknown as AuthClient;
}

function createSignedInAuthClient() {
  const session = {
    access_token: 'token',
    refresh_token: 'refresh',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: 'user-1',
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: {},
      user_metadata: {},
      identities: [],
      created_at: '2026-09-20T00:00:00Z',
    },
  } as Session;
  const client = createSignedOutAuthClient();
  vi.mocked(client.getSession).mockResolvedValue({ data: { session }, error: null });
  return client;
}

function profileResponse(role: 'viewer' | 'submitter' | 'admin') {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({
      user: {
        id: '1',
        subject: 'user-1',
        displayName: 'User',
        role,
        approvalState: role === 'viewer' ? 'not_requested' : 'approved',
        requestedCompetition: null,
        competitionIds: role === 'submitter' ? ['5'] : [],
      },
    }),
  } as unknown as Response;
}

describe('public shell API discovery', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('exposes the API Explorer from the primary public navigation', () => {
    render(
      <AuthProvider client={createSignedOutAuthClient()}>
        <MemoryRouter initialEntries={['/fixtures']}>
          <PublicShell>
            <p>Another public page</p>
          </PublicShell>
        </MemoryRouter>
      </AuthProvider>,
    );

    const publicNavigation = screen.getByRole('navigation', { name: 'Public records' });
    expect(within(publicNavigation).getByRole('link', { name: 'API' })).toHaveAttribute(
      'href',
      '/api',
    );
  });

  it('makes the bottom API entry open the explorer while keeping broader docs distinct', () => {
    render(
      <AuthProvider client={createSignedOutAuthClient()}>
        <MemoryRouter initialEntries={['/fixtures']}>
          <PublicShell>
            <p>Another public page</p>
          </PublicShell>
        </MemoryRouter>
      </AuthProvider>,
    );

    const apiResources = within(screen.getByRole('contentinfo')).getByRole('navigation', {
      name: 'API resources',
    });

    expect(within(apiResources).getByRole('link', { name: 'API Explorer' })).toHaveAttribute(
      'href',
      '/api',
    );

    const docsLink = within(apiResources).getByRole('link', { name: 'API Documentation' });
    expect(docsLink).toHaveAttribute(
      'href',
      'https://sports-analytics-tool.pages.dev/api/overview/',
    );
    expect(docsLink).not.toHaveAttribute('target');
  });

  it('opens the Explore Data menu, supports Escape, and restores focus', () => {
    render(
      <AuthProvider client={createSignedOutAuthClient()}>
        <MemoryRouter initialEntries={['/fixtures']}>
          <PublicShell>
            <p>Page</p>
          </PublicShell>
        </MemoryRouter>
      </AuthProvider>,
    );
    const trigger = screen.getByRole('button', { name: 'Explore Data' });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const explore = within(document.getElementById('explore-menu')!);
    expect(explore.getAllByRole('link')[0]).toHaveAccessibleName('Fixtures');
    expect(explore.getByRole('link', { name: 'Fixtures' })).toHaveAttribute('href', '/fixtures');
    expect(explore.getByRole('link', { name: 'Players' })).toHaveAttribute('href', '/participants');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  it('provides direct public links in the labelled mobile menu and restores focus on Escape', () => {
    render(
      <AuthProvider client={createSignedOutAuthClient()}>
        <MemoryRouter>
          <PublicShell>
            <p>Page</p>
          </PublicShell>
        </MemoryRouter>
      </AuthProvider>,
    );
    const trigger = screen.getByRole('button', { name: 'Menu' });
    fireEvent.click(trigger);
    const mobile = screen.getByRole('navigation', { name: 'Mobile navigation' });
    expect(within(mobile).getByRole('link', { name: 'Fixtures' })).toHaveAttribute(
      'href',
      '/fixtures',
    );
    expect(within(mobile).getByRole('link', { name: 'API' })).toHaveAttribute('href', '/api');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(trigger).toHaveFocus();
  });

  it.each([
    ['viewer', []],
    ['submitter', ['Submit data', 'My submissions', 'Access & scope']],
    ['admin', ['Submit data', 'Submission history', 'Review']],
  ] as const)('shows only the %s Manage Submission destinations', async (role, labels) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(profileResponse(role)));
    render(
      <AuthProvider client={createSignedInAuthClient()}>
        <MemoryRouter>
          <PublicShell>
            <p>Page</p>
          </PublicShell>
        </MemoryRouter>
      </AuthProvider>,
    );
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const manageSubmission = screen.queryByRole('button', { name: 'Manage Submission' });
    if (labels.length === 0) {
      expect(manageSubmission).toBeNull();
      expect(screen.queryByRole('link', { name: 'Administration' })).toBeNull();
      return;
    }
    fireEvent.click(manageSubmission!);
    for (const label of labels)
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    if (role === 'submitter') {
      expect(screen.queryByRole('link', { name: 'Review' })).toBeNull();
      expect(screen.queryByRole('link', { name: 'Administration' })).toBeNull();
    } else {
      expect(screen.getByRole('link', { name: 'Administration' })).toHaveAttribute(
        'href',
        '/admin',
      );
    }

    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    const mobile = within(screen.getByRole('navigation', { name: 'Mobile navigation' }));
    expect(mobile.getByRole('heading', { name: 'Manage Submission' })).toBeInTheDocument();
    if (role === 'admin') {
      expect(mobile.getByRole('link', { name: 'Administration' })).toHaveAttribute(
        'href',
        '/admin',
      );
    } else {
      expect(mobile.queryByRole('link', { name: 'Administration' })).toBeNull();
    }
  });
});
