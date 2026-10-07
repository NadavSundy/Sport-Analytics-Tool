import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { CollectionResponse } from '../../api/public-read';
import { RelatedCollection } from './RelatedCollection';

interface Player {
  id: string;
  name: string;
}

// Three cursor-paginated slices, mirroring the fixture Players reproduction in #869.
const pages: Record<string, CollectionResponse<Player>> = {
  first: {
    data: [
      { id: 'p1', name: 'A Symonds' },
      { id: 'p2', name: 'B Lee' },
    ],
    pagination: { nextCursor: 'cursor-2' },
  },
  'cursor-2': {
    data: [
      { id: 'p3', name: 'HJH Marshall' },
      { id: 'p4', name: 'J Oram' },
    ],
    pagination: { nextCursor: 'cursor-3' },
  },
  'cursor-3': {
    data: [{ id: 'p5', name: 'S Bond' }],
    pagination: { nextCursor: null },
  },
};

function createLoad() {
  return vi.fn((search: string) => {
    const cursor = new URLSearchParams(search).get('cursor') ?? 'first';
    const page = pages[cursor];
    return page ? Promise.resolve(page) : Promise.reject(new Error(`Unknown cursor ${cursor}`));
  });
}

function renderCollection(
  load: ReturnType<typeof createLoad>,
  filters = new URLSearchParams({ fixtureId: 'fixture-8937' }),
) {
  return render(
    <RelatedCollection<Player>
      emptyMessage="No published players are available for this match."
      filters={filters}
      load={load}
      renderRecords={(players) => (
        <ul aria-label="Players">
          {players.map((player) => (
            <li key={player.id}>{player.name}</li>
          ))}
        </ul>
      )}
      resourceLabel="players"
      title="Participating players"
    />,
  );
}

async function visibleNames(): Promise<string[]> {
  const list = await screen.findByRole('list', { name: 'Players' });
  return within(list)
    .getAllByRole('listitem')
    .map((item) => item.textContent ?? '');
}

describe('RelatedCollection pagination', () => {
  it('moves forward and back through cursor pages without skipping or duplicating records', async () => {
    const load = createLoad();
    renderCollection(load);

    expect(await visibleNames()).toEqual(['A Symonds', 'B Lee']);
    const previous = screen.getByRole('button', { name: 'Previous players page' });
    expect(previous).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next players page' })).toBeEnabled();
    expect(screen.getByText('Page 1')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Next players page' }));
    expect(await screen.findByText('HJH Marshall')).toBeVisible();
    expect(await visibleNames()).toEqual(['HJH Marshall', 'J Oram']);
    expect(screen.getByText('Page 2')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Previous players page' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Previous players page' }));
    expect(await screen.findByText('A Symonds')).toBeVisible();
    expect(await visibleNames()).toEqual(['A Symonds', 'B Lee']);
    expect(screen.getByText('Page 1')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Previous players page' })).toBeDisabled();

    // The first page is requested without a cursor both times; the scope is never dropped.
    const searches = load.mock.calls.map(([search]) => new URLSearchParams(search));
    expect(searches.map((search) => search.get('cursor'))).toEqual([null, 'cursor-2', null]);
    for (const search of searches) {
      expect(search.get('fixtureId')).toBe('fixture-8937');
      expect(search.get('limit')).toBe('10');
    }
  });

  it('returns from the final page to the exact preceding slice', async () => {
    const load = createLoad();
    renderCollection(load);

    await screen.findByText('A Symonds');
    fireEvent.click(screen.getByRole('button', { name: 'Next players page' }));
    await screen.findByText('HJH Marshall');
    fireEvent.click(screen.getByRole('button', { name: 'Next players page' }));

    expect(await visibleNames()).toEqual(['S Bond']);
    expect(screen.getByText('Page 3')).toBeVisible();
    expect(screen.getByText('End of published results')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Next players page' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Previous players page' }));
    expect(await screen.findByText('HJH Marshall')).toBeVisible();
    expect(await visibleNames()).toEqual(['HJH Marshall', 'J Oram']);
    expect(screen.getByText('Page 2')).toBeVisible();
    expect(load.mock.calls.at(-1)?.[0]).toContain('cursor=cursor-2');
  });

  it('exposes native, keyboard-operable pagination buttons inside a labelled navigation region', async () => {
    renderCollection(createLoad());

    await screen.findByText('A Symonds');
    const navigation = screen.getByRole('navigation', { name: 'Participating players pagination' });
    const buttons = within(navigation).getAllByRole('button');
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Previous players page',
      'Next players page',
    ]);
    for (const button of buttons) {
      expect(button.tagName).toBe('BUTTON');
      expect(button).toHaveAttribute('type', 'button');
    }
  });

  it('restarts at the first page when the related scope changes', async () => {
    const load = createLoad();
    const { rerender } = renderCollection(load);

    await screen.findByText('A Symonds');
    fireEvent.click(screen.getByRole('button', { name: 'Next players page' }));
    await screen.findByText('HJH Marshall');

    rerender(
      <RelatedCollection<Player>
        emptyMessage="No published players are available for this match."
        filters={new URLSearchParams({ fixtureId: 'fixture-1' })}
        load={load}
        renderRecords={(players) => (
          <ul aria-label="Players">
            {players.map((player) => (
              <li key={player.id}>{player.name}</li>
            ))}
          </ul>
        )}
        resourceLabel="players"
        title="Participating players"
      />,
    );

    expect(await screen.findByText('A Symonds')).toBeVisible();
    expect(screen.getByText('Page 1')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Previous players page' })).toBeDisabled();
    const lastSearch = new URLSearchParams(load.mock.calls.at(-1)?.[0]);
    expect(lastSearch.get('fixtureId')).toBe('fixture-1');
    expect(lastSearch.has('cursor')).toBe(false);
  });

  it('keeps a single-page collection free of pagination controls', async () => {
    const load = vi.fn(() =>
      Promise.resolve<CollectionResponse<Player>>({
        data: [{ id: 'p1', name: 'A Symonds' }],
        pagination: { nextCursor: null },
      }),
    );
    renderCollection(load);

    await screen.findByText('A Symonds');
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.getByText('End of published results')).toBeVisible();
  });
});
