import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import type { BatchReportItem, BatchReportResponse } from '@sport-analytics/contracts';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

function createDeferredSession() {
  let resolve!: (result: { data: { session: Session | null } }) => void;
  const promise = new Promise<{ data: { session: Session | null } }>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

function authClient(sessionRequest: Promise<{ data: { session: Session | null } }>) {
  return {
    getSession: vi.fn(() => sessionRequest),
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
        status: accepted > 0 ? 'published' : 'rejected',
        statusUrl: `/api/v1/batches/${reference}`,
        receivedAt: '2026-09-07T10:00:00.000Z',
        updatedAt: '2026-09-07T10:05:00.000Z',
        source: {
          fileName: 'season.csv',
          checksum: 'a'.repeat(64),
          packageVersion: '1.0',
          submitter: { accountId: '1', displayName: 'Batch Reviewer' },
        },
        progress: { total: 3, processed: 3, accepted, rejected },
        counts: { accepted, rejected, unresolved: 0, duplicate: 0, conflicting: 0 },
        review: null,
      },
      errorGroups: rejected > 0 ? [{ ruleCode: 'EVENT_SCHEMA_INVALID', count: rejected }] : [],
      reviewSummary: {
        validation: {
          accepted,
          rejected,
          blockingErrors: 0,
          duplicate: 0,
          conflicting: 0,
        },
        resolution: {
          resolved: accepted + rejected,
          ambiguous: 0,
          unresolved: 0,
          invalid: 0,
          proposed: 0,
        },
        approvalBlocked: false,
        blockingReasons: [],
      },
      fixtureSummaries: [],
      acceptedSamples: [],
      items: [] as BatchReportItem[],
      pagination: { nextCursor: null },
      downloadUrl: `/api/v1/batches/${reference}/report/download`,
    },
  };
}

async function renderReport() {
  const deferredSession = createDeferredSession();
  const view = render(
    <AuthProvider client={authClient(deferredSession.promise)}>
      <MemoryRouter initialEntries={[`/submissions/batches/${reference}`]}>
        <PublicApp />
      </MemoryRouter>
    </AuthProvider>,
  );

  expect(screen.getByRole('heading', { name: 'Checking access' })).toBeInTheDocument();

  await act(async () => {
    deferredSession.resolve({ data: { session: session() } });
    await deferredSession.promise;
  });

  expect(screen.queryByRole('heading', { name: 'Checking access' })).not.toBeInTheDocument();
  return view;
}

describe('batch report view', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test.each([
    ['all-accepted', 3, 0, 'Published'],
    ['partially rejected', 2, 1, 'Published — partial success'],
    ['fully rejected', 0, 3, 'Rejected'],
  ])('shows a clear %s batch summary', async (_case, accepted, rejected, state) => {
    vi.stubGlobal('fetch', reportFetch(report(accepted, rejected)));
    await renderReport();
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
          fixtureId: '12',
          fixtureLabel: 'Lions vs Bears · 2026-09-01',
          inningsId: '8',
          overNumber: 4,
          positionInOver: 2,
          description: 'Event event-1 at over 4, delivery 2.',
        },
        stagedRecordId: '41',
        acceptedRecordId: '91',
        operation: 'correction',
        correctionTarget: {
          sourceEventId: 'cricsheet:delivery:100-original',
          resolvedDeliveryId: '88',
        },
        referenceResolutions: [],
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
          fixtureId: '12',
          fixtureLabel: 'Lions vs Bears · 2026-09-01',
          inningsId: null,
          overNumber: 4,
          positionInOver: 3,
          description: 'Event event-2 at over 4, delivery 3.',
        },
        stagedRecordId: '42',
        acceptedRecordId: null,
        operation: 'upsert',
        correctionTarget: null,
        referenceResolutions: [],
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
              fixtureId: '12',
              fixtureLabel: 'Lions vs Bears · 2026-09-01',
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
    await renderReport();
    expect(await screen.findByText(/Accepted delivery: 91/)).toBeInTheDocument();
    expect(screen.getByText(/Correction target:/)).toHaveTextContent(
      'cricsheet:delivery:100-original (published delivery 88)',
    );
    expect(screen.getByText(/Source: events.csv, row 3, Striker/)).toBeInTheDocument();
    expect(screen.getByText(/Choose a known striker reference/)).toBeInTheDocument();
  });

  test(
    'presents validation failures in plain language while retaining technical details',
    async () => {
      const body = report(0, 1);
      body.data.errorGroups = [{ ruleCode: 'EVENT_SCHEMA_INVALID', count: 1 }];
      body.data.items = [
        {
          ordinal: 0,
          outcome: 'rejected',
          location: {
            filePath: 'events.csv',
            sheetName: null,
            rowNumber: 2,
            jsonPath: 'runs.total',
            ordinal: 0,
          },
          context: {
            eventReference: 'event-1',
            fixtureId: '12',
            fixtureLabel: 'Lions vs Bears · 2026-09-01',
            inningsId: '8',
            overNumber: 4,
            positionInOver: 2,
            description: 'Event event-1 at over 4, delivery 2.',
          },
          stagedRecordId: '41',
          acceptedRecordId: null,
          operation: 'upsert',
          correctionTarget: null,
          referenceResolutions: [],
          errors: [
            {
              ruleCode: 'EVENT_SCHEMA_INVALID',
              message: 'Runs total does not match its components.',
              location: {
                filePath: 'events.csv',
                sheetName: null,
                rowNumber: 2,
                jsonPath: 'runs.total',
                ordinal: 0,
              },
              context: {
                eventReference: 'event-1',
                fixtureId: '12',
                fixtureLabel: 'Lions vs Bears · 2026-09-01',
                inningsId: '8',
                overNumber: 4,
                positionInOver: 2,
                description: 'Event event-1 at over 4, delivery 2.',
              },
            },
          ],
        },
      ];

      vi.stubGlobal('fetch', reportFetch(body));
      await renderReport();

      expect(await screen.findByText('Event data needs correction (1)')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Runs total does not match its components. Check this source value and correct it before resubmitting.',
        ),
      ).toBeInTheDocument();
      expect(screen.getByText(/Source: events.csv, row 2, Total runs/)).toBeInTheDocument();
      expect(screen.getAllByText('Technical details').length).toBeGreaterThan(0);
      expect(
        screen.getAllByText('EVENT_SCHEMA_INVALID', { selector: 'code' }).length,
      ).toBeGreaterThan(0);
    },
  );

  test('maps an ambiguous reference through readable labeled controls', async () => {
    const body = report(0, 1);
    const candidateReference = '223e4567-e89b-42d3-a456-426614174000';
    body.data.items = [
      {
        ordinal: 4,
        outcome: 'unresolved',
        location: {
          filePath: 'deliveries.csv',
          sheetName: 'Events',
          rowNumber: 18,
          jsonPath: 'striker',
          ordinal: 4,
        },
        context: {
          eventReference: 'provider:event:4',
          fixtureId: null,
          fixtureLabel: null,
          inningsId: null,
          overNumber: 2,
          positionInOver: 4,
          description: 'Over 2, delivery 4 between Wanderers and Strikers.',
        },
        stagedRecordId: null,
        acceptedRecordId: null,
        operation: 'upsert',
        correctionTarget: null,
        errors: [
          {
            ruleCode: 'REFERENCE_AMBIGUOUS',
            message: 'More than one participant is named A. Smith.',
            location: {
              filePath: 'deliveries.csv',
              sheetName: 'Events',
              rowNumber: 18,
              jsonPath: 'striker',
              ordinal: 4,
            },
            context: {
              eventReference: 'provider:event:4',
              fixtureId: null,
              fixtureLabel: null,
              inningsId: null,
              overNumber: 2,
              positionInOver: 4,
              description: 'Over 2, delivery 4 between Wanderers and Strikers.',
            },
          },
        ],
        referenceResolutions: [
          {
            referencePath: 'events.4.striker',
            entityType: 'participant',
            state: 'ambiguous',
            submittedReference: { name: 'A. Smith' },
            reason: 'Two participants have this retained alias.',
            requiredAction: 'select_candidate',
            candidates: [{ candidateReference, label: 'Alex Smith — Wanderers, 2026/27' }],
          },
        ],
      },
    ];
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('/auth/me')) return Promise.resolve(apiResponse(profile()));
      if (init?.method === 'POST') {
        return Promise.resolve(
          apiResponse({
            data: {
              batchReference: reference,
              decisionReference: '323e4567-e89b-42d3-a456-426614174000',
              status: 'queued',
              statusUrl: `/api/v1/batches/${reference}`,
              submittedAt: '2026-09-08T11:00:00.000Z',
            },
          }),
        );
      }
      return Promise.resolve(apiResponse(body));
    });
    vi.stubGlobal('fetch', fetchMock);
    await renderReport();

    expect(await screen.findByLabelText('Choose the matching participant')).toHaveDisplayValue(
      'Alex Smith — Wanderers, 2026/27',
    );
    expect(
      screen.getByRole('link', { name: /Go to deliveries.csv, sheet Events, row 18, Striker/ }),
    ).toHaveAttribute('href', '#batch-item-4-source');
    fireEvent.click(screen.getByRole('button', { name: 'Use selected match' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(`/batches/${reference}/reference-mappings`),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(candidateReference),
        }),
      ),
    );
    expect(await screen.findByRole('button', { name: 'Match queued' })).toBeDisabled();
    expect(screen.getByText(/Background validation continues after you leave/)).toBeInTheDocument();
  });

  test('keeps reviewer decisions out of the submitter report', async () => {
    const awaiting = report(3, 0);
    awaiting.data.batch.status = 'awaiting_review';
    vi.stubGlobal('fetch', reportFetch(awaiting, profile('admin')));
    await renderReport();
    expect(await screen.findByRole('heading', { name: 'Batch summary' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve and publish' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject batch' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Return for correction' })).not.toBeInTheDocument();
  });
});
