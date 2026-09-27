import { StrictMode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { usePublicData } from './usePublicData';

function Probe({
  load,
  requestKey,
}: {
  load: (signal: AbortSignal) => Promise<string>;
  requestKey: string;
}) {
  const state = usePublicData(load, requestKey);

  if (state.status === 'ready') {
    return <output>{state.data}</output>;
  }

  return <output>{state.status}</output>;
}

describe('usePublicData', () => {
  it('shares the initial request across a StrictMode effect remount', async () => {
    let resolve!: (value: string) => void;
    const load = vi.fn(
      () =>
        new Promise<string>((complete) => {
          resolve = complete;
        }),
    );

    render(
      <StrictMode>
        <Probe load={load} requestKey="fixture-weather-495" />
      </StrictMode>,
    );

    expect(load).toHaveBeenCalledTimes(1);
    resolve('weather available');

    expect(await screen.findByText('weather available')).toBeVisible();
  });

  it('does not let a stale request replace data from a newer request', async () => {
    let resolveFirst!: (value: string) => void;
    let resolveSecond!: (value: string) => void;
    const firstLoad = vi.fn(
      () =>
        new Promise<string>((complete) => {
          resolveFirst = complete;
        }),
    );
    const secondLoad = vi.fn(
      () =>
        new Promise<string>((complete) => {
          resolveSecond = complete;
        }),
    );

    const view = render(<Probe load={firstLoad} requestKey="fixture-weather-495" />);
    view.rerender(<Probe load={secondLoad} requestKey="fixture-weather-495" />);

    resolveSecond('fresh weather');
    expect(await screen.findByText('fresh weather')).toBeVisible();

    resolveFirst('stale weather');
    expect(screen.queryByText('stale weather')).not.toBeInTheDocument();
  });
});
