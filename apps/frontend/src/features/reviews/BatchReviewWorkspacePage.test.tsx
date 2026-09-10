import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
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

function report(blocked = true) {
  const item = {
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
          ? ['Validation errors remain.', 'Ambiguous references remain.']
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

  test('shows the global awaiting-review queue to an administrator', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation((input: RequestInfo | URL) =>
        Promise.resolve(
          response(
            String(input).includes('/auth/me')
              ? profile
              : { data: [report().data.batch], pagination: { nextCursor: null } },
          ),
        ),
      );
    vi.stubGlobal('fetch', fetchMock);
    renderPage('/reviews/batches');
    expect(await screen.findByRole('heading', { name: 'Batch review queue' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'season.csv' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('status=awaiting_review'),
      expect.anything(),
    );
    expect(screen.getByText('Showing all awaiting-review batches.')).toBeInTheDocument();
  });

  test('shows assigned competition-scope messaging to a reviewer alias', async () => {
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
      await screen.findByText(
        'Showing awaiting-review batches within your assigned competition scopes.',
      ),
    ).toBeInTheDocument();
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
});
