import { DATASET_RELEASE_FIELDS } from '@sport-analytics/contracts';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DatasetReleaseCataloguePage, DatasetReleaseDetailPage } from './DatasetReleasePages';

const testApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

const release = {
  releaseId: 'ba756ad4-4b1e-4b80-81f2-09a66ed6c854',
  version: '2026.09.14v1',
  createdAt: '2026-09-14T10:18:37.161Z',
  snapshotId: '1e3af729-8ced-4f49-ae61-7f0d74eab8f8',
  snapshotAsOf: '2026-09-14T10:18:36.000Z',
  formatVersion: '1.0',
  scope: 'published-accepted-deliveries',
  eventCount: 3207110,
  checksum: '46af530f0320361aec114769cb54cefd6bf4acd3fc8610c1567c3b7656d1fe25',
  fields: [...DATASET_RELEASE_FIELDS],
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
    const releaseLink = screen.getByRole('link', { name: 'Dataset 2026.09.14v1' });
    expect(releaseLink).toHaveAttribute('href', '/dataset-releases/2026.09.14v1');
    expect(screen.getByText('Published accepted deliveries')).toBeInTheDocument();
    expect(screen.getByText('3 207 110')).toBeInTheDocument();
    expect(screen.getByText(/14 September 2026/)).toBeInTheDocument();
  });

  it('renders multiple releases and an empty release catalogue', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response(200, {
          data: [release, { ...release, releaseId: 'second-release', version: '2026.09.13' }],
        }),
      )
      .mockResolvedValueOnce(response(200, { data: [] }));
    vi.stubGlobal('fetch', fetchMock);
    const first = renderRoute('/dataset-releases');
    expect(await screen.findAllByRole('listitem')).toHaveLength(2);
    first.unmount();

    renderRoute('/dataset-releases');
    expect(await screen.findByText('No dataset releases are available')).toBeInTheDocument();
  });

  it('shows schema, checksum, and the exact artefact download', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200, { data: release }));
    vi.stubGlobal('fetch', fetchMock);

    renderRoute('/dataset-releases/2026.09.14v1');

    expect(
      await screen.findByRole('heading', { name: 'Dataset 2026.09.14v1' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Snapshot identity')).toBeInTheDocument();
    expect(screen.getByText(release.snapshotId)).toBeInTheDocument();
    expect(screen.getByText(release.checksum)).toBeInTheDocument();
    const schema = screen.getByRole('heading', { name: 'Schema and fields' }).parentElement!;
    expect(within(schema).getByText('eventId')).toBeInTheDocument();
    expect(
      within(schema).getByText('Stable logical delivery identity retained across corrections.'),
    ).toBeInTheDocument();
    expect(within(schema).getByText('runsNonBoundary')).toBeInTheDocument();
    expect(within(schema).getByText('extras')).toBeInTheDocument();
    expect(within(schema).getByText('wickets')).toBeInTheDocument();

    const download = screen.getByRole('link', { name: 'Download JSON artefact' });
    expect(download).toHaveAttribute(
      'href',
      `${testApiBaseUrl}/dataset-releases/2026.09.14v1/artifact.json`,
    );
    expect(download).toHaveAttribute('download', 'dataset-release-2026.09.14v1.json');
    expect(fetchMock).toHaveBeenCalledWith(
      `${testApiBaseUrl}/dataset-releases/2026.09.14v1`,
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
  });

  it.each([
    ['a malformed release', { data: [{ ...release, checksum: 'not-a-checksum' }] }],
    [
      'malformed field documentation',
      { data: [{ ...release, fields: [{ name: 'eventId', description: '' }] }] },
    ],
  ])('fails safely for %s', async (_label, body) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, body)));
    renderRoute('/dataset-releases');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The public API returned an unexpected response.',
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

    expect(
      await screen.findByRole('heading', { name: 'Dataset 2026.09.14v1' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
