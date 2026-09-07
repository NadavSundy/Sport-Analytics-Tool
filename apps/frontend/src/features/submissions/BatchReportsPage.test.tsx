import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import type { BatchReportItem, BatchReportResponse } from '@sport-analytics/contracts';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { PublicApp } from '../../App';
import { AuthProvider } from '../auth/AuthProvider';

type AuthClient = ComponentProps<typeof AuthProvider>['client'];
type AuthStateListener = (event: AuthChangeEvent, session: Session | null) => void;

const reference = '123e4567-e89b-42d3-a456-426614174000';

function session(): Session {
  const user = {
    id: 'submitter-user',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'submitter@example.com',
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: '2026-09-07T00:00:00.000Z',
  } satisfies User;
  return {
    access_token: 'batch-access-token',
    refresh_token: 'managed',
    expires_in: 3600,
    token_type: 'bearer',
    user,
  };
}

function authClient() {
  return {
    getSession: vi.fn().mockResolvedValue({ data: { session: session() } }),
    onAuthStateChange: vi.fn((listener: AuthStateListener) => ({
      data: {
        subscription: { id: 'batch-reports-test', callback: listener, unsubscribe: vi.fn() },
      },
    })),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
  } as unknown as AuthClient;
}

function apiResponse(body: unknown): Response {
  return { ok: true, status: 200, json: vi.fn().mockResolvedValue(body) } as unknown as Response;
}

function profile(role: 'submitter' | 'admin' = 'submitter', competitionIds = ['5']) {
  return {
    user: {
      id: '1',
      subject: 'submitter-user',
      displayName: 'Batch Reviewer',
      role,
      approvalState: 'approved',
      requestedCompetition: null,
      competitionIds,
    },
  };
}

function reportFetch(body: ReturnType<typeof report>, user = profile()) {
  return vi
    .fn()
    .mockImplementation((input: RequestInfo | URL) =>
      Promise.resolve(apiResponse(String(input).includes('/auth/me') ? user : body)),
    );
}

function report(accepted: number, rejected: number): BatchReportResponse {
  return {
    data: {
      batch: {
        batchReference: reference,
        competitionId: '5',
        status:
          accepted > 0 && rejected > 0
            ? 'partially_published'
            : rejected > 0
              ? 'rejected'
              : 'published',
        statusUrl: `/api/v1/batches/${reference}`,
        receivedAt: '2026-09-07T10:00:00.000Z',
        updatedAt: '2026-09-07T10:05:00.000Z',
        progress: { total: 3, processed: 3, accepted, rejected },
        counts: { accepted, rejected, unresolved: rejected, duplicate: 0, conflicting: 0 },
        review: null,
      },
      errorGroups: rejected > 0 ? [{ ruleCode: 'EVENT_SCHEMA_INVALID', count: rejected }] : [],
      items: [] as BatchReportItem[],
      pagination: { nextCursor: null },
      downloadUrl: `/api/v1/batches/${reference}/report/download`,
    },
  };
}

function renderReport() {
  return render(
    <AuthProvider client={authClient()}>
      <MemoryRouter initialEntries={[`/submissions/batches/${reference}`]}>
        <PublicApp />
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('batch report view', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test.each([
    ['all-accepted', 3, 0, 'Published'],
    ['partially rejected', 2, 1, 'Partially published — partial success'],
    ['fully rejected', 0, 3, 'Rejected'],
  ])('shows a clear %s batch summary', async (_case, accepted, rejected, state) => {
    vi.stubGlobal('fetch', reportFetch(report(accepted, rejected)));
    renderReport();
    const summary = (await screen.findByRole('heading', { name: 'Batch summary' })).parentElement!;
    expect(summary).toHaveTextContent(state);
    expect(summary).toHaveTextContent(`Accepted${accepted}`);
    expect(summary).toHaveTextContent(`Rejected${rejected}`);
    expect(screen.getByRole('button', { name: 'Download JSON report' })).toBeInTheDocument();
  });

  test('shows actionable item faults with source and accepted-record traceability', async () => {
    const body = report(1, 1);
    body.data.batch.progress.total = 2;
    body.data.batch.counts.unresolved = 1;
    body.data.items = [
      {
        ordinal: 0,
        outcome: 'accepted',
        location: {
          filePath: 'events.csv',
          sheetName: null,
          rowNumber: 2,
          jsonPath: null,
          ordinal: 0,
        },
        context: {
          eventReference: 'event-1',
          inningsId: '8',
          overNumber: 4,
          positionInOver: 2,
          description: 'Event event-1 at over 4, delivery 2.',
        },
        stagedRecordId: '41',
        acceptedRecordId: '91',
        errors: [],
      },
      {
        ordinal: 1,
        outcome: 'unresolved',
        location: {
          filePath: 'events.csv',
          sheetName: null,
          rowNumber: 3,
          jsonPath: 'striker',
          ordinal: 1,
        },
        context: {
          eventReference: 'event-2',
          inningsId: null,
          overNumber: 4,
          positionInOver: 3,
          description: 'Event event-2 at over 4, delivery 3.',
        },
        stagedRecordId: '42',
        acceptedRecordId: null,
        errors: [
          {
            ruleCode: 'REFERENCE_RESOLUTION_FAILED',
            message: 'Choose a known striker reference.',
            location: {
              filePath: 'events.csv',
              sheetName: null,
              rowNumber: 3,
              jsonPath: 'striker',
              ordinal: 1,
            },
            context: {
              eventReference: 'event-2',
              inningsId: null,
              overNumber: 4,
              positionInOver: 3,
              description: 'Event event-2 at over 4, delivery 3.',
            },
          },
        ],
      },
    ];
    vi.stubGlobal('fetch', reportFetch(body));
    renderReport();
    expect(await screen.findByText(/Accepted delivery: 91/)).toBeInTheDocument();
    expect(screen.getByText(/Source: events.csv, row 3, striker/)).toBeInTheDocument();
    expect(screen.getByText(/Choose a known striker reference/)).toBeInTheDocument();
  });

  test('lets an in-scope administrator approve and displays the persisted decision', async () => {
    const awaiting = report(3, 0);
    awaiting.data.batch.status = 'awaiting_review';
    const published = report(3, 0);
    published.data.batch.review = {
      decision: 'approved',
      actor: { accountId: '1', displayName: 'Batch Reviewer' },
      decidedAt: '2026-09-07T11:00:00.000Z',
      reason: 'Validated source and references.',
    };
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('/auth/me')) return Promise.resolve(apiResponse(profile('admin')));
      if (init?.method === 'POST')
        return Promise.resolve(apiResponse({ data: published.data.batch }));
      const reportGets = fetchMock.mock.calls.filter(
        ([calledInput, calledInit]) =>
          String(calledInput).includes('/report') && calledInit?.method !== 'POST',
      ).length;
      return Promise.resolve(apiResponse(reportGets > 1 ? published : awaiting));
    });
    vi.stubGlobal('fetch', fetchMock);
    renderReport();

    fireEvent.change(await screen.findByLabelText('Reason'), {
      target: { value: 'Validated source and references.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Approve and publish' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(`/batches/${reference}/review`),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            decision: 'approved',
            reason: 'Validated source and references.',
          }),
        }),
      ),
    );
    expect(await screen.findByText(/Review: approved by Batch Reviewer/)).toBeInTheDocument();
  });

  test('shows all decisions only to administrators in the batch competition scope', async () => {
    const awaiting = report(3, 0);
    awaiting.data.batch.status = 'awaiting_review';
    vi.stubGlobal('fetch', reportFetch(awaiting, profile('admin', ['6'])));
    renderReport();
    expect(await screen.findByText(/outside your authorised scope/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve and publish' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject batch' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Return for correction' })).not.toBeInTheDocument();
  });

  test('requires a reviewer reason before sending a decision', async () => {
    const awaiting = report(3, 0);
    awaiting.data.batch.status = 'awaiting_review';
    const fetchMock = reportFetch(awaiting, profile('admin'));
    vi.stubGlobal('fetch', fetchMock);
    renderReport();
    fireEvent.click(await screen.findByRole('button', { name: 'Reject batch' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a reason');
    expect(
      fetchMock.mock.calls.some(([, init]) => (init as RequestInit | undefined)?.method === 'POST'),
    ).toBe(false);
  });
});
