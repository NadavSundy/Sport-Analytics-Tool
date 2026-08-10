import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthProvider';
import { ThemeToggle } from './ThemeToggle';

interface PublicShellProps {
  children: ReactNode;
}

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

function AuthenticationNavigation() {
  const { isAuthenticated, isLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  async function handleSignOut() {
    setIsSigningOut(true);
    setSignOutError(null);

    try {
      await signOut();
      navigate('/', { replace: true });
    } catch {
      setSignOutError('We could not sign you out. Please try again.');
    } finally {
      setIsSigningOut(false);
    }
  }

  if (isLoading) {
    return (
      <p className="auth-navigation__status" role="status">
        Checking account…
      </p>
    );
  }

  return (
    <div className="auth-navigation-wrap">
      <nav className="auth-navigation" aria-label="Account">
        {isAuthenticated ? (
          <>
            <NavLink to="/account">Account</NavLink>
            <button type="button" onClick={handleSignOut} disabled={isSigningOut}>
              {isSigningOut ? 'Signing Out…' : 'Sign Out'}
            </button>
          </>
        ) : (
          <>
            <NavLink to="/create-account">Create Account</NavLink>
            <NavLink to="/sign-in">Sign In</NavLink>
          </>
        )}
      </nav>
      {signOutError ? (
        <p className="auth-navigation__error" role="alert">
          {signOutError}
        </p>
      ) : null}
    </div>
  );
}

export function PublicShell({ children }: PublicShellProps) {
  return (
    <div className="public-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <header className="site-header">
        <div className="site-header__inner">
          <a className="brand-link" href="/" aria-label="Stat'sTheGame home">
            <BrandWordmark />
          </a>
          <div className="site-header__controls">
            <AuthenticationNavigation />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="main-content">{children}</main>

      <footer className="site-footer">
        <div className="site-footer__inner">
          <BrandWordmark />
          <p>The game, measured ball by ball.</p>
        </div>
      </footer>
    </div>
  );
}
