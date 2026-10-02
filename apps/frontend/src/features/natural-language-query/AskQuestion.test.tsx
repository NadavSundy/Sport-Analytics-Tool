import type {
  Leaderboard,
  NaturalLanguageQueryResult,
  ParticipantAggregates,
  QueryDefinitionEvaluation,
} from '@sport-analytics/contracts';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AskQuestionDialog } from './AskQuestionDialog';
import { AskQuestionPrompt } from './AskQuestionPrompt';

const VERSION = `qdv1_${'a'.repeat(43)}`;

function jsonResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function answer(evaluation: QueryDefinitionEvaluation): NaturalLanguageQueryResult {
  return { question: 'a question', model: 'claude-haiku-4-5-20251001', evaluation };
}

const LEADERBOARD: Leaderboard = {
  scope: 'season',
  competitionId: '4',
  competitionName: 'Indian Premier League',
  season: '2024',
  seasonId: 'season_abc',
  metric: 'most_runs',
  limit: 10,
  qualification: null,
  tieBreakers: ['metricValue', 'participantName', 'participantId'],
  entries: [
    { rank: 1, participantId: '8452', participantName: 'V Kohli', value: 741 },
    { rank: 2, participantId: '12703', participantName: 'RD Gaikwad', value: 583 },
  ],
};

function aggregates(participantId: string, participantName: string): ParticipantAggregates {
  return {
    participantId,
    participantName,
    status: 'complete',
    scope: { superOversIncluded: false },
    warnings: [],
    statistics: [
      {
        statisticId: `stat_${participantId}`,
        participantId,
        participantName,
        appearances: 400,
        fixtureCount: 400,
        sourceEventCount: 9841,
        batting: null,
        bowling: null,
        fielding: { catches: 1, stumpings: 0, runOutInvolvements: 0 },
        scope: 'career',
        statisticCode: 'participant_career',
      },
    ],
  };
}

const ANSWERED_LEADERBOARD: QueryDefinitionEvaluation = {
  outcome: 'answered',
  definitionVersion: VERSION,
  definition: {
    kind: 'leaderboard',
    metric: 'most_runs',
    scope: 'season',
    season: { competitionName: 'Indian Premier League', seasonLabel: '2024' },
    limit: 10,
  },
  resolved: {
    participantIds: [],
    competitionId: '4',
    seasonId: 'season_abc',
    season: '2024',
  },
  sources: [{ endpoint: '/api/v1/statistics/leaderboards?scope=season', statisticIds: [] }],
  result: LEADERBOARD,
};

function renderDialog(onClose = vi.fn()) {
  render(
    <MemoryRouter>
      <AskQuestionDialog onClose={onClose} />
    </MemoryRouter>,
  );
  return onClose;
}

function type(value: string) {
  const input = screen.getByLabelText('Your question') as HTMLTextAreaElement;
  // The dialog bounds the question with maxLength, which fireEvent does not apply
  // for us, so the browser's truncation is reproduced here.
  fireEvent.change(input, { target: { value: value.slice(0, input.maxLength) } });
}

async function ask(question = 'Who scored most runs?') {
  type(question);
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }));
  });
}

describe('ask a stats question trigger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // The home page is gated on performance, so the dialog must not be in the
  // initial work: it is imported when the visitor reaches for the button.
  it('renders only a trigger and loads nothing until it is used', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter>
        <AskQuestionPrompt />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: 'Ask a stats question' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Your question')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('opens the dialog on click and moves focus to the question', async () => {
    render(
      <MemoryRouter>
        <AskQuestionPrompt />
      </MemoryRouter>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Ask a stats question' }));
    });

    const input = await screen.findByLabelText('Your question');
    await waitFor(() => expect(input).toHaveFocus());
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('returns focus to the trigger when the dialog closes', async () => {
    render(
      <MemoryRouter>
        <AskQuestionPrompt />
      </MemoryRouter>,
    );
    const trigger = screen.getByRole('button', { name: 'Ask a stats question' });

    await act(async () => {
      fireEvent.click(trigger);
    });
    await screen.findByLabelText('Your question');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    render(
      <MemoryRouter>
        <AskQuestionPrompt />
      </MemoryRouter>,
    );
    const trigger = screen.getByRole('button', { name: 'Ask a stats question' });

    await act(async () => {
      fireEvent.click(trigger);
    });
    await screen.findByLabelText('Your question');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});

describe('asking a question', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('states before the first question that the text is sent to Anthropic', () => {
    renderDialog();

    expect(screen.getByText(/sent to Anthropic/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'privacy notice' })).toHaveAttribute(
      'href',
      '/privacy',
    );
  });

  it('offers the example questions and fills one in when chosen', async () => {
    renderDialog();

    const example = screen.getByRole('button', {
      name: 'Who scored the most runs in the 2024 Indian Premier League season?',
    });
    fireEvent.click(example);

    expect(screen.getByLabelText('Your question')).toHaveValue(
      'Who scored the most runs in the 2024 Indian Premier League season?',
    );
  });

  it('counts characters and refuses an empty or whitespace-only question', async () => {
    renderDialog();

    expect(screen.getByText('0 of 300 characters')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ask' })).toBeDisabled();

    type('   ');

    expect(screen.getByText('3 of 300 characters')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ask' })).toBeDisabled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  // The contract bounds the question at 300 characters, so the dialog stops a
  // longer one rather than spending a request to be told.
  it('prevents a question longer than the contract allows', async () => {
    renderDialog();

    type('a'.repeat(305));

    expect(screen.getByLabelText('Your question')).toHaveValue('a'.repeat(300));
    expect(screen.getByText('300 of 300 characters')).toBeInTheDocument();
  });

  it('shows a loading state while the answer is being worked out', async () => {
    let release: (value: Response) => void = () => undefined;
    vi.mocked(globalThis.fetch).mockReturnValue(
      new Promise<Response>((resolve) => {
        release = resolve;
      }),
    );
    renderDialog();

    await ask();

    expect(screen.getByText('Working out the answer…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Asking…' })).toBeDisabled();

    release(jsonResponse(200, { data: answer(ANSWERED_LEADERBOARD) }));
    await waitFor(() =>
      expect(screen.queryByText('Working out the answer…')).not.toBeInTheDocument(),
    );
  });

  it('announces results in a live region', () => {
    renderDialog();

    expect(screen.getByRole('region')).toHaveAttribute('aria-live', 'polite');
  });

  describe('answered', () => {
    it('shows the interpretation before the ranking, and links to the published season', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(
        jsonResponse(200, { data: answer(ANSWERED_LEADERBOARD) }),
      );
      renderDialog();

      await ask();

      const interpretation = await screen.findByText(/Read as:/);
      expect(interpretation).toHaveTextContent('Most runs · Indian Premier League 2024 · top 10');

      const table = screen.getByRole('table');
      expect(within(table).getByRole('link', { name: 'V Kohli' })).toHaveAttribute(
        'href',
        '/participants/8452',
      );
      expect(within(table).getByText('741')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'this season' })).toHaveAttribute(
        'href',
        '/seasons/season_abc',
      );
      // The interpretation must precede the figures in the document, not follow them.
      expect(interpretation.compareDocumentPosition(table)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('renders one participant with the published aggregate view', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(
        jsonResponse(200, {
          data: answer({
            outcome: 'answered',
            definitionVersion: VERSION,
            definition: {
              kind: 'participant_statistics',
              participant: { name: 'V Kohli' },
              scope: 'career',
            },
            resolved: {
              participantIds: ['8452'],
              competitionId: null,
              seasonId: null,
              season: null,
            },
            sources: [
              { endpoint: '/api/v1/participants/8452/statistics', statisticIds: ['stat_8452'] },
            ],
            result: aggregates('8452', 'V Kohli'),
          }),
        }),
      );
      renderDialog();

      await ask("What are V Kohli's career statistics?");

      expect(await screen.findByText(/Read as:/)).toHaveTextContent('V Kohli · career statistics');
      expect(screen.getByRole('link', { name: 'player 8452' })).toHaveAttribute(
        'href',
        '/participants/8452',
      );
    });

    it('renders a comparison as two aggregate views in the order asked', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(
        jsonResponse(200, {
          data: answer({
            outcome: 'answered',
            definitionVersion: VERSION,
            definition: {
              kind: 'participant_comparison',
              participants: [{ name: 'V Kohli' }, { name: 'RD Gaikwad' }],
              scope: 'career',
            },
            resolved: {
              participantIds: ['8452', '12703'],
              competitionId: null,
              seasonId: null,
              season: null,
            },
            sources: [
              { endpoint: '/api/v1/participants/8452/statistics', statisticIds: ['stat_8452'] },
              { endpoint: '/api/v1/participants/12703/statistics', statisticIds: ['stat_12703'] },
            ],
            result: [aggregates('8452', 'V Kohli'), aggregates('12703', 'RD Gaikwad')],
          }),
        }),
      );
      renderDialog();

      await ask('Compare V Kohli and RD Gaikwad over their careers');

      expect(await screen.findByText(/Read as:/)).toHaveTextContent(
        'V Kohli compared with RD Gaikwad · career statistics',
      );
      expect(screen.getByRole('link', { name: 'player 8452' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'player 12703' })).toBeInTheDocument();
    });
  });

  it('explains an unsupported question by its reason', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(200, {
        data: answer({
          outcome: 'unsupported',
          definitionVersion: VERSION,
          definition: { kind: 'unsupported', reason: 'bowler_type' },
          reason: 'bowler_type',
        }),
      }),
    );
    renderDialog();

    await ask('Who scores best against left-arm spinners?');

    expect(await screen.findByText(/Bowler type is not recorded/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('reports a name that matches nothing', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(200, {
        data: answer({
          outcome: 'entity_not_found',
          definitionVersion: VERSION,
          definition: {
            kind: 'participant_statistics',
            participant: { name: 'Nobody At All' },
            scope: 'career',
          },
          reference: 'participant',
          nameHint: 'Nobody At All',
        }),
      }),
    );
    renderDialog();

    await ask('Career stats for Nobody At All');

    expect(await screen.findByText(/Nothing published here matches/)).toBeInTheDocument();
    expect(screen.getByText('Nobody At All')).toBeInTheDocument();
  });

  // Candidates are offered as links rather than re-asked automatically: the
  // reader decides which player they meant.
  it('lists ambiguous candidates as links and asks nothing further', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        data: answer({
          outcome: 'entity_ambiguous',
          definitionVersion: VERSION,
          definition: {
            kind: 'participant_statistics',
            participant: { name: 'Rahul' },
            scope: 'career',
          },
          reference: 'participant',
          nameHint: 'Rahul',
          candidates: [
            { id: '1', displayName: 'KL Rahul' },
            { id: '2', displayName: 'Rahul Dravid' },
          ],
        }),
      }),
    );
    renderDialog();

    await ask('How many runs has Rahul scored?');

    expect(await screen.findByText(/More than one entry matches/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'KL Rahul' })).toHaveAttribute(
      'href',
      '/participants/1',
    );
    expect(screen.getByRole('link', { name: 'Rahul Dravid' })).toHaveAttribute(
      'href',
      '/participants/2',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  describe('failures', () => {
    it.each([
      [
        'a question that could not be translated',
        422,
        { error: { code: 'QUERY_NOT_UNDERSTOOD', message: 'Not translatable.' } },
        {},
        /Try rephrasing/i,
      ],
      [
        'a body the contract rejects',
        422,
        { error: { code: 'VALIDATION_FAILED', message: 'The question is invalid.' } },
        {},
        /The question is invalid/i,
      ],
      [
        'the global daily cap',
        429,
        { error: { code: 'GLOBAL_DAILY_LIMIT_REACHED', message: 'Busy.' } },
        {},
        /as many questions as it can today/i,
      ],
      [
        'the provider being unavailable',
        503,
        { error: { code: 'QUERY_SERVICE_UNAVAILABLE', message: 'Unavailable.' } },
        {},
        /temporarily unavailable/i,
      ],
      [
        'the limiter being unavailable',
        503,
        { error: { code: 'RATE_LIMIT_UNAVAILABLE', message: 'Unavailable.' } },
        {},
        /temporarily unavailable/i,
      ],
    ])('reports %s', async (_label, status, body, headers, expected) => {
      vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse(status, body, headers));
      renderDialog();

      await ask();

      expect(await screen.findByText(expected)).toBeInTheDocument();
    });

    it('turns Retry-After seconds into wording a reader can act on', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(
        jsonResponse(
          429,
          { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many.' } },
          { 'Retry-After': '45' },
        ),
      );
      renderDialog();

      await ask();

      expect(await screen.findByText(/try again in 45 seconds/i)).toBeInTheDocument();
    });

    it('rounds a long Retry-After to minutes', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(
        jsonResponse(
          429,
          { error: { code: 'QUOTA_EXCEEDED', message: 'Quota reached.' } },
          { 'Retry-After': '3600' },
        ),
      );
      renderDialog();

      await ask();

      expect(await screen.findByText(/try again in about 60 minutes/i)).toBeInTheDocument();
    });

    it('says only that it will be a while when no Retry-After is sent', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(
        jsonResponse(429, { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many.' } }),
      );
      renderDialog();

      await ask();

      expect(await screen.findByText(/try again shortly/i)).toBeInTheDocument();
    });

    it('reports a network failure without blaming the question', async () => {
      vi.mocked(globalThis.fetch).mockRejectedValue(new TypeError('Failed to fetch'));
      renderDialog();

      await ask();

      expect(await screen.findByText(/could not be sent/i)).toBeInTheDocument();
    });

    it('reports a response the contract rejects as unavailable rather than as the reader’s fault', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(
        jsonResponse(200, { data: { question: 'a question' } }),
      );
      renderDialog();

      await ask();

      expect(await screen.findByText(/temporarily unavailable/i)).toBeInTheDocument();
    });
  });

  it('replaces the previous answer rather than building a transcript', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { data: answer(ANSWERED_LEADERBOARD) }));
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        data: answer({
          outcome: 'unsupported',
          definitionVersion: VERSION,
          definition: { kind: 'unsupported', reason: 'venue' },
          reason: 'venue',
        }),
      }),
    );
    renderDialog();

    await ask();
    await screen.findByRole('table');

    await ask('Which ground sees most sixes?');

    expect(await screen.findByText(/Venues are not recorded/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getAllByText(/Read as:/)).toHaveLength(1);
  });
});
