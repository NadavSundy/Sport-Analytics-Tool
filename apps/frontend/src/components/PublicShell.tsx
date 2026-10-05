import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import type { CurrentUserProfile } from '@sport-analytics/contracts';
import { Link, NavLink, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthProvider';
import { getPinnedShortcuts, type PinnedShortcut } from '../features/browse/pinned-shortcuts';
import { ThemeToggle } from './ThemeToggle';
import { useHeaderLayout } from './useHeaderLayout';
import { getInitialTheme, type Theme } from '../theme';

interface PublicShellProps {
  children: ReactNode;
}
interface MenuItem {
  label: string;
  to: string;
}

const exploreItems: MenuItem[] = [
  { label: 'Fixtures', to: '/fixtures' },
  { label: 'Competitions', to: '/competitions' },
  { label: 'Seasons', to: '/seasons' },
  { label: 'Teams', to: '/competitors' },
  { label: 'Players', to: '/participants' },
];

function BrandWordmark() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  useEffect(() => {
    const updateTheme = () => setTheme(getInitialTheme());
    window.addEventListener('statsthegame-theme-change', updateTheme);
    return () => window.removeEventListener('statsthegame-theme-change', updateTheme);
  }, []);

  return (
    <span className="brand-wordmark">
      <img
        className="brand-wordmark__image"
        src={
          theme === 'night'
            ? '/brand/statsthegame-wordmark-dark.svg'
            : '/brand/statsthegame-wordmark-light.svg'
        }
        alt="Stat'sTheGame"
        width={176}
        height={35}
      />
    </span>
  );
}

function useNavigationProfile() {
  const { isAuthenticated, isLoading, session } = useAuth();
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      setProfile(null);
      return;
    }
    const controller = new AbortController();
    const accessToken = session?.access_token ?? null;
    void Promise.all([import('../api/client'), import('../features/auth/current-user-api')])
      .then(([{ createAuthenticatedApiClient }, { getCurrentUserProfile }]) =>
        getCurrentUserProfile(
          createAuthenticatedApiClient(() => accessToken),
          controller.signal,
        ),
      )
      .then((nextProfile) => {
        if (!controller.signal.aborted) setProfile(nextProfile);
      })
      .catch(() => {
        if (!controller.signal.aborted) setProfile(null);
      });
    return () => controller.abort();
  }, [isAuthenticated, isLoading, session?.access_token]);

  return profile;
}

function workspaceItems(profile: CurrentUserProfile | null): MenuItem[] {
  if (profile?.role === 'submitter')
    return [
      { label: 'Submit data', to: '/submissions/new' },
      { label: 'My submissions', to: '/submissions/batches' },
      { label: 'Access & scope', to: '/account/access' },
    ];
  if (profile?.role === 'admin')
    return [
      { label: 'Submit data', to: '/submissions/new' },
      { label: 'Submission history', to: '/submissions/batches' },
      { label: 'Review', to: '/reviews/batches' },
    ];
  return [];
}

function usePinnedNavigationItems(): MenuItem[] {
  const { identity, isAuthenticated } = useAuth();
  const accountId = isAuthenticated ? (identity?.id ?? null) : null;
  const [shortcuts, setShortcuts] = useState<PinnedShortcut[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    function updateShortcuts() {
      setShortcuts(accountId ? getPinnedShortcuts(accountId) : []);
    }

    updateShortcuts();
    window.addEventListener('stats-pinned-change', updateShortcuts);
    return () => window.removeEventListener('stats-pinned-change', updateShortcuts);
  }, [accountId]);

  useEffect(() => {
    const controller = new AbortController();
    if (shortcuts.length === 0) {
      setItems([]);
      return () => controller.abort();
    }

    void import('../api/public-read')
      .then(({ publicReadApi }) =>
        Promise.all(
          shortcuts.map(async (shortcut) => {
            try {
              const response =
                shortcut.kind === 'team'
                  ? await publicReadApi.getCompetitor(shortcut.id, controller.signal)
                  : await publicReadApi.getCompetition(shortcut.id, controller.signal);
              return {
                label: `${shortcut.kind === 'team' ? 'Team' : 'League'}: ${response.data.name}`,
                to:
                  shortcut.kind === 'team'
                    ? `/competitors/${encodeURIComponent(shortcut.id)}`
                    : `/competitions/${encodeURIComponent(shortcut.id)}`,
              };
            } catch {
              return null;
            }
          }),
        ),
      )
      .then((nextItems) => {
        if (!controller.signal.aborted) {
          setItems(nextItems.filter((item): item is MenuItem => item !== null));
        }
      });

    return () => controller.abort();
  }, [shortcuts]);

  return items;
}

function NavigationMenu({ id, items, label }: { id: string; items: MenuItem[]; label: string }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (event: globalThis.KeyboardEvent | MouseEvent) => {
      if (event instanceof globalThis.KeyboardEvent && event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      } else if (event instanceof MouseEvent && !wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', close);
    document.addEventListener('mousedown', close);
    return () => {
      document.removeEventListener('keydown', close);
      document.removeEventListener('mousedown', close);
    };
  }, [open]);

  function handleKeys(event: KeyboardEvent<HTMLDivElement>) {
    const links = [...(wrapRef.current?.querySelectorAll<HTMLAnchorElement>('a') ?? [])];
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const offset = event.key === 'ArrowDown' ? 1 : -1;
      links[(index + offset + links.length) % links.length]?.focus();
    }
  }

  const active = items.some(
    (item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
  );

  return (
    <div className="navigation-menu" ref={wrapRef} onKeyDown={handleKeys}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        data-active={active || undefined}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
        <span className="navigation-menu__caret" aria-hidden="true">
          &#9662;
        </span>
      </button>
      {open ? (
        <div className="navigation-menu__panel" id={id}>
          {items.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AuthenticationNavigation({ profile }: { profile: CurrentUserProfile | null }) {
  const { isAuthenticated, isLoading } = useAuth();
  const items = workspaceItems(profile);
  if (isLoading)
    return (
      <p className="auth-navigation__status" role="status">
        Checking account...
      </p>
    );
  return (
    <nav className="auth-navigation" aria-label="Account">
      {items.length > 0 ? (
        <NavigationMenu id="workspace-menu" items={items} label="Manage Submission" />
      ) : null}
      {profile?.role === 'admin' ? <NavLink to="/admin">Administration</NavLink> : null}
      {isAuthenticated ? (
        <NavLink to="/account">Manage account</NavLink>
      ) : (
        <NavLink to="/sign-in">Sign in</NavLink>
      )}
    </nav>
  );
}

function MobileNavigation({
  items,
  profile,
}: {
  items: MenuItem[];
  profile: CurrentUserProfile | null;
}) {
  const { isAuthenticated, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const roleItems = workspaceItems(profile);

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLAnchorElement>('a')?.focus();
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open]);

  async function handleSignOut() {
    setSignOutError(null);
    setIsSigningOut(true);
    try {
      await signOut();
      setOpen(false);
      navigate('/', { replace: true });
    } catch {
      setSignOutError('Sign out failed. Please try again.');
    } finally {
      setIsSigningOut(false);
    }
  }
  const link = (item: MenuItem) => (
    <NavLink key={item.to} to={item.to}>
      {item.label}
    </NavLink>
  );

  return (
    <div className="mobile-navigation">
      <button
        ref={buttonRef}
        className="mobile-navigation__toggle"
        type="button"
        aria-expanded={open}
        aria-controls="mobile-navigation-panel"
        onClick={() => setOpen((value) => !value)}
      >
        <svg className="mobile-navigation__icon" viewBox="0 0 18 18" aria-hidden="true">
          {open ? (
            <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.75" />
          ) : (
            <path d="M2.5 5h13M2.5 9h13M2.5 13h13" stroke="currentColor" strokeWidth="1.75" />
          )}
        </svg>
        Menu
      </button>
      {open ? (
        <div className="mobile-navigation__panel" id="mobile-navigation-panel" ref={panelRef}>
          <nav aria-label="Mobile navigation">
            <section>
              <h2>Public</h2>
              {[
                ...exploreItems,
                { label: 'Downloads', to: '/dataset-releases' },
                { label: 'API', to: '/api' },
              ].map(link)}
            </section>
            {roleItems.length > 0 ? (
              <section>
                <h2>Manage Submission</h2>
                {roleItems.map(link)}
              </section>
            ) : null}
            {profile?.role === 'admin' ? (
              <section>
                <h2>Administration</h2>
                <NavLink to="/admin">Administration</NavLink>
              </section>
            ) : null}
            {items.length > 0 ? (
              <section>
                <h2>Pinned</h2>
                {items.map(link)}
              </section>
            ) : null}
            <section>
              <h2>Account</h2>
              {isAuthenticated ? (
                <>
                  <NavLink to="/account">Manage account</NavLink>
                  <button
                    type="button"
                    disabled={isSigningOut}
                    onClick={() => void handleSignOut()}
                  >
                    {isSigningOut ? 'Signing out...' : 'Sign out'}
                  </button>
                </>
              ) : (
                <NavLink to="/sign-in">Sign in</NavLink>
              )}
              {signOutError ? (
                <p className="form-message form-message--error" role="alert">
                  {signOutError}
                </p>
              ) : null}
            </section>
          </nav>
        </div>
      ) : null}
    </div>
  );
}

/**
 * After an in-app move to a different page, start that page at the top and move
 * focus to its main landmark, so keyboard and screen-reader users are not left on
 * a link that no longer exists. Back/forward keeps the browser's own restoration,
 * and a query-string change (filters, pagination) is not a new page.
 */
function useRouteChangeFocus() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const mainRef = useRef<HTMLElement>(null);
  const previousPathname = useRef(pathname);

  // A layout effect, so the new page is never painted at the old scroll position.
  useLayoutEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    if (navigationType === 'POP') return;
    const scrollToTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    scrollToTop();
    mainRef.current?.focus({ preventScroll: true });
    // A smooth or momentum scroll still running from the previous page applies one
    // more step after an instant scroll, leaving the new page a few pixels down.
    const frame = window.requestAnimationFrame(scrollToTop);
    return () => window.cancelAnimationFrame(frame);
  }, [navigationType, pathname]);

  return mainRef;
}

export function PublicShell({ children }: PublicShellProps) {
  const profile = useNavigationProfile();
  const pinnedItems = usePinnedNavigationItems();
  const mainRef = useRouteChangeFocus();
  const headerLayout = useHeaderLayout(workspaceItems(profile).length > 0);
  return (
    <div className="public-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="site-header" data-layout={headerLayout}>
        <div className="site-header__inner">
          <Link className="brand-link" to="/" aria-label="Stat'sTheGame home">
            <BrandWordmark />
          </Link>
          <nav aria-label="Public records" className="site-navigation">
            <NavigationMenu id="explore-menu" items={exploreItems} label="Explore Data" />
            {pinnedItems.length > 0 ? (
              <NavigationMenu id="pinned-menu" items={pinnedItems} label="Pinned" />
            ) : null}
            <NavLink to="/dataset-releases">Downloads</NavLink>
            <NavLink to="/api">API</NavLink>
          </nav>
          <div className="site-header__controls">
            <AuthenticationNavigation profile={profile} />
            <ThemeToggle />
            <MobileNavigation items={pinnedItems} profile={profile} />
          </div>
        </div>
      </header>
      <main id="main-content" ref={mainRef} tabIndex={-1}>
        {children}
      </main>
      <footer className="site-footer">
        <div className="site-footer__inner">
          <div className="site-footer__brand">
            <BrandWordmark />
            <p>The game, measured ball by ball.</p>
          </div>
          <nav aria-label="Footer navigation" className="site-footer__navigation">
            <Link to="/api">API Explorer</Link>
            <a href="https://sports-analytics-tool.pages.dev/api/overview/">API Documentation</a>
            <Link to="/privacy">Privacy Notice</Link>
            <Link to="/terms">Terms of Use</Link>
            <Link to="/accessibility">Accessibility</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
