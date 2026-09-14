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

describe('public shell footer', () => {
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

  // Issue #475 (P01-F27): in Sprint 2 user testing the participant searched the
  // navigation and the footer for API information and found none. The footer entry
  // leads to the published documentation site, which documents the API.
  it('links from the footer to the published API documentation in the same tab', () => {
    render(
      <AuthProvider client={createSignedOutAuthClient()}>
        <MemoryRouter initialEntries={['/fixtures']}>
          <PublicShell>
            <p>Another public page</p>
          </PublicShell>
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getByText('Another public page')).toBeInTheDocument();
    const apiLink = within(screen.getByRole('contentinfo')).getByRole('link', { name: 'API' });
    expect(apiLink).toHaveAttribute(
      'href',
      'https://sports-analytics-tool.pages.dev/api/overview/',
    );
    expect(apiLink).not.toHaveAttribute('target');
  });
});
