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
          <span className="theme-toggle__thumb" />
        </span>
        <span className="theme-control__value" aria-live="polite">
          {isNightMatch ? 'Night Match' : 'Day Match'}
        </span>
      </label>
    </div>
  );
}
