import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../features/auth/AuthProvider';
import { HomePage } from '../features/home/HomePage';
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
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
  });

  // Issue #475 (P01-F27): in Sprint 2 user testing the participant searched the
  // navigation and the footer for API information and found none. The link must lead
  // to the API section itself, not merely to the top of the home page.
  it('links from the footer to the API section of the home page and scrolls to it', async () => {
    const scrolledTo: HTMLElement[] = [];
    // jsdom does not implement scrollIntoView, so record which element was scrolled to.
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: function (this: HTMLElement) {
        scrolledTo.push(this);
      },
    });

    render(
      <AuthProvider client={createSignedOutAuthClient()}>
        <MemoryRouter initialEntries={['/fixtures']}>
          <PublicShell>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="*" element={<p>Another public page</p>} />
            </Routes>
          </PublicShell>
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getByText('Another public page')).toBeInTheDocument();
    const apiLink = within(screen.getByRole('contentinfo')).getByRole('link', { name: 'API' });
    expect(apiLink).toHaveAttribute('href', '/#api');

    fireEvent.click(apiLink);

    const apiSection = (
      await screen.findByRole('heading', { name: 'The API is part of the product.' })
    ).closest('section');
    expect(apiSection).toHaveAttribute('id', 'api');
    await waitFor(() => expect(scrolledTo).toEqual([apiSection]));
  });
});
