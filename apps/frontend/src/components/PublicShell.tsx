import type { ReactNode } from 'react';
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
          <a className="brand-link" href="/" aria-label="Stat'sTheGame home">
            <BrandWordmark />
          </a>
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
