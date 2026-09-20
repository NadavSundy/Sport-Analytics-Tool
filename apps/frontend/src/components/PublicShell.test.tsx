import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { render, screen, within } from '@testing-library/react';
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
});
