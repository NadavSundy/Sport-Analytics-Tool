import type { Session } from '@supabase/auth-js';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { Link, MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicApp } from './App';
import { AuthProvider } from './features/auth/AuthProvider';

// Issue #800: route-level behaviour every page shares — the loading state, a
// descriptive document title, and where focus and scroll land after navigation.

type AuthClient = ComponentProps<typeof AuthProvider>['client'];

function signedOutClient(): AuthClient {
  return {
    getSession: vi.fn().mockResolvedValue({ data: { session: null as Session | null } }),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { id: 'route-test', callback: vi.fn(), unsubscribe: vi.fn() } },
    })),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
  } as unknown as AuthClient;
}

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function publicReadFetch() {
  return vi.fn((input: RequestInfo | URL) => {
    const path = new URL(String(input)).pathname;
    if (path.endsWith('/competitors/team-1')) {
      return Promise.resolve(response({ data: { competitorId: 'team-1', name: 'Wanderers' } }));
    }
    if (path.endsWith('/competitions/league-1')) {
      return Promise.resolve(
        response({ data: { competitionId: 'league-1', name: 'Premier Cricket League' } }),
      );
    }
    if (path.endsWith('/dataset-releases')) return Promise.resolve(response({ data: [] }));
    return Promise.resolve(response({ data: [], pagination: { nextCursor: null, totalPages: 1 } }));
  });
}

function renderAt(path: string, extra?: JSX.Element) {
  return render(
    <AuthProvider client={signedOutClient()}>
      <MemoryRouter initialEntries={[path]}>
        <PublicApp />
        {extra}
      </MemoryRouter>
    </AuthProvider>,
  );
}

beforeEach(() => {
  document.title = 'Untitled';
  vi.stubGlobal('fetch', publicReadFetch());
  vi.stubGlobal('scrollTo', vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('route loading state', () => {
  it('announces the loading page with a correctly encoded ellipsis', () => {
    renderAt('/fixtures');

    expect(screen.getByRole('status', { name: 'Loading page' })).toHaveTextContent(
      /^Loading page…$/,
    );
  });
});

describe('document titles', () => {
  it.each([
    ['/fixtures', 'Fixtures'],
    ['/competitions', 'Competitions'],
    ['/seasons', 'Seasons'],
    ['/competitors', 'Teams'],
    ['/participants', 'Players'],
    ['/participants/compare', 'Compare players'],
    ['/dataset-releases', 'Dataset releases'],
    ['/api', 'API Explorer'],
    ['/privacy', 'Privacy Notice'],
    ['/terms', 'Terms of Use'],
    ['/accessibility', 'Accessibility Statement'],
    ['/does-not-exist', 'Page not found'],
  ])('names %s after its page', async (path, title) => {
    renderAt(path);

    await waitFor(() => expect(document.title).toBe(`${title} | Stat'sTheGame`));
  });

  it.each([
    ['/competitors/team-1', 'Wanderers'],
    ['/competitions/league-1', 'Premier Cricket League'],
  ])('names the %s record page after the loaded record', async (path, recordName) => {
    renderAt(path);

    expect(await screen.findByRole('heading', { level: 1, name: recordName })).toBeVisible();
    expect(document.title).toBe(`${recordName} | Stat'sTheGame`);
  });
});

describe('embedded loading and error states', () => {
  it('keep one page heading and the page title while comparison fixtures load', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => undefined)),
    );
    renderAt('/participants/compare');

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Loading fixtures' }),
    ).toBeVisible();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(document.title).toBe("Compare players | Stat'sTheGame");
  });

  it('keep the page title when comparison fixtures fail to load', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(response({ error: { code: 'INTERNAL', message: 'Unavailable.' } }, 500)),
    );
    renderAt('/participants/compare');

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Fixtures could not be loaded' }),
    ).toBeVisible();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(document.title).toBe("Compare players | Stat'sTheGame");
  });
});

describe('navigation focus and scroll', () => {
  function FilterLink() {
    return (
      <Link data-testid="filter-link" to="/fixtures?competitionId=league-1">
        Filter fixtures
      </Link>
    );
  }

  function GoTo({ to }: { to: string }) {
    const navigate = useNavigate();
    return (
      <button type="button" onClick={() => navigate(to)}>
        go {to}
      </button>
    );
  }

  it('moves focus to the main landmark and returns to the top after a page change', async () => {
    renderAt('/fixtures', <GoTo to="/competitions" />);
    await waitFor(() => expect(document.title).toBe("Fixtures | Stat'sTheGame"));
    // The initial load keeps the browser's own focus and scroll behaviour.
    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(document.body);

    fireEvent.click(screen.getByRole('button', { name: 'go /competitions' }));

    await waitFor(() => expect(document.title).toBe("Competitions | Stat'sTheGame"));
    // Instant, because the document otherwise scrolls smoothly from the old position.
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
    expect(document.activeElement).toBe(screen.getByRole('main'));
  });

  it('keeps focus and scroll in place when only the query string changes', async () => {
    renderAt('/fixtures', <FilterLink />);
    await waitFor(() => expect(document.title).toBe("Fixtures | Stat'sTheGame"));
    const link = screen.getByTestId('filter-link');
    link.focus();

    fireEvent.click(link);

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('competitionId=league-1'),
        expect.anything(),
      ),
    );
    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(link);
  });
});
