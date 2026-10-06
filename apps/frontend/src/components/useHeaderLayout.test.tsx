import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { headerLayoutQueries, useHeaderLayout } from './useHeaderLayout';

// Issue #800: the header needs about 850px signed out but about 1,260px for an
// administrator, so the point where it collapses depends on the account's links.

type Listener = () => void;

function stubViewport(widthInRem: number) {
  const listeners = new Set<Listener>();
  let width = widthInRem;
  const matches = (query: string) => {
    const limit = Number(/max-width:\s*([\d.]+)rem/.exec(query)?.[1]);
    return width <= limit;
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      get matches() {
        return matches(query);
      },
      media: query,
      addEventListener: (_: string, listener: Listener) => listeners.add(listener),
      removeEventListener: (_: string, listener: Listener) => listeners.delete(listener),
    })),
  );
  return {
    resize(nextWidthInRem: number) {
      width = nextWidthInRem;
      act(() => listeners.forEach((listener) => listener()));
    },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('useHeaderLayout', () => {
  it.each([
    [40, 'menu'],
    [56.25, 'menu'],
    [60, 'compact'],
    [68, 'compact'],
    [72, 'full'],
  ] as const)('signed out at %srem uses the %s layout', (width, layout) => {
    stubViewport(width);
    expect(renderHook(() => useHeaderLayout(false)).result.current).toBe(layout);
  });

  it.each([
    [56.25, 'menu'],
    [64, 'menu'],
    [69.9375, 'menu'],
    [72, 'compact'],
    [79.9375, 'compact'],
    [80, 'full'],
  ] as const)('with workspace links at %srem uses the %s layout', (width, layout) => {
    stubViewport(width);
    expect(renderHook(() => useHeaderLayout(true)).result.current).toBe(layout);
  });

  it('follows the viewport as it is resized', () => {
    const viewport = stubViewport(90);
    const { result } = renderHook(() => useHeaderLayout(true));
    expect(result.current).toBe('full');

    viewport.resize(64);
    expect(result.current).toBe('menu');
  });

  it('uses the full layout where media queries are unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(renderHook(() => useHeaderLayout(true)).result.current).toBe('full');
  });

  it('expresses every breakpoint in rem so browser text size moves it', () => {
    for (const query of Object.values(headerLayoutQueries).flatMap(Object.values)) {
      expect(query).toMatch(/^\(max-width: [\d.]+rem\)$/);
    }
  });
});
