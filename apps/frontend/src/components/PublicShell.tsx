import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
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

export function PublicShell({ children }: PublicShellProps) {
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
            <NavLink to="/competitions">Competitions</NavLink>
            <NavLink to="/seasons">Seasons</NavLink>
            <NavLink to="/fixtures">Fixtures</NavLink>
            <NavLink to="/competitors">Competitors</NavLink>
            <NavLink to="/participants">Participants</NavLink>
          </nav>
          <ThemeToggle />
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
