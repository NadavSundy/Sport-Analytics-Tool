import type { NaturalLanguageQueryResult } from '@sport-analytics/contracts';
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { AnsweredResult } from './AnsweredResult';
import { MAX_QUESTION_LENGTH, askQuestion, AskQuestionError, type AskFailure } from './askQuestion';
import { EXAMPLE_QUESTIONS } from './examples';
import { describeDefinition, unsupportedMessage } from './interpretation';

/**
 * One question, one answer.
 *
 * This holds no conversation: each question is answered on its own and replaces
 * the last answer, because the endpoint behind it keeps no history and an
 * interface that looked like a chat would promise one. Every answer shows the
 * definition the question was read as before the figures, so a reader can see the
 * interpretation before trusting the result.
 */

interface AskState {
  status: 'idle' | 'loading' | 'answered' | 'failed';
  result?: NaturalLanguageQueryResult;
  failure?: AskFailure;
}

function retryWording(seconds: number | undefined): string {
  if (seconds === undefined) {
    return 'Please try again shortly.';
  }
  if (seconds < 90) {
    return `Please try again in ${seconds} second${seconds === 1 ? '' : 's'}.`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `Please try again in about ${minutes} minute${minutes === 1 ? '' : 's'}.`;
}

function FailureMessage({ failure }: { failure: AskFailure }) {
  if (failure.kind === 'not_understood') {
    return (
      <div className="ask-question__message" role="status">
        <p>That question could not be turned into a query over the published statistics.</p>
        <p>Try rephrasing it, or start from one of the examples above.</p>
      </div>
    );
  }

  if (failure.kind === 'invalid') {
    return (
      <div className="ask-question__message" role="status">
        <p>{failure.message}</p>
      </div>
    );
  }

  if (failure.kind === 'rate_limited' || failure.kind === 'quota_reached') {
    return (
      <div className="ask-question__message" role="status">
        <p>You have asked a lot of questions. {retryWording(failure.retryAfterSeconds)}</p>
      </div>
    );
  }

  if (failure.kind === 'service_busy') {
    return (
      <div className="ask-question__message" role="status">
        <p>
          The service has answered as many questions as it can today.{' '}
          {failure.retryAfterSeconds === undefined
            ? 'Please try again tomorrow.'
            : retryWording(failure.retryAfterSeconds)}
        </p>
        <p>The published statistics pages remain available.</p>
      </div>
    );
  }

  if (failure.kind === 'network') {
    return (
      <div className="ask-question__message" role="status">
        <p>The question could not be sent. Check your connection and try again.</p>
      </div>
    );
  }

  return (
    <div className="ask-question__message" role="status">
      <p>Asking questions is temporarily unavailable. Please try again shortly.</p>
      <p>The published statistics pages remain available.</p>
    </div>
  );
}

function Outcome({ result }: { result: NaturalLanguageQueryResult }) {
  const { evaluation } = result;

  if (evaluation.outcome === 'unsupported') {
    return (
      <div className="ask-question__message">
        <p>{unsupportedMessage(evaluation.reason)}</p>
      </div>
    );
  }

  if (evaluation.outcome === 'entity_not_found') {
    return (
      <div className="ask-question__message">
        <p>
          Nothing published here matches <strong>{evaluation.nameHint}</strong>.
        </p>
        <p>Check the spelling, or browse the published players and competitions.</p>
      </div>
    );
  }

  if (evaluation.outcome === 'entity_ambiguous') {
    return (
      <div className="ask-question__message">
        <p>
          More than one entry matches <strong>{evaluation.nameHint}</strong>. Choose the one you
          meant:
        </p>
        <ul className="ask-question__candidates">
          {evaluation.candidates.map((candidate) => (
            <li key={candidate.id}>
              <Link
                to={
                  evaluation.reference === 'competition'
                    ? `/competitions/${encodeURIComponent(candidate.id)}`
                    : `/participants/${encodeURIComponent(candidate.id)}`
                }
              >
                {candidate.displayName}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return <AnsweredResult result={result} />;
}

export function AskQuestionDialog({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const countId = useId();
  const [question, setQuestion] = useState('');
  const [state, setState] = useState<AskState>({ status: 'idle' });
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus moves into the dialog on open, so a keyboard visitor is where the
  // question is typed rather than back at the top of the page.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const trimmed = question.trim();
  const tooLong = question.length > MAX_QUESTION_LENGTH;
  const canSubmit = trimmed.length > 0 && !tooLong && state.status !== 'loading';

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setState({ status: 'loading' });
    void askQuestion(trimmed)
      .then((result) => setState({ status: 'answered', result }))
      .catch((error: unknown) => {
        const failure =
          error instanceof AskQuestionError ? error.failure : ({ kind: 'network' } as AskFailure);
        setState({ status: 'failed', failure });
      });
  }

  return (
    <div className="ask-question__overlay" onKeyDown={handleKeyDown}>
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="ask-question__dialog"
        ref={panelRef}
        role="dialog"
      >
        <div className="ask-question__dialog-header">
          <h2 id={titleId}>Ask a stats question</h2>
          <button className="button button--secondary" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <p className="ask-question__examples-label">For example:</p>
        <ul className="ask-question__examples">
          {EXAMPLE_QUESTIONS.map((example) => (
            <li key={example.question}>
              <button onClick={() => setQuestion(example.question)} type="button">
                {example.question}
              </button>
            </li>
          ))}
        </ul>

        <form onSubmit={handleSubmit}>
          <label htmlFor={`${titleId}-input`}>Your question</label>
          <textarea
            aria-describedby={countId}
            id={`${titleId}-input`}
            maxLength={MAX_QUESTION_LENGTH}
            onChange={(event) => setQuestion(event.target.value)}
            ref={inputRef}
            rows={2}
            value={question}
          />
          <p className="ask-question__count" id={countId}>
            {question.length} of {MAX_QUESTION_LENGTH} characters
          </p>
          {/* ADR-017: the question text leaves this platform, so it is said before
              the first question rather than after it. */}
          <p className="ask-question__disclosure">
            Your question text is sent to Anthropic for processing. No cricket data and no account
            information is sent with it. See the <Link to="/privacy">privacy notice</Link>.
          </p>
          <button className="button button--primary" disabled={!canSubmit} type="submit">
            {state.status === 'loading' ? 'Asking…' : 'Ask'}
          </button>
        </form>

        <div aria-live="polite" className="ask-question__result" role="region">
          {state.status === 'loading' ? <p>Working out the answer…</p> : null}
          {state.status === 'answered' && state.result ? (
            <>
              <p className="ask-question__interpretation">
                Read as: <strong>{describeDefinition(state.result.evaluation.definition)}</strong>
              </p>
              <Outcome result={state.result} />
            </>
          ) : null}
          {state.status === 'failed' && state.failure ? (
            <FailureMessage failure={state.failure} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
