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
      blockingItems: blocked ? [item] : [],
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

  test('renders structured fixture, innings and participant references as cricket context', async () => {
    const body = report(true);
    body.data.blockingItems[0]!.referenceResolutions = [
      {
        referencePath: 'fixtures.0',
        entityType: 'fixture',
        state: 'unresolved',
        submittedReference: {
          sourceId: 'cricsheet:fixture:12345',
          season: { context: { name: '2026' } },
          context: {
            date: '2026-01-01',
            teams: [{ context: { name: 'Wits' } }, { context: { name: 'UCT' } }],
          },
        },
        reason: 'No matching fixture.',
        requiredAction: 'contact_reviewer',
        candidates: [],
      },
      {
        referencePath: 'fixtures.0.innings.0',
        entityType: 'innings',
        state: 'unresolved',
        submittedReference: {
          context: { ordinal: 0, battingTeam: { context: { name: 'Wits' } } },
        },
        reason: 'Fixture must be resolved first.',
        requiredAction: 'contact_reviewer',
        candidates: [],
      },
      {
        referencePath: 'fixtures.0.innings.0.events.0.striker',
        entityType: 'participant',
        state: 'unresolved',
        submittedReference: {
          sourceId: 'cricsheet:participant:a-smith',
          context: { name: 'A. Smith', team: { context: { name: 'Wits' } } },
        },
        reason: 'No matching participant.',
        requiredAction: 'contact_reviewer',
        candidates: [],
      },
    ];
    body.data.reviewSummary.resolution.ambiguous = 0;
    body.data.reviewSummary.resolution.unresolved = 3;

    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) =>
        Promise.resolve(response(String(input).includes('/auth/me') ? profile : body)),
      ),
    );
    renderPage(`/reviews/batches/${reference}`);

    expect(
      await screen.findByRole('heading', {
        name: 'Fixture: Wits vs UCT · 2026-01-01 · Season 2026',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Source: cricsheet:fixture:12345')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Innings: Innings 1 · Wits batting' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Participant: A. Smith · Wits' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/\[object Object\]/)).not.toBeInTheDocument();
  });

  test('bounds large unresolved collections and filters every reference by review attributes', async () => {
    const body = report(true);
    body.data.blockingItems[0]!.referenceResolutions = Array.from({ length: 45 }, (_, index) => ({
      referencePath: `fixtures.0.innings.0.events.${index}.striker`,
      entityType: 'participant' as const,
      state: index === 44 ? ('invalid' as const) : ('unresolved' as const),
      submittedReference: {
        context: { name: `Player ${index + 1}`, team: { context: { name: 'Wits' } } },
      },
      reason: 'No matching participant.',
      requiredAction: 'contact_reviewer' as const,
      candidates: [],
    }));
    body.data.reviewSummary.resolution.ambiguous = 0;
    body.data.reviewSummary.resolution.unresolved = 44;
    body.data.reviewSummary.resolution.invalid = 1;

    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) =>
        Promise.resolve(response(String(input).includes('/auth/me') ? profile : body)),
      ),
    );
    renderPage(`/reviews/batches/${reference}`);

    expect(await screen.findByText('45 unresolved references in total')).toBeInTheDocument();
    expect(screen.getAllByRole('article', { name: /Participant:/ })).toHaveLength(20);
    fireEvent.click(screen.getByRole('button', { name: 'Show next unresolved references' }));
    expect(
      screen.getByRole('heading', { name: 'Participant: Player 21 · Wits' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show next unresolved references' }));
    expect(
      screen.getByRole('heading', { name: 'Participant: Player 45 · Wits' }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Resolution state'), { target: { value: 'invalid' } });
    expect(screen.getAllByRole('article', { name: /Participant:/ })).toHaveLength(1);
    expect(
      screen.getByRole('heading', { name: 'Participant: Player 45 · Wits' }),
    ).toBeInTheDocument();
  });

  test('surfaces multiple fixture proposals and scopes queued feedback to the chosen proposal', async () => {
    const body = report(true);
    body.data.batch.source.packageVersion = '1.1';
    const fixtureResolution = (index: number, left: string, right: string) => ({
      referencePath: `fixtures.${index}`,
      entityType: 'fixture' as const,
      state: 'unresolved' as const,
      submittedReference: {
        sourceId: `cricsheet:fixture:new-${index}`,
        season: { context: { name: '2026' } },
        context: {
          date: `2026-01-0${index + 1}`,
          teams: [{ context: { name: left } }, { context: { name: right } }],
        },
        proposal: {
          endDate: `2026-01-0${index + 1}`,
          matchType: 'T20',
          teamType: 'university',
          gender: 'mixed',
          ballsPerOver: 6,
          outcome: 'tie' as const,
          sourceVersion: '1.1',
          sourceRevision: 1,
        },
      },
      reason: 'New fixture.',
      requiredAction: 'contact_reviewer' as const,
      candidates: [],
    });
    body.data.blockingItems[0]!.referenceResolutions = [
      fixtureResolution(0, 'Wits', 'UCT'),
      fixtureResolution(1, 'Lions', 'Bears'),
    ];
    body.data.reviewSummary.resolution.ambiguous = 0;
    body.data.reviewSummary.resolution.unresolved = 2;
    let queued = false;
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/auth/me')) return Promise.resolve(response(profile));
      if (init?.method === 'POST' && url.includes('/canonical-fixtures')) {
        queued = true;
        body.data.batch.status = 'validating';
        return Promise.resolve(
          response({
            data: {
              batchReference: reference,
              decisionReference: '688a0bf0-e168-4b67-bf6f-f5857dbb1f87',
              status: 'queued',
              statusUrl: `/api/v1/batches/${reference}`,
              submittedAt: '2026-09-11T12:00:00.000Z',
            },
          }),
        );
      }
      return Promise.resolve(response(body));
    });
    vi.stubGlobal('fetch', fetchMock);
    renderPage(`/reviews/batches/${reference}`);

    const actionSection = await screen.findByRole('region', { name: 'Reviewer actions required' });
    const proposalCards = within(actionSection).getAllByRole('article', { name: /Fixture:/ });
    expect(proposalCards).toHaveLength(2);
    fireEvent.click(
      within(proposalCards[0]!).getByRole('button', {
        name: 'Create canonical fixture from proposal',
      }),
    );

    expect(
      await within(proposalCards[0]!).findByText(
        'Canonical fixture decision queued for validation.',
      ),
    ).toBeInTheDocument();
    expect(
      within(proposalCards[1]!).queryByText('Canonical fixture decision queued for validation.'),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(queued).toBe(true));
    expect(screen.getByText(/Revalidation in progress/)).toBeInTheDocument();
    for (const button of screen.getAllByRole('button', {
      name: 'Create canonical fixture from proposal',
    })) {
      expect(button).toBeDisabled();
    }
  });

  test('scopes action errors to the reference whose mapping failed', async () => {
    const body = report(true);
    const first = body.data.blockingItems[0]!.referenceResolutions[0]!;
    body.data.blockingItems[0]!.referenceResolutions = [
      first,
      {
        ...structuredClone(first),
        referencePath: 'fixtures.0.innings.0.events.1.striker',
        submittedReference: 'Second participant',
      },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).includes('/auth/me')) return Promise.resolve(response(profile));
        if (init?.method === 'POST') return Promise.resolve(response({}, 500));
        return Promise.resolve(response(body));
      }),
    );
    renderPage(`/reviews/batches/${reference}`);

    const actionSection = await screen.findByRole('region', { name: 'Reviewer actions required' });
    const cards = within(actionSection).getAllByRole('article');
    fireEvent.click(within(cards[0]!).getByRole('button', { name: /^Use Lions vs Bears/ }));

    expect(await within(cards[0]!).findByRole('alert')).toHaveTextContent(
      'The mapping could not be saved.',
    );
    expect(within(cards[1]!).queryByRole('alert')).not.toBeInTheDocument();
  });

  test('explains overlapping counts and distinguishes candidate matches from fixture proposals', async () => {
    const body = report(true);
    body.data.batch.progress.total = 4;
    body.data.batch.progress.rejected = 4;
    body.data.batch.counts.rejected = 4;
    body.data.batch.counts.unresolved = 4;
    body.data.reviewSummary.validation.rejected = 4;
    body.data.reviewSummary.resolution.ambiguous = 0;
    body.data.reviewSummary.resolution.unresolved = 4;
    body.data.reviewSummary.resolution.proposed = 0;

    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) =>
        Promise.resolve(response(String(input).includes('/auth/me') ? profile : body)),
      ),
    );
    renderPage(`/reviews/batches/${reference}`);

    expect(await screen.findByText('Counts describe overlapping categories.')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The same 4 submitted items can be both rejected and unresolved. Do not add these counts together.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Candidate matches')).toBeInTheDocument();
    expect(screen.getByText('New-fixture proposals requiring review')).toBeInTheDocument();
    expect(screen.queryByText('Proposed matches')).not.toBeInTheDocument();
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

    expect(await screen.findByRole('heading', { name: 'Review queue' })).toBeInTheDocument();
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
    expect(screen.queryByRole('button', { name: 'Reject submission' })).not.toBeInTheDocument();
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

  test('shows a later unresolved reference from blocking items without loading ordinary results', async () => {
    const body = report(true);
    const blocker = body.data.blockingItems[0]!;
    blocker.ordinal = 99;
    blocker.location.ordinal = 99;
    blocker.referenceResolutions[0]!.state = 'unresolved';
    body.data.reviewSummary.resolution.ambiguous = 0;
    body.data.reviewSummary.resolution.unresolved = 1;
    body.data.items = report(false).data.items;

    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) =>
        Promise.resolve(response(String(input).includes('/auth/me') ? profile : body)),
      ),
    );
    renderPage(`/reviews/batches/${reference}`);

    expect(await screen.findByRole('button', { name: /^Use Lions vs Bears/ })).toBeInTheDocument();
    expect(screen.queryByText('All displayed references are resolved.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load more report results' })).toBeInTheDocument();
  });

  test('shows and refreshes a later published conflict independently of ordinary results', async () => {
    const initial = report(false);
    const conflict = { ...initial.data.items[0]!, ordinal: 99, outcome: 'conflicting' as const };
    conflict.location = { ...conflict.location, ordinal: 99 };
    conflict.publishedConflict = {
      existingDeliveryId: '88',
      existingSourceEventId: '123e4567-e89b-42d3-a456-426614174099',
      correctionPermitted: true,
      differences: [{ fieldPath: 'runs.batter', submittedValue: 4, publishedValue: 1 }],
    };
    initial.data.blockingItems = [conflict];
    initial.data.reviewSummary.validation.conflicting = 1;
    initial.data.reviewSummary.approvalBlocked = true;
    initial.data.reviewSummary.blockingReasons = ['Conflicting records remain.'];
    initial.data.batch.counts.conflicting = 1;
    const refreshed = structuredClone(initial);
    refreshed.data.blockingItems = [];
    refreshed.data.reviewSummary.validation.conflicting = 0;
    refreshed.data.batch.counts.conflicting = 0;
    let resolved = false;
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/auth/me')) return Promise.resolve(response(profile));
      if (init?.method === 'POST') {
        resolved = true;
        return Promise.resolve(response({ data: initial.data.batch }));
      }
      return Promise.resolve(response(resolved ? refreshed : initial));
    });
    vi.stubGlobal('fetch', fetchMock);
    renderPage(`/reviews/batches/${reference}`);

    expect(
      await screen.findByRole('button', { name: 'Keep published delivery' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Approve submitted correction' }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Resolution reason'), {
      target: { value: 'Keep the verified published delivery.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Keep published delivery' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Keep published delivery' }),
      ).not.toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/conflicts/resolve'),
      expect.objectContaining({ method: 'POST' }),
    );
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

    expect(await screen.findByText(/Ready for publication/)).toBeInTheDocument();
    expect(await screen.findByText('Only the accepted subset will publish')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Approving publishes 19999 accepted records. The 1 rejected record remains unpublished and retained in this report.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve and publish' })).toBeEnabled();
  });
  test('reconciles an ambiguous approval request failure against durable backend state', async () => {
    const initial = report(false);
    const publishing = report(false);
    const approvalReason = 'Ready for background publication.';

    publishing.data.batch.status = 'publishing';
    publishing.data.batch.updatedAt = '2026-09-14T14:00:00.000Z';
    publishing.data.batch.review = {
      decision: 'approved',
      actor: {
        accountId: profile.user.id,
        displayName: profile.user.displayName,
      },
      decidedAt: '2026-09-14T14:00:00.000Z',
      reason: approvalReason,
    };

    let reportReads = 0;

    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes('/auth/me')) {
        return Promise.resolve(response(profile));
      }

      if (init?.method === 'POST' && url.includes('/review')) {
        return Promise.reject(new TypeError('Failed to fetch'));
      }

      if (url.includes(`/batches/${reference}/report`)) {
        reportReads += 1;

        return Promise.resolve(response(reportReads === 1 ? initial : publishing));
      }

      return Promise.resolve(response({}, 404));
    });

    vi.stubGlobal('fetch', fetchMock);

    renderPage(`/reviews/batches/${reference}`);

    const approve = await screen.findByRole('button', {
      name: 'Approve and publish',
    });

    fireEvent.change(screen.getByLabelText(/Reason/), {
      target: { value: approvalReason },
    });

    fireEvent.click(approve);

    const dialog = screen.getByRole('dialog', {
      name: /Confirm approve and publish/,
    });

    fireEvent.click(
      within(dialog).getByRole('button', {
        name: 'Confirm approve and publish',
      }),
    );

    expect(
      await screen.findByText(
        'Approval recorded. Publication is continuing in the background. You may leave this page safely.',
      ),
    ).toBeInTheDocument();

    expect(screen.getByText(/Current state:/)).toHaveTextContent('Publishing');

    expect(screen.queryByRole('button', { name: 'Approve and publish' })).not.toBeInTheDocument();

    expect(screen.queryByRole('button', { name: 'Return for correction' })).not.toBeInTheDocument();

    expect(screen.queryByRole('button', { name: 'Reject submission' })).not.toBeInTheDocument();

    expect(
      screen.queryByText('The review decision could not be saved. Try again.'),
    ).not.toBeInTheDocument();

    expect(reportReads).toBeGreaterThanOrEqual(2);
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
    const reject = await screen.findByRole('button', { name: 'Reject submission' });
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
    expect(await screen.findByText(/superseded and is terminal/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: body.data.batch.lineage.replacesBatchReference! }),
    ).toHaveAttribute('href', '/reviews/batches/223e4567-e89b-42d3-a456-426614174000');
    expect(
      screen.getByRole('link', { name: body.data.batch.lineage.supersededByBatchReference! }),
    ).toHaveAttribute('href', '/reviews/batches/323e4567-e89b-42d3-a456-426614174000');
  });
});
