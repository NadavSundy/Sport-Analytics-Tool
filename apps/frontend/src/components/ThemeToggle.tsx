import { useLayoutEffect, useState } from 'react';
import { applyTheme, getInitialTheme, persistTheme, type Theme } from '../theme';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const isNightMatch = theme === 'night';
  const nextThemeName = isNightMatch ? 'Day Match' : 'Night Match';

  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function handleThemeChange() {
    const nextTheme: Theme = isNightMatch ? 'day' : 'night';
    persistTheme(nextTheme);
    setTheme(nextTheme);
    window.dispatchEvent(new Event('statsthegame-theme-change'));
  }

  return (
    <div className="theme-control">
      <span className="theme-control__label">Theme</span>
      <label className="theme-toggle">
        <input
          type="checkbox"
          checked={isNightMatch}
          onChange={handleThemeChange}
          aria-label={`Switch to ${nextThemeName} theme`}
        />
        <span className="theme-toggle__track" aria-hidden="true">
          <span className="theme-toggle__thumb">
            <svg className="theme-toggle__icon theme-toggle__icon--day" viewBox="0 0 10 10">
              <circle cx="5" cy="5" r="2.25" fill="currentColor" />
              <path
                d="M5 .5v1.25M5 8.25V9.5M.5 5h1.25M8.25 5H9.5M1.8 1.8l.9.9M7.3 7.3l.9.9M1.8 8.2l.9-.9M7.3 2.7l.9-.9"
                stroke="currentColor"
                strokeLinecap="round"
              />
            </svg>
            <svg className="theme-toggle__icon theme-toggle__icon--night" viewBox="0 0 10 10">
              <path
                d="M7.9 6.6A3.75 3.75 0 0 1 3.4 2.1 3.75 3.75 0 1 0 7.9 6.6Z"
                fill="currentColor"
              />
            </svg>
          </span>
        </span>
        <span className="theme-control__value" aria-live="polite">
          {isNightMatch ? 'Night Match' : 'Day Match'}
        </span>
      </label>
    </div>
  );
}
