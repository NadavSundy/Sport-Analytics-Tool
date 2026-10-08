import type {
  Leaderboard,
  NaturalLanguageQueryResult,
  QueryDefinitionEvaluation,
} from '@sport-analytics/contracts';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AskQuestionDialog } from './AskQuestionDialog';

/**
 * Issue #868 in the widget.
 *
 * The widget still asks one question at a time and sends no conversation — the
 * chat assistant is a separate issue — so only two things here are new, and both
 * are about not misleading a reader:
 *
 *   - an answer scoped to a competition the reader did not name says so; and
 *   - a single-candidate ambiguity, which the surname fallback now produces,
 *     reads as "did you mean" rather than "more than one entry matches".
 */

const VERSION = `qdv1_${'a'.repeat(43)}`;

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

const SIXES_LEADERBOARD: Leaderboard = {
  scope: 'competition',
  competitionId: '4',
  competitionName: 'Indian Premier League',
  metric: 'most_sixes',
  limit: 10,
  qualification: null,
  tieBreakers: ['metricValue', 'participantName', 'participantId'],
  entries: [{ rank: 1, participantId: '8452', participantName: 'V Kohli', value: 38 }],
};

const ASSUMED_COMPETITION: QueryDefinitionEvaluation = {
  outcome: 'answered',
  definitionVersion: VERSION,
  definition: {
    kind: 'leaderboard',
    metric: 'most_sixes',
    scope: 'competition',
    competition: { name: 'Indian Premier League' },
    limit: 10,
  },
  resolved: { participantIds: [], competitionId: '4', seasonId: null, season: null },
  sources: [{ endpoint: '/api/v1/statistics/leaderboards?scope=competition', statisticIds: [] }],
  result: SIXES_LEADERBOARD,
};

function result(
  evaluation: QueryDefinitionEvaluation,
  assumptions?: NaturalLanguageQueryResult['assumptions'],
): NaturalLanguageQueryResult {
  return {
    question: 'a question',
    model: 'claude-haiku-4-5-20251001',
    evaluation,
    ...(assumptions ? { assumptions } : {}),
  };
}

function respondWith(body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, body));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function ask(question: string) {
  render(
    <MemoryRouter>
      <AskQuestionDialog onClose={vi.fn()} />
    </MemoryRouter>,
  );

  const input = screen.getByLabelText('Your question') as HTMLTextAreaElement;
  fireEvent.change(input, { target: { value: question.slice(0, input.maxLength) } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }));
  });
}

describe('an answer that assumed the competition', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('tells the reader which competition it assumed', async () => {
    respondWith({ data: result(ASSUMED_COMPETITION, ['competition']) });

    await ask('Who has the most sixes?');

    expect(
      screen.getByText(/You did not say which competition, so this assumes Indian Premier League/),
    ).toBeInTheDocument();
    // The answer is still shown: the note explains the scope, it does not replace
    // the figures.
    expect(screen.getByText('V Kohli')).toBeInTheDocument();
  });

  it('says nothing when the reader named the competition themselves', async () => {
    respondWith({ data: result(ASSUMED_COMPETITION) });

    await ask('Who has the most sixes in the Indian Premier League?');

    expect(screen.queryByText(/so this assumes/)).not.toBeInTheDocument();
    expect(screen.getByText('V Kohli')).toBeInTheDocument();
  });

  // The widget sends one question at a time. The chat assistant is a separate
  // issue, and until then this field must stay absent from the request.
  it('still sends only the question', async () => {
    const fetchMock = respondWith({ data: result(ASSUMED_COMPETITION, ['competition']) });

    await ask('Who has the most sixes?');

    const [, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ question: 'Who has the most sixes?' });
  });

  it('names the competition from a season-scoped answer too', async () => {
    respondWith({
      data: result(
        {
          ...ASSUMED_COMPETITION,
          definition: {
            kind: 'leaderboard',
            metric: 'most_sixes',
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
          result: { ...SIXES_LEADERBOARD, scope: 'season', season: '2024', seasonId: 'season_abc' },
        },
        ['competition'],
      ),
    });

    await ask('Who hit the most sixes in 2024?');

    expect(screen.getByText(/so this assumes Indian Premier League/)).toBeInTheDocument();
  });
});

describe('a single-candidate ambiguity', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const SINGLE_CANDIDATE: QueryDefinitionEvaluation = {
    outcome: 'entity_ambiguous',
    definitionVersion: VERSION,
    definition: {
      kind: 'participant_statistics',
      participant: { name: 'Suresh Kohli' },
      scope: 'career',
    },
    reference: 'participant',
    nameHint: 'Suresh Kohli',
    candidates: [{ id: '8452', displayName: 'V Kohli' }],
  };

  // "More than one entry matches" would be untrue with one candidate, which the
  // surname fallback now produces.
  it('reads as a suggestion to confirm, not as a crowded match', async () => {
    respondWith({ data: result(SINGLE_CANDIDATE) });

    await ask("What are Suresh Kohli's career statistics?");

    expect(screen.getByText(/Did you mean/)).toBeInTheDocument();
    expect(screen.queryByText(/More than one entry matches/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'V Kohli' })).toHaveAttribute(
      'href',
      '/participants/8452',
    );
  });

  it('still reads as a crowded match when there are several', async () => {
    respondWith({
      data: result({
        ...SINGLE_CANDIDATE,
        nameHint: 'Rahul',
        candidates: [
          { id: '1', displayName: 'KL Rahul' },
          { id: '2', displayName: 'R Dravid' },
        ],
      }),
    });

    await ask('How many runs has Rahul scored?');

    expect(screen.getByText(/More than one entry matches/)).toBeInTheDocument();
    expect(screen.queryByText(/Did you mean/)).not.toBeInTheDocument();
  });
});
