import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from './HomePage';

function useMotionPreference(reducedMotion: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)' ? reducedMotion : false,
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

function renderHomePage() {
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

describe('homepage', () => {
  beforeEach(() => {
    useMotionPreference(false);
    vi.stubGlobal('WebGLRenderingContext', class WebGLRenderingContext {});
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as RenderingContext);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders the critical hero without requesting application data or mounting below-fold content', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    renderHomePage();

    expect(
      screen.getByRole('heading', { level: 1, name: 'The game, measured ball by ball.' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Browse fixtures' })[0]).toHaveAttribute(
      'href',
      '/fixtures',
    );
    expect(screen.getAllByRole('link', { name: 'Explore competitions' })[0]).toHaveAttribute(
      'href',
      '/competitions',
    );
    expect(screen.getAllByRole('link', { name: /Browse players/ })[0]).toHaveAttribute(
      'href',
      '/participants',
    );
    expect(screen.queryByRole('heading', { name: 'Explosive' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'See the event inside the statistic.' }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('hero-scene-fallback')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses only documented public journeys and API paths', async () => {
    renderHomePage();

    const explore = (
      await screen.findByRole('heading', { name: 'Start with the cricket.' })
    ).closest('section');
    expect(explore).not.toBeNull();
    const exploreLinks = within(explore as HTMLElement).getAllByRole('link');
    expect(exploreLinks.map((link) => link.getAttribute('href'))).toEqual([
      '/fixtures',
      '/competitions',
      '/participants',
      '/competitors',
    ]);

    expect(await screen.findByText('/api/v1/fixtures')).toBeInTheDocument();
    expect(await screen.findByText('/api/v1/fixtures/{fixtureId}/events')).toBeInTheDocument();
    expect(await screen.findByText('/api/v1/fixtures/{fixtureId}/statistics')).toBeInTheDocument();
  });

  it('keeps the intentional static fallback and avoids the Three.js canvas for reduced motion', () => {
    useMotionPreference(true);

    renderHomePage();

    const visual = screen.getByTestId('hero-scene-fallback').parentElement;
    expect(visual).toHaveAttribute('data-hero-enhancement', 'fallback');
    expect(visual?.querySelector('canvas')).toBeNull();
    expect(screen.getByText('Event → derived values')).toBeInTheDocument();
  });

  it('defers the optional Three.js enhancement until the visitor interacts with the page', () => {
    const requestIdleCallback = vi.fn();
    Object.defineProperty(window, 'requestIdleCallback', {
      configurable: true,
      value: requestIdleCallback,
    });

    renderHomePage();

    expect(requestIdleCallback).not.toHaveBeenCalled();
    expect(HTMLCanvasElement.prototype.getContext).not.toHaveBeenCalled();
    fireEvent.pointerDown(window);
    expect(requestIdleCallback).toHaveBeenCalledOnce();
  });
});
