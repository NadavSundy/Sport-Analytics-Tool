import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { THEME_STORAGE_KEY } from './theme';

function useSystemTheme(prefersDark: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' && prefersDark,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

describe('public landing page', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('style');
    useSystemTheme(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders the branded public page without requesting API data', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'Stat’sTheGame' })).toBeInTheDocument();
    expect(screen.getAllByText('The game, measured ball by ball.')).toHaveLength(2);
    expect(screen.getByRole('link', { name: "Stat'sTheGame home" })).toHaveAttribute('href', '/');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses a stored theme before the operating-system preference', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'night');
    useSystemTheme(false);

    render(<App />);

    expect(document.documentElement).toHaveAttribute('data-theme', 'night');
    expect(screen.getByRole('checkbox', { name: 'Switch to Day Match theme' })).toBeChecked();
  });

  it('uses the operating-system preference when no theme is stored', () => {
    useSystemTheme(true);

    render(<App />);

    expect(document.documentElement).toHaveAttribute('data-theme', 'night');
  });

  it('falls back to Day Match when no stored or system preference is available', () => {
    render(<App />);

    expect(document.documentElement).toHaveAttribute('data-theme', 'day');
  });

  it('persists a manual theme selection', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Switch to Night Match theme' }));

    expect(document.documentElement).toHaveAttribute('data-theme', 'night');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('night');
    expect(screen.getByText('Night Match')).toBeInTheDocument();
  });
});
