import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import type { BatchReportResponse } from '@sport-analytics/contracts';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { PublicApp } from '../../App';
import { AuthProvider } from '../auth/AuthProvider';

type AuthClient = ComponentProps<typeof AuthProvider>['client'];
const reference = '123e4567-e89b-42d3-a456-426614174000';

function authClient() {
  const user = {
    id: 'reviewer',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'reviewer@example.com',
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: '2026-09-08T00:00:00.000Z',
  } satisfies User;
  const session = {
    access_token: 'review-token',
    refresh_token: 'managed',
    expires_in: 3600,
    token_type: 'bearer',
    user,
  } satisfies Session;
  return {
    getSession: vi.fn().mockResolvedValue({ data: { session } }),
    onAuthStateChange: vi.fn(
      (listener: (event: AuthChangeEvent, session: Session | null) => void) => ({
        data: { subscription: { id: 'review', callback: listener, unsubscribe: vi.fn() } },
      }),
    ),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
  } as unknown as AuthClient;
}

const profile = {
  user: {
    id: '9',
    subject: 'reviewer',
    displayName: 'A Reviewer',
    role: 'admin',
    approvalState: 'approved',
    requestedCompetition: null,
    competitionIds: ['5'],
  },
};

function report(blocked = true): BatchReportResponse {
  const item: BatchReportResponse['data']['items'][number] = {
    ordinal: 1,
    outcome: blocked ? 'unresolved' : 'accepted',
    location: {
      filePath: 'season.csv',
      sheetName: null,
      rowNumber: 3,
      jsonPath: 'fixture',
      ordinal: 1,
    },
    context: {
      eventReference: 'event-1',
      fixtureId: null,
      fixtureLabel: null,
      inningsId: null,
      overNumber: 2,
      positionInOver: 1,
      description: 'Event event-1 at over 2, delivery 1.',
    },
    stagedRecordId: '41',
    acceptedRecordId: blocked ? null : '91',
    operation: blocked ? 'upsert' : 'correction',
    correctionTarget: blocked
      ? null
      : {
          sourceEventId: 'cricsheet:delivery:100-original',
          resolvedDeliveryId: '88',
        },
    referenceResolutions: blocked
      ? [
          {
            referencePath: 'fixture',
            entityType: 'fixture',
            state: 'ambiguous',
            submittedReference: 'Wits final',
            reason: 'Two fixtures match.',
            requiredAction: 'select_candidate',
            candidates: [
              {
                candidateReference: '688a0bf0-e168-4b67-bf6f-f5857dbb1f87',
                label: 'Lions vs Bears · 2026-09-01',
              },
            ],
          },
        ]
      : [],
    errors: blocked
      ? [
          {
            ruleCode: 'REFERENCE_AMBIGUOUS',
            message: 'Choose the intended fixture.',
            location: {
              filePath: 'season.csv',
              sheetName: null,
              rowNumber: 3,
              jsonPath: 'fixture',
              ordinal: 1,
            },
            context: {
              eventReference: 'event-1',
              fixtureId: null,
              fixtureLabel: null,
              inningsId: null,
              overNumber: 2,
              positionInOver: 1,
              description: 'Event event-1 at over 2, delivery 1.',
            },
          },
        ]
      : [],
  };
  return {
    data: {
      batch: {
        batchReference: reference,
        competitionId: '5',
        status: 'awaiting_review',
        statusUrl: `/api/v1/batches/${reference}`,
        receivedAt: '2026-09-08T08:00:00.000Z',
        updatedAt: '2026-09-08T08:05:00.000Z',
        source: {
          fileName: 'season.csv',
          checksum: 'a'.repeat(64),
          packageVersion: '1.0',
          submitter: { accountId: '7', displayName: 'Data Submitter' },
        },
        progress: {
          total: 20000,
          processed: 20000,
          accepted: blocked ? 19999 : 20000,
          rejected: blocked ? 1 : 0,
        },
        counts: {
          accepted: blocked ? 19999 : 20000,
          rejected: blocked ? 1 : 0,
          unresolved: blocked ? 1 : 0,
          duplicate: 0,
          conflicting: 0,
        },
        lineage: { replacesBatchReference: null, supersededByBatchReference: null },
        review: null,
      },
      errorGroups: blocked ? [{ ruleCode: 'REFERENCE_AMBIGUOUS', count: 1 }] : [],
      reviewSummary: {
        validation: {
          accepted: blocked ? 19999 : 20000,
          rejected: blocked ? 1 : 0,
          blockingErrors: blocked ? 1 : 0,
          duplicate: 0,
          conflicting: 0,
        },
        resolution: {
          resolved: blocked ? 19999 : 20000,
          ambiguous: blocked ? 1 : 0,
          unresolved: 0,
          invalid: 0,
          proposed: blocked ? 1 : 0,
        },
        approvalBlocked: blocked,
        blockingReasons: blocked
          ? ['Blocking validation errors remain.', 'Ambiguous references remain.']
          : [],
      },
      fixtureSummaries: [
        {
          fixtureId: '22',
          label: 'Lions vs Bears · 2026-09-01',
          total: 20000,
          accepted: blocked ? 19999 : 20000,
          rejected: blocked ? 1 : 0,
          unresolved: blocked ? 1 : 0,
        },
      ],
      acceptedSamples: blocked ? [] : [item],
      items: [item],
      pagination: { nextCursor: 'bounded-next-page' },
      downloadUrl: `/api/v1/batches/${reference}/report/download`,
    },
  };
}

function publishableMixedReport() {
  const body = report(false);
  const rejected = report(true);
  body.data.batch.progress.accepted = 19999;
  body.data.batch.progress.rejected = 1;
  body.data.batch.counts.accepted = 19999;
  body.data.batch.counts.rejected = 1;
  body.data.errorGroups = [{ ruleCode: 'EVENT_SCHEMA_INVALID', count: 1 }];
  body.data.reviewSummary.validation.accepted = 19999;
  body.data.reviewSummary.validation.rejected = 1;
  body.data.fixtureSummaries[0]!.accepted = 19999;
  body.data.fixtureSummaries[0]!.rejected = 1;
  body.data.items = rejected.data.items;
  return body;
}

function response(body: unknown, status = 200) {
  return { ok: status < 400, status, json: vi.fn().mockResolvedValue(body) } as unknown as Response;
}
function renderPage(path: string) {
  return render(
    <AuthProvider client={authClient()}>
      <MemoryRouter initialEntries={[path]}>
        <PublicApp />
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('reviewer batch workspace', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test('creates only a valid unresolved fixture proposal and refreshes the report', async () => {
    const body = report(true);
    body.data.batch.source.packageVersion = '1.1';
    body.data.items[0]!.referenceResolutions = [
      {
        referencePath: 'fixtures.0',
        entityType: 'fixture',
        state: 'unresolved',
        submittedReference: {
          sourceId: 'cricsheet:fixture:new-1',
          season: { context: { name: '2026' } },
          context: {
            date: '2026-01-01',
            teams: [{ context: { name: 'Wits' } }, { context: { name: 'UCT' } }],
          },
          proposal: {
            endDate: '2026-01-01',
            matchType: 'T20',
            teamType: 'university',
            gender: 'mixed',
            ballsPerOver: 6,
            outcome: 'tie',
            sourceVersion: '1.1',
            sourceRevision: 1,
          },
        },
        reason: 'New fixture.',
        requiredAction: 'contact_reviewer',
        candidates: [],
      },
    ];
    const fetchMock = vi
      .fn()
      .mockImplementation((input: RequestInfo | URL, _init?: RequestInit) => {
        const url = String(input);
        if (url.includes('/auth/me')) return Promise.resolve(response(profile));
        if (url.includes('/canonical-fixtures'))
          return Promise.resolve(
            response(
              {
                data: {
                  batchReference: reference,
                  decisionReference: '688a0bf0-e168-4b67-bf6f-f5857dbb1f87',
                  status: 'queued',
                  statusUrl: `/api/v1/batches/${reference}`,
                  submittedAt: '2026-09-11T12:00:00.000Z',
                },
              },
              202,
            ),
          );
        return Promise.resolve(response(body));
      });
    vi.stubGlobal('fetch', fetchMock);
    renderPage(`/reviews/batches/${reference}`);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Create canonical fixture from proposal' }),
    );
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([url]) => String(url).includes('/canonical-fixtures')),
      ).toBe(true),
    );
    expect(screen.queryByText('Create canonical fixture from proposal')).toBeInTheDocument();
  });

  test('does not offer creation for an unresolved fixture without a proposal', async () => {
    const body = report(true);
    body.data.items[0]!.referenceResolutions = [
      {
        referencePath: 'fixtures.0',
        entityType: 'fixture',
        state: 'unresolved',
        submittedReference: { sourceId: 'cricsheet:fixture:legacy' },
        reason: 'New fixture.',
        requiredAction: 'contact_reviewer',
        candidates: [],
      },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) =>
        Promise.resolve(response(String(input).includes('/auth/me') ? profile : body)),
      ),
    );
    renderPage(`/reviews/batches/${reference}`);
    await screen.findByText(/New fixture\./);
    expect(
      screen.queryByRole('button', { name: 'Create canonical fixture from proposal' }),
    ).not.toBeInTheDocument();
  });

  test('does not offer creation for a legacy or malformed fixture proposal', async () => {
    const body = report(true);
    body.data.items[0]!.referenceResolutions = [
      {
        referencePath: 'fixtures.0',
        entityType: 'fixture',
        state: 'unresolved',
        submittedReference: {
          sourceId: 'cricsheet:fixture:legacy',
          proposal: { sourceVersion: '1.1' },
        },
        reason: 'New fixture.',
        requiredAction: 'contact_reviewer',
        candidates: [],
      },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) =>
        Promise.resolve(response(String(input).includes('/auth/me') ? profile : body)),
      ),
    );
    renderPage(`/reviews/batches/${reference}`);
    await screen.findByText(/New fixture\./);
    expect(
      screen.queryByRole('button', { name: 'Create canonical fixture from proposal' }),
    ).not.toBeInTheDocument();
  });

  test('shows pending review and complete global batch history to an administrator', async () => {
    const pending = report().data.batch;
    const published = {
      ...pending,
      batchReference: '223e4567-e89b-42d3-a456-426614174000',
      status: 'published' as const,
      source: { ...pending.source, fileName: 'published-season.csv' },
    };
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/auth/me')) return Promise.resolve(response(profile));
      if (url.includes('/admin/batches?status=awaiting_review')) {
        return Promise.resolve(response({ data: [pending], pagination: { nextCursor: null } }));
      }
      if (url.includes('/admin/batches')) {
        return Promise.resolve(
          response({ data: [pending, published], pagination: { nextCursor: null } }),
        );
      }
      return Promise.resolve(response({}, 404));
    });
    vi.stubGlobal('fetch', fetchMock);
    renderPage('/reviews/batches');

    expect(await screen.findByRole('heading', { name: 'Batch management' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Needs review' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'All batches' })).toBeInTheDocument();
    expect(await screen.findAllByRole('link', { name: 'season.csv' })).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'published-season.csv' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/admin/batches?status=awaiting_review'),
      expect.anything(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/admin/batches'),
      expect.anything(),
    );
  });

  test('blocks submitters from the reviewer queue', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation((input: RequestInfo | URL) =>
        Promise.resolve(
          response(
            String(input).includes('/auth/me')
              ? { user: { ...profile.user, role: 'submitter' } }
              : { data: [report().data.batch], pagination: { nextCursor: null } },
          ),
        ),
      );

    vi.stubGlobal('fetch', fetchMock);
    renderPage('/reviews/batches');

    expect(
      await screen.findByRole('heading', { name: 'Administrator access required' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Batch review decisions are available only to administrators.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'season.csv' })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/admin/batches'))).toBe(
      false,
    );
  });

  test('does not expose review decision controls to a submitter on a direct batch URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation((input: RequestInfo | URL) =>
          Promise.resolve(
            response(
              String(input).includes('/auth/me')
                ? { user: { ...profile.user, role: 'submitter' } }
                : report(false),
            ),
          ),
        ),
    );

    renderPage(`/reviews/batches/${reference}`);

    expect(
      await screen.findByRole('heading', { name: 'Administrator access required' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve and publish' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject batch' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Return for correction' })).not.toBeInTheDocument();
  });

  test('shows provenance, summaries, grouped details, bounded samples and blocks unsafe approval', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation((input: RequestInfo | URL) =>
          Promise.resolve(response(String(input).includes('/auth/me') ? profile : report(true))),
        ),
    );
    renderPage(`/reviews/batches/${reference}`);
    expect(await screen.findByText('Data Submitter')).toBeInTheDocument();
    expect(screen.getByText('a'.repeat(64))).toBeInTheDocument();
    expect(screen.getAllByText('Lions vs Bears · 2026-09-01')).toHaveLength(2);
    const group = screen.getByText('REFERENCE_AMBIGUOUS').closest('details')!;
    expect(group).toBeInTheDocument();
    fireEvent.click(within(group).getByText(/1 rejection/));
    expect(within(group).getByText(/Choose the intended fixture/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve and publish' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Use Lions vs Bears · 2026-09-01' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load more report results' })).toBeInTheDocument();
  });

  test('allows approval of a mixed batch and explains that rejected records stay unpublished', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation((input: RequestInfo | URL) =>
          Promise.resolve(
            response(String(input).includes('/auth/me') ? profile : publishableMixedReport()),
          ),
        ),
    );
    renderPage(`/reviews/batches/${reference}`);

    expect(await screen.findByText('Only the accepted subset will publish')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Approving publishes 19999 accepted records. The 1 rejected record remains unpublished and retained in this report.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve and publish' })).toBeEnabled();
  });

  test('requires a meaningful reason and explicit confirmation before a decision', async () => {
    const body = report(false);
    const fetchMock = vi
      .fn()
      .mockImplementation((input: RequestInfo | URL, init?: RequestInit) =>
        Promise.resolve(
          response(
            String(input).includes('/auth/me')
              ? profile
              : init?.method === 'POST'
                ? { data: body.data.batch }
                : body,
          ),
        ),
      );
    vi.stubGlobal('fetch', fetchMock);
    renderPage(`/reviews/batches/${reference}`);
    const reject = await screen.findByRole('button', { name: 'Reject batch' });
    expect(screen.getByText('cricsheet:delivery:100-original')).toBeInTheDocument();
    expect(screen.getByText(/published delivery 88/)).toBeInTheDocument();
    fireEvent.click(reject);
    expect(screen.getByText(/Explain the rejection or correction/)).toHaveTextContent(
      'at least 10 characters',
    );
    fireEvent.change(screen.getByLabelText(/Reason/), {
      target: { value: 'The source fixture is incorrect.' },
    });
    fireEvent.click(reject);
    const dialog = screen.getByRole('dialog', { name: /Confirm reject batch/ });
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm reject batch' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/review'),
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });

  test('lets reviewers navigate both directions of a correction chain', async () => {
    const body = report(false);
    body.data.batch.status = 'superseded';
    body.data.batch.lineage = {
      replacesBatchReference: '223e4567-e89b-42d3-a456-426614174000',
      supersededByBatchReference: '323e4567-e89b-42d3-a456-426614174000',
    };
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation((input: RequestInfo | URL) =>
          Promise.resolve(response(String(input).includes('/auth/me') ? profile : body)),
        ),
    );
    renderPage(`/reviews/batches/${reference}`);
    expect(
      await screen.findByRole('link', { name: body.data.batch.lineage.replacesBatchReference! }),
    ).toHaveAttribute('href', '/reviews/batches/223e4567-e89b-42d3-a456-426614174000');
    expect(
      screen.getByRole('link', { name: body.data.batch.lineage.supersededByBatchReference! }),
    ).toHaveAttribute('href', '/reviews/batches/323e4567-e89b-42d3-a456-426614174000');
  });
});
