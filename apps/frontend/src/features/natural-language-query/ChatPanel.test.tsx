import type {
  Leaderboard,
  NaturalLanguageQueryResult,
  ParticipantAggregates,
  QueryDefinitionEvaluation,
} from '@sport-analytics/contracts';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatLauncher } from './ChatLauncher';
import { ChatPanel } from './ChatPanel';

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
      <ChatPanel onClose={onClose} />
    </MemoryRouter>,
  );
  return onClose;
}

function type(value: string) {
  const input = screen.getByLabelText('Your question') as HTMLTextAreaElement;
  // The panel bounds the question with maxLength, which fireEvent does not apply
  // for us, so the browser's truncation is reproduced here.
  fireEvent.change(input, { target: { value: value.slice(0, input.maxLength) } });
}

async function ask(question = 'Who scored most runs?') {
  type(question);
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }));
  });
}

describe('floating chat launcher (issue #936)', () => {
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
        <ChatLauncher />
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
        <ChatLauncher />
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
        <ChatLauncher />
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
        <ChatLauncher />
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

  // The conversation is a log rather than a plain region: it is a chronological
  // sequence a reader is added to, which is what `role="log"` means, and it is
  // announced politely so an answer never interrupts what is being read.
  it('announces results politely in the conversation log', () => {
    renderDialog();

    expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'polite');
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

  // Issue #936 inverts what the widget did. The widget replaced each answer and a
  // test pinned that down; a chat keeps the conversation, so the same scenario
  // now asserts that both turns are still on screen.
  it('keeps earlier turns rather than replacing the previous answer', async () => {
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
    // The first answer is still there.
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByText(/Read as:/)).toHaveLength(2);
  });
});

describe('conversation (issue #936)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function requestBodyOf(call: number): Record<string, unknown> {
    const fetchMock = vi.mocked(globalThis.fetch);
    const [, init] = fetchMock.mock.calls[call] as [string, RequestInit];
    return JSON.parse(String(init.body)) as Record<string, unknown>;
  }

  it('sends no conversation with the first question', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(200, { data: answer(ANSWERED_LEADERBOARD) }),
    );
    renderDialog();

    await ask('Who scored most runs?');

    // Absent rather than empty, so a first question is the request this endpoint
    // has always received.
    expect(requestBodyOf(0)).toEqual({ question: 'Who scored most runs?' });
  });

  it('sends the previous turn as conversation on a follow-up', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(200, { data: answer(ANSWERED_LEADERBOARD) }),
    );
    renderDialog();

    await ask('Who scored most runs in 2024?');
    await screen.findByRole('table');
    await ask('What about his strike rate?');

    expect(requestBodyOf(1)).toEqual({
      question: 'What about his strike rate?',
      conversation: [
        {
          question: 'Who scored most runs in 2024?',
          // The definition from that turn's own evaluation, not one rebuilt here.
          definition: ANSWERED_LEADERBOARD.definition,
        },
      ],
    });
  });

  it('sends at most the last five turns', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(200, { data: answer(ANSWERED_LEADERBOARD) }),
    );
    renderDialog();

    for (let turn = 1; turn <= 6; turn += 1) {
      await ask('Question ' + turn + '?');
    }

    const sent = requestBodyOf(5).conversation as { question: string }[];
    expect(sent).toHaveLength(5);
    // The oldest is dropped, not the newest.
    expect(sent.map((turn) => turn.question)).toEqual([
      'Question 1?',
      'Question 2?',
      'Question 3?',
      'Question 4?',
      'Question 5?',
    ]);
  });

  it('does not send a turn for a question that failed', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { data: answer(ANSWERED_LEADERBOARD) }));
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { data: answer(ANSWERED_LEADERBOARD) }));
    renderDialog();

    await ask('Who scored most runs?');
    await screen.findByRole('table');
    await ask('A question that fails?');
    await screen.findByText(/could not be sent/i);
    await ask('And another?');

    // A failed question has no definition, so it cannot be a turn: only the
    // answered one is sent back.
    const sent = requestBodyOf(2).conversation as { question: string }[];
    expect(sent.map((turn) => turn.question)).toEqual(['Who scored most runs?']);
  });

  it('clears the conversation, and the next question sends none', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(200, { data: answer(ANSWERED_LEADERBOARD) }),
    );
    renderDialog();

    await ask('Who scored most runs?');
    await screen.findByRole('table');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'New conversation' }));
    });

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText(/Read as:/)).not.toBeInTheDocument();

    await ask('A fresh question?');
    expect(requestBodyOf(1)).toEqual({ question: 'A fresh question?' });
  });

  it('offers nothing to clear until a question has been asked', () => {
    renderDialog();

    expect(screen.queryByRole('button', { name: 'New conversation' })).not.toBeInTheDocument();
  });

  it('shows each question above its own answer, oldest first', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(200, { data: answer(ANSWERED_LEADERBOARD) }),
    );
    renderDialog();

    await ask('First question?');
    await screen.findByRole('table');
    await ask('Second question?');

    const transcript = screen.getByRole('log');
    const text = transcript.textContent ?? '';
    expect(text.indexOf('First question?')).toBeGreaterThanOrEqual(0);
    expect(text.indexOf('Second question?')).toBeGreaterThan(text.indexOf('First question?'));
  });

  it('keeps the conversation in memory only', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(200, { data: answer(ANSWERED_LEADERBOARD) }),
    );
    const setItem = vi.spyOn(window.localStorage, 'setItem');
    const sessionSetItem = vi.spyOn(window.sessionStorage, 'setItem');
    renderDialog();

    await ask('Who scored most runs?');
    await screen.findByRole('table');

    expect(setItem).not.toHaveBeenCalled();
    expect(sessionSetItem).not.toHaveBeenCalled();
  });
});

describe('suggestions (issue #851)', () => {
  const SUGGESTION = {
    kind: 'leaderboard' as const,
    metric: 'most_runs' as const,
    scope: 'competition' as const,
    competition: { name: 'Indian Premier League' },
    limit: 10,
  };
  const SUGGESTION_LABEL = 'Most runs · Indian Premier League · top 10';

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function unsupportedWithSuggestions(suggestions: unknown[]) {
    return {
      data: {
        question: 'who is the best batter in the IPL?',
        model: 'claude-haiku-4-5-20251001',
        evaluation: {
          outcome: 'unsupported',
          definitionVersion: VERSION,
          definition: { kind: 'unsupported', reason: 'ambiguous' },
          reason: 'ambiguous',
        },
        suggestions,
      },
    };
  }

  it('offers the suggestions, worded from the definition rather than the model', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(200, unsupportedWithSuggestions([SUGGESTION])),
    );
    renderDialog();

    await ask('who is the best batter in the IPL?');

    expect(await screen.findByText('Questions this can answer:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: SUGGESTION_LABEL })).toBeInTheDocument();
  });

  // The whole point of a suggestion is that it costs no further model call.
  it('answers a clicked suggestion through the evaluation endpoint, not the question endpoint', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(jsonResponse(200, unsupportedWithSuggestions([SUGGESTION])));
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        data: {
          outcome: 'answered',
          definitionVersion: VERSION,
          definition: SUGGESTION,
          resolved: {
            participantIds: [],
            competitionId: '4',
            seasonId: null,
            season: null,
          },
          sources: [{ endpoint: '/api/v1/statistics/leaderboards', statisticIds: [] }],
          result: { ...LEADERBOARD, scope: 'competition', season: undefined, seasonId: undefined },
        },
      }),
    );
    renderDialog();

    await ask('who is the best batter in the IPL?');
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: SUGGESTION_LABEL }));
    });

    expect(await screen.findByRole('table')).toBeInTheDocument();
    const paths = fetchMock.mock.calls.map(([url]) => String(url));
    expect(paths[0]).toContain('/natural-language-queries');
    expect(paths[1]).toContain('/query-definitions/evaluate');
    expect(paths).toHaveLength(2);
  });

  it('reads the answer back as the suggestion that was clicked', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(jsonResponse(200, unsupportedWithSuggestions([SUGGESTION])));
    // The evaluation endpoint echoes the definition it was given, so the answer
    // reads back as the suggestion rather than as the original question.
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        data: {
          outcome: 'entity_not_found',
          definitionVersion: VERSION,
          definition: SUGGESTION,
          reference: 'competition',
          nameHint: 'Indian Premier League',
        },
      }),
    );
    renderDialog();

    await ask('who is the best batter in the IPL?');
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: SUGGESTION_LABEL }));
    });

    // Two turns are on screen now, so it is the newest that must read back as the
    // suggestion rather than as the question that was refused.
    const readings = await screen.findAllByText(/Read as:/);
    expect(readings[readings.length - 1]).toHaveTextContent(SUGGESTION_LABEL);
  });

  it('offers nothing when the response carries no suggestions', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(200, unsupportedWithSuggestions([])),
    );
    renderDialog();

    await ask('which ground sees most sixes?');

    expect(await screen.findByText(/does not say which player/i)).toBeInTheDocument();
    expect(screen.queryByText('Questions this can answer:')).not.toBeInTheDocument();
  });

  // The output that would have carried a suggestion is the thing that failed, so
  // the examples stand in.
  it('falls back to the example questions when the model output was unusable', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(422, {
        error: { code: 'QUERY_NOT_UNDERSTOOD', message: 'Not translatable.' },
      }),
    );
    renderDialog();

    await ask('qwerty asdf');

    expect(await screen.findByText(/Try rephrasing/i)).toBeInTheDocument();
    expect(screen.getByText('Questions this can answer:')).toBeInTheDocument();
    const example = screen.getAllByRole('button', {
      name: 'Who scored the most runs in the 2024 Indian Premier League season?',
    });
    fireEvent.click(example[example.length - 1]!);
    expect(screen.getByLabelText('Your question')).toHaveValue(
      'Who scored the most runs in the 2024 Indian Premier League season?',
    );
  });

  it('offers no fallback for a failure the reader cannot rephrase away', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(503, {
        error: { code: 'QUERY_SERVICE_UNAVAILABLE', message: 'Unavailable.' },
      }),
    );
    renderDialog();

    await ask('most runs in the IPL');

    expect(await screen.findByText(/temporarily unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText('Questions this can answer:')).not.toBeInTheDocument();
  });
});
