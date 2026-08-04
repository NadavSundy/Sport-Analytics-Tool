import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

describe('App', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows the application heading and successful API state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'ok',
          service: 'sport-analytics-api',
          timestamp: new Date().toISOString(),
        }),
      }),
    );

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Sport Analytics Tool' })).toBeInTheDocument();
    expect(await screen.findByText(/Connected to/i)).toBeInTheDocument();
  });
});
