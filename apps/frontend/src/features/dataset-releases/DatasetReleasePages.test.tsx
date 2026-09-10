import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DatasetReleaseCataloguePage, DatasetReleaseDetailPage } from './DatasetReleasePages';

const release = {
  releaseId: '01234567-89ab-cdef-0123-456789abcdef',
  version: '2026.09.1',
  createdAt: '2026-09-09T10:00:00.000Z',
  formatVersion: '1.0',
  scope: 'published-accepted-deliveries',
  eventCount: 1234,
  checksum: 'a'.repeat(64),
  fields: [
    { name: 'eventId', description: 'Stable identifier of the accepted delivery revision.' },
    { name: 'fixtureId', description: 'Fixture containing the delivery.' },
  ],
};

function response(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/dataset-releases" element={<DatasetReleaseCataloguePage />} />
        <Route path="/dataset-releases/:version" element={<DatasetReleaseDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('dataset release pages', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('lists available releases with useful scope and creation metadata', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, { data: [release] })));

    renderRoute('/dataset-releases');

    expect(await screen.findByRole('heading', { name: 'Available releases' })).toBeInTheDocument();
    const releaseLink = screen.getByRole('link', { name: 'Dataset 2026.09.1' });
    expect(releaseLink).toHaveAttribute('href', '/dataset-releases/2026.09.1');
    expect(screen.getByText('Published accepted deliveries')).toBeInTheDocument();
    expect(screen.getByText('1 234')).toBeInTheDocument();
    expect(screen.getByText(/9 September 2026/)).toBeInTheDocument();
  });

  it('shows schema, checksum, and the exact artefact download', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200, { data: release }));
    vi.stubGlobal('fetch', fetchMock);

    renderRoute('/dataset-releases/2026.09.1');

    expect(await screen.findByRole('heading', { name: 'Dataset 2026.09.1' })).toBeInTheDocument();
    expect(screen.getByText('a'.repeat(64))).toBeInTheDocument();
    const schema = screen.getByRole('heading', { name: 'Schema and fields' }).parentElement!;
    expect(within(schema).getByText('eventId')).toBeInTheDocument();
    expect(
      within(schema).getByText('Stable identifier of the accepted delivery revision.'),
    ).toBeInTheDocument();

    const download = screen.getByRole('link', { name: 'Download JSON artefact' });
    expect(download).toHaveAttribute(
      'href',
      'http://localhost:3000/api/v1/dataset-releases/2026.09.1/artifact.json',
    );
    expect(download).toHaveAttribute('download', 'dataset-release-2026.09.1.json');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/dataset-releases/2026.09.1',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
  });

  it('presents an unavailable release clearly and supports retry', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response(404, { error: { code: 'NOT_FOUND', message: 'Dataset release not found.' } }),
      )
      .mockResolvedValueOnce(response(200, { data: release }));
    vi.stubGlobal('fetch', fetchMock);

    renderRoute('/dataset-releases/missing');

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Dataset release not found.')).toBeInTheDocument();
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { name: 'Dataset 2026.09.1' })).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
