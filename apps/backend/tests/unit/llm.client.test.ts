import { describe, expect, it, vi } from 'vitest';
import { ANALYTICS_QUERY_PROMPT_DESCRIPTION } from '@sport-analytics/contracts';

import {
  createLlmClient,
  LlmInvalidOutputError,
  LlmNotConfiguredError,
  LlmTimeoutError,
  LlmUpstreamError,
  type AnalyticsQueryTranslation,
} from '../../src/modules/analytics-query/llm.client';

/**
 * Every test stubs `fetch`. Nothing here reaches the provider, and no test
 * carries a real key: the fixture below is a syntactically plausible placeholder
 * only.
 */
const API_KEY = 'test-placeholder-not-a-real-key';
const MODEL = 'claude-haiku-4-5-20251001';
const QUESTION = 'Who scored the most runs in the 2026 Indian Premier League?';

const DEFINITION = {
  kind: 'leaderboard',
  metric: 'most_runs',
  scope: 'season',
  season: { competitionName: 'Indian Premier League', seasonLabel: '2026' },
  limit: 10,
};

// Since issue #851 the provider returns a definition inside a wrapper that may
// also carry suggestions, so a definition arrives as `{ definition }`.
function messageBody(definition: unknown, usage = { input_tokens: 2_000, output_tokens: 150 }) {
  return {
    id: 'msg_test',
    model: MODEL,
    stop_reason: 'end_turn',
    content: [{ type: 'text', text: JSON.stringify({ definition }) }],
    usage,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function client(
  fetchImplementation: typeof fetch,
  overrides: { apiKey?: string | undefined } = {},
) {
  return createLlmClient({
    apiKey: 'apiKey' in overrides ? overrides.apiKey : API_KEY,
    model: MODEL,
    timeoutMs: 15_000,
    fetchImplementation,
  });
}

/** A fetch stub whose request is aborted, as the timeout does. */
function abortingFetch(): typeof fetch {
  return vi.fn(async (_input: unknown, init?: RequestInit) => {
    await new Promise((resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }));
      });
      setTimeout(resolve, 5_000);
    });
    return jsonResponse(messageBody(DEFINITION));
  }) as unknown as typeof fetch;
}

describe('analytics query LLM adapter', () => {
  it('returns the validated definition, the model and token usage', async () => {
    const fetchStub = vi.fn(async () => jsonResponse(messageBody(DEFINITION)));

    // Typed as the published shape, so a later issue can meter spend from it.
    const result: AnalyticsQueryTranslation = await client(
      fetchStub as unknown as typeof fetch,
    ).translateQuestion(QUESTION);

    expect(result.definition).toEqual(DEFINITION);
    expect(result.model).toBe(MODEL);
    expect(result.usage).toEqual({ inputTokens: 2_000, outputTokens: 150 });
    expect(fetchStub).toHaveBeenCalledTimes(1);
  });

  it('raises the not-configured error without calling the provider', async () => {
    const fetchStub = vi.fn();

    await expect(
      client(fetchStub as unknown as typeof fetch, { apiKey: undefined }).translateQuestion(
        QUESTION,
      ),
    ).rejects.toBeInstanceOf(LlmNotConfiguredError);

    expect(fetchStub).not.toHaveBeenCalled();
  });

  it('raises a timeout error after one retry when the request never completes', async () => {
    const fetchStub = abortingFetch();

    await expect(
      createLlmClient({
        apiKey: API_KEY,
        model: MODEL,
        // Far below the configured floor, so the test does not wait on a real bound.
        timeoutMs: 20,
        fetchImplementation: fetchStub,
      }).translateQuestion(QUESTION),
    ).rejects.toBeInstanceOf(LlmTimeoutError);

    expect(fetchStub).toHaveBeenCalledTimes(2);
  });

  it('retries once on a retryable 5xx and returns the second response', async () => {
    const fetchStub = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'overloaded' }, 529))
      .mockResolvedValueOnce(jsonResponse(messageBody(DEFINITION)));

    const result = await client(fetchStub as unknown as typeof fetch).translateQuestion(QUESTION);

    expect(result.definition).toEqual(DEFINITION);
    expect(fetchStub).toHaveBeenCalledTimes(2);
  });

  it('raises an upstream error carrying the status when both attempts fail', async () => {
    const fetchStub = vi.fn(async () => jsonResponse({ error: 'server' }, 503));

    const rejection = await client(fetchStub as unknown as typeof fetch)
      .translateQuestion(QUESTION)
      .then(
        () => undefined,
        (error: unknown) => error,
      );

    expect(rejection).toBeInstanceOf(LlmUpstreamError);
    expect((rejection as LlmUpstreamError).status).toBe(503);
    expect(fetchStub).toHaveBeenCalledTimes(2);
  });

  it.each([400, 401, 403, 404, 422])('does not retry a non-retryable %i', async (status) => {
    const fetchStub = vi.fn(async () => jsonResponse({ error: 'client' }, status));

    await expect(
      client(fetchStub as unknown as typeof fetch).translateQuestion(QUESTION),
    ).rejects.toBeInstanceOf(LlmUpstreamError);

    expect(fetchStub).toHaveBeenCalledTimes(1);
  });

  it('retries a 408 and a 429', async () => {
    for (const status of [408, 429]) {
      const fetchStub = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ error: 'retryable' }, status))
        .mockResolvedValueOnce(jsonResponse(messageBody(DEFINITION)));

      await client(fetchStub as unknown as typeof fetch).translateQuestion(QUESTION);

      expect(fetchStub).toHaveBeenCalledTimes(2);
    }
  });

  it('raises an upstream error when the response body is not JSON', async () => {
    const fetchStub = vi.fn(async () => new Response('<html>gateway</html>', { status: 200 }));

    await expect(
      client(fetchStub as unknown as typeof fetch).translateQuestion(QUESTION),
    ).rejects.toBeInstanceOf(LlmUpstreamError);
  });

  it('raises an upstream error when the response carries no text content', async () => {
    const fetchStub = vi.fn(async () =>
      jsonResponse({ id: 'msg_test', model: MODEL, content: [], usage: {} }),
    );

    await expect(
      client(fetchStub as unknown as typeof fetch).translateQuestion(QUESTION),
    ).rejects.toBeInstanceOf(LlmUpstreamError);
  });

  it('raises the invalid-output error when the returned text is not JSON', async () => {
    const fetchStub = vi.fn(async () =>
      jsonResponse({
        id: 'msg_test',
        model: MODEL,
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'I think the answer is Quinton de Kock.' }],
        usage: { input_tokens: 10, output_tokens: 10 },
      }),
    );

    await expect(
      client(fetchStub as unknown as typeof fetch).translateQuestion(QUESTION),
    ).rejects.toBeInstanceOf(LlmInvalidOutputError);
  });

  it('raises the invalid-output error when the definition fails the contract', async () => {
    const fetchStub = vi.fn(async () =>
      // A career scope may not carry a season reference (issue #811).
      jsonResponse(
        messageBody({
          kind: 'participant_statistics',
          participant: { name: 'Quinton de Kock' },
          scope: 'career',
          season: { competitionName: 'Indian Premier League', seasonLabel: '2026' },
        }),
      ),
    );

    await expect(
      client(fetchStub as unknown as typeof fetch).translateQuestion(QUESTION),
    ).rejects.toBeInstanceOf(LlmInvalidOutputError);
  });

  it('fails closed on a differently cased enum value rather than normalising it', async () => {
    const fetchStub = vi.fn(async () =>
      jsonResponse(messageBody({ ...DEFINITION, metric: 'Most_Runs' })),
    );

    await expect(
      client(fetchStub as unknown as typeof fetch).translateQuestion(QUESTION),
    ).rejects.toBeInstanceOf(LlmInvalidOutputError);
  });

  it('raises the invalid-output error on a refusal and on a truncated response', async () => {
    for (const stopReason of ['refusal', 'max_tokens']) {
      const fetchStub = vi.fn(async () =>
        jsonResponse({ ...messageBody(DEFINITION), stop_reason: stopReason }),
      );

      await expect(
        client(fetchStub as unknown as typeof fetch).translateQuestion(QUESTION),
      ).rejects.toBeInstanceOf(LlmInvalidOutputError);
    }
  });

  it('does not retry an invalid output', async () => {
    const fetchStub = vi.fn(async () => jsonResponse(messageBody({ kind: 'nonsense' })));

    await expect(
      client(fetchStub as unknown as typeof fetch).translateQuestion(QUESTION),
    ).rejects.toBeInstanceOf(LlmInvalidOutputError);

    expect(fetchStub).toHaveBeenCalledTimes(1);
  });
});

describe('analytics query LLM request', () => {
  async function capturedRequest(): Promise<{
    url: string;
    headers: Headers;
    body: Record<string, unknown>;
  }> {
    let captured: { url: string; headers: Headers; body: Record<string, unknown> } | undefined;

    const fetchStub = vi.fn(async (input: unknown, init?: RequestInit) => {
      captured = {
        url: String(input),
        headers: new Headers(init?.headers),
        body: JSON.parse(String(init?.body)) as Record<string, unknown>,
      };
      return jsonResponse(messageBody(DEFINITION));
    });

    await client(fetchStub as unknown as typeof fetch).translateQuestion(QUESTION);

    if (!captured) throw new Error('The adapter did not call fetch.');
    return captured;
  }

  it('posts to the Messages API with the versioned key headers', async () => {
    const request = await capturedRequest();

    expect(request.url).toBe('https://api.anthropic.com/v1/messages');
    expect(request.headers.get('x-api-key')).toBe(API_KEY);
    expect(request.headers.get('anthropic-version')).toBe('2023-06-01');
    expect(request.headers.get('content-type')).toBe('application/json');
  });

  it('builds the system prompt from the contract description', async () => {
    const request = await capturedRequest();

    expect(String(request.body.system)).toContain(ANALYTICS_QUERY_PROMPT_DESCRIPTION);
  });

  it('sends the question in the user turn, delimited as data', async () => {
    const request = await capturedRequest();
    const messages = request.body.messages as { role: string; content: string }[];

    expect(messages).toHaveLength(1);
    expect(messages[0]?.role).toBe('user');
    expect(messages[0]?.content).toContain(QUESTION);
    expect(messages[0]?.content).not.toBe(QUESTION);
  });

  it('constrains the response to the analytics query JSON Schema', async () => {
    const request = await capturedRequest();
    const outputConfig = request.body.output_config as { format?: { type?: string } };

    expect(outputConfig.format?.type).toBe('json_schema');
    expect(outputConfig.format).toHaveProperty('schema');
  });

  // Sending neither keeps the model configurable: a current Sonnet-class model
  // rejects `temperature`, and `effort` is not supported on Haiku 4.5.
  it('sends no temperature and no effort', async () => {
    const request = await capturedRequest();

    expect(request.body).not.toHaveProperty('temperature');
    expect(request.body).not.toHaveProperty('top_p');
    expect(request.body).not.toHaveProperty('top_k');
    expect(request.body).not.toHaveProperty('thinking');
    expect(request.body.output_config as Record<string, unknown>).not.toHaveProperty('effort');
  });

  it('bounds the output with a small max_tokens', async () => {
    const request = await capturedRequest();

    expect(request.body.max_tokens).toBe(512);
  });

  // The prompt is the schema description and the reader's question. Cricket data
  // is never sent: the definition is resolved and executed after this call.
  it('sends only the model, the bound, the prompt, the question and the schema', async () => {
    const request = await capturedRequest();

    expect(Object.keys(request.body).sort()).toEqual([
      'max_tokens',
      'messages',
      'model',
      'output_config',
      'system',
    ]);
  });

  // Domain words such as "innings" do appear, because the contract description
  // explains the vocabulary. Database content would look different: a column, a
  // table, a stored identifier or a statement.
  it('sends no database content', async () => {
    const request = await capturedRequest();
    const serialised = JSON.stringify(request.body);

    for (const forbidden of [
      'delivery_current',
      'innings_id',
      'fixture_id',
      'person_id',
      'participant_id',
      'competition_id',
      'submission_id',
      'SELECT ',
      'postgres',
    ]) {
      expect(serialised).not.toContain(forbidden);
    }
  });

  // The system prompt is the contract description plus a fixed framing sentence.
  // The framing carries no numbers, so any digit in the prompt came from the
  // contract itself rather than from data this adapter added.
  it('adds only fixed framing text to the contract description', async () => {
    const request = await capturedRequest();
    const system = String(request.body.system);

    expect(system).toContain(ANALYTICS_QUERY_PROMPT_DESCRIPTION);
    expect(system.replace(ANALYTICS_QUERY_PROMPT_DESCRIPTION, '')).not.toMatch(/\d/);
  });
});

describe('suggestions (issue #851)', () => {
  const LEADERBOARD = {
    kind: 'leaderboard',
    metric: 'most_runs',
    scope: 'competition',
    competition: { name: 'Indian Premier League' },
  };
  const UNSUPPORTED = { kind: 'unsupported', reason: 'ambiguous' };

  function translating(body: unknown) {
    return vi.fn(async () =>
      jsonResponse({
        model: MODEL,
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: JSON.stringify(body) }],
        usage: { input_tokens: 10, output_tokens: 5 },
      }),
    );
  }

  it('asks the provider for the translation wrapper, not a bare definition', async () => {
    const fetchImplementation = translating({ definition: UNSUPPORTED });

    await client(fetchImplementation).translateQuestion('who is the best batter?');

    const [, init] = fetchImplementation.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as {
      output_config: { format: { schema: { required: string[] } } };
    };
    expect(body.output_config.format.schema.required).toEqual(['definition']);
  });

  it('returns validated suggestions beside the definition', async () => {
    const translation = await client(
      translating({ definition: UNSUPPORTED, suggestions: [LEADERBOARD] }),
    ).translateQuestion('who is the best batter in the IPL?');

    expect(translation.definition).toEqual(UNSUPPORTED);
    expect(translation.suggestions).toHaveLength(1);
    expect(translation.suggestions[0]).toMatchObject({ kind: 'leaderboard', metric: 'most_runs' });
  });

  it('returns no suggestions when the provider offers none', async () => {
    const translation = await client(translating({ definition: LEADERBOARD })).translateQuestion(
      'most runs in the IPL?',
    );

    expect(translation.suggestions).toEqual([]);
  });

  // One unusable suggestion must not cost the reader the answer.
  it('drops an invalid suggestion and keeps the valid ones', async () => {
    const translation = await client(
      translating({
        definition: UNSUPPORTED,
        suggestions: [
          { kind: 'leaderboard', metric: 'most_sledges', scope: 'competition' },
          LEADERBOARD,
          { kind: 'leaderboard', metric: 'most_runs', scope: 'career' },
        ],
      }),
    ).translateQuestion('who is the best batter in the IPL?');

    expect(translation.definition).toEqual(UNSUPPORTED);
    expect(translation.suggestions).toHaveLength(1);
  });

  it('drops them all when none is valid, rather than failing the answer', async () => {
    const translation = await client(
      translating({
        definition: UNSUPPORTED,
        suggestions: [{ kind: 'sql', query: 'SELECT 1' }, 'most runs', 42, null],
      }),
    ).translateQuestion('who is the best batter?');

    expect(translation.definition).toEqual(UNSUPPORTED);
    expect(translation.suggestions).toEqual([]);
  });

  // A suggested refusal gives the reader nothing to ask.
  it('drops an unsupported suggestion', async () => {
    const translation = await client(
      translating({
        definition: UNSUPPORTED,
        suggestions: [{ kind: 'unsupported', reason: 'venue' }],
      }),
    ).translateQuestion('who is the best batter?');

    expect(translation.suggestions).toEqual([]);
  });

  it('keeps at most three suggestions even when more arrive', async () => {
    const translation = await client(
      translating({
        definition: UNSUPPORTED,
        suggestions: [LEADERBOARD, LEADERBOARD, LEADERBOARD, LEADERBOARD, LEADERBOARD],
      }),
    ).translateQuestion('who is the best batter in the IPL?');

    expect(translation.suggestions).toHaveLength(3);
  });

  it('still rejects a definition the contract refuses, suggestions or not', async () => {
    await expect(
      client(
        translating({
          definition: { kind: 'leaderboard', metric: 'most_sledges', scope: 'competition' },
          suggestions: [LEADERBOARD],
        }),
      ).translateQuestion('a question'),
    ).rejects.toBeInstanceOf(LlmInvalidOutputError);
  });

  it('rejects output that is not the wrapper at all', async () => {
    await expect(
      client(translating(LEADERBOARD)).translateQuestion('most runs in the IPL?'),
    ).rejects.toBeInstanceOf(LlmInvalidOutputError);
  });
});
