import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import type { BatchReportItem } from '@sport-analytics/contracts';
import { render, screen } from '@testing-library/react';
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

function report(accepted: number, rejected: number) {
  return {
    data: {
      batch: {
        batchReference: reference,
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
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(apiResponse(report(accepted, rejected))));
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
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(apiResponse(body)));
    renderReport();
    expect(await screen.findByText(/Accepted delivery: 91/)).toBeInTheDocument();
    expect(screen.getByText(/Source: events.csv, row 3, striker/)).toBeInTheDocument();
    expect(screen.getByText(/Choose a known striker reference/)).toBeInTheDocument();
  });
});
