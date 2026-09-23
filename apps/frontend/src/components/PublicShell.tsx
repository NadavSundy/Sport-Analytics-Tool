import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { CurrentUserProfile } from '@sport-analytics/contracts';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthProvider';
import { getCurrentUserProfile } from '../features/auth/current-user-api';
import { useAuthenticatedApiClient } from '../features/auth/useAuthenticatedApiClient';
import { ThemeToggle } from './ThemeToggle';

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
  return (
    <span className="brand-wordmark">
      <img
        className="brand-wordmark__image brand-asset--day"
        src="/brand/statsthegame-wordmark-light.svg"
        alt="Stat'sTheGame"
      />
      <img
        className="brand-wordmark__image brand-asset--night"
        src="/brand/statsthegame-wordmark-dark.svg"
        alt="Stat'sTheGame"
      />
    </span>
  );
}

function useNavigationProfile() {
  const { isAuthenticated, isLoading } = useAuth();
  const client = useAuthenticatedApiClient();
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      setProfile(null);
      return;
    }
    const controller = new AbortController();
    void getCurrentUserProfile(client, controller.signal)
      .then(setProfile)
      .catch(() => {
        if (!controller.signal.aborted) setProfile(null);
      });
    return () => controller.abort();
  }, [client, isAuthenticated, isLoading]);

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
        <span aria-hidden="true"> &#9662;</span>
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
        <NavLink to="/account">Account</NavLink>
      ) : (
        <NavLink to="/sign-in">Sign in</NavLink>
      )}
    </nav>
  );
}

function MobileNavigation({ profile }: { profile: CurrentUserProfile | null }) {
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
            <section>
              <h2>Account</h2>
              {isAuthenticated ? (
                <>
                  <NavLink to="/account">Account</NavLink>
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

export function PublicShell({ children }: PublicShellProps) {
  const profile = useNavigationProfile();
  return (
    <div className="public-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="site-header">
        <div className="site-header__inner">
          <Link className="brand-link" to="/" aria-label="Stat'sTheGame home">
            <BrandWordmark />
          </Link>
          <nav aria-label="Public records" className="site-navigation">
            <NavigationMenu id="explore-menu" items={exploreItems} label="Explore Data" />
            <NavLink to="/dataset-releases">Downloads</NavLink>
            <NavLink to="/api">API</NavLink>
          </nav>
          <div className="site-header__controls">
            <AuthenticationNavigation profile={profile} />
            <ThemeToggle />
            <MobileNavigation profile={profile} />
          </div>
        </div>
      </header>
      <main id="main-content">{children}</main>
      <footer className="site-footer">
        <div className="site-footer__inner">
          <BrandWordmark />
          <nav aria-label="API resources" className="site-footer__navigation">
            <Link to="/api">API Explorer</Link>
            <a href="https://sports-analytics-tool.pages.dev/api/overview/">API Documentation</a>
          </nav>
          <p>The game, measured ball by ball.</p>
        </div>
      </footer>
    </div>
  );
}
