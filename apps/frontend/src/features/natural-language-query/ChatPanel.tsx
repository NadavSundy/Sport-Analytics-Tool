import type { QueryDefinitionEvaluation, QuerySuggestion } from '@sport-analytics/contracts';
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ExampleFallback,
  FailureMessage,
  Outcome,
  Suggestions,
  answerFrom,
  type Answer,
} from './AnswerView';
import {
  MAX_QUESTION_LENGTH,
  MAX_TURNS,
  askQuestion,
  AskQuestionError,
  evaluateDefinition,
  type AskFailure,
  type ConversationTurn,
} from './askQuestion';
import { EXAMPLE_QUESTIONS } from './examples';
import { describeDefinition } from './interpretation';

/**
 * The chat panel behind the floating launcher (issue #936).
 *
 * This is the first interface in the product to hold a conversation. The endpoint
 * has accepted one since issue #868 and nothing exercised it: the home-page
 * widget this replaces answered one question at a time and sent no history.
 *
 * The conversation lives in this component's state and nowhere else. It is not
 * written to storage, so closing the panel or reloading the page starts a new
 * one — the questions are the reader's own words and they already reach a third
 * party, so keeping a transcript on their device is a liability rather than a
 * convenience.
 *
 * Every answer is rendered by `AnswerView`, which is the same code the widget
 * used. Nothing about an outcome, a refusal, a suggestion or a failure is decided
 * here.
 */

interface Entry {
  id: number;
  /** The reader's words, or the wording of the suggestion they clicked. */
  question: string;
  /** Absent while the answer is still being worked out. */
  answer?: Answer;
  failure?: AskFailure;
}

/**
 * The turns sent with the next question.
 *
 * Only an entry that was answered contributes one, because a turn is a question
 * *and* the definition it was read as, and a failed question has no definition.
 * `askQuestion` takes the last five.
 */
function turnsFrom(entries: readonly Entry[]): ConversationTurn[] {
  return entries
    .filter((entry): entry is Entry & { answer: Answer } => entry.answer !== undefined)
    .map((entry) => ({
      question: entry.question,
      definition: entry.answer.evaluation.definition,
    }));
}

export function ChatPanel({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const countId = useId();
  const [question, setQuestion] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  // Focus moves into the panel on open, so a keyboard visitor is where the
  // question is typed rather than back at the top of the page.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Newest at the bottom, so the latest answer is what a reader is looking at.
  // Called optionally: scrolling is a convenience, and an environment without
  // `scrollIntoView` (jsdom, for one) must still render the conversation.
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView?.({ block: 'end' });
  }, [entries, pending]);

  const trimmed = question.trim();
  const tooLong = question.length > MAX_QUESTION_LENGTH;
  const canSubmit = trimmed.length > 0 && !tooLong && !pending;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
    }
  }

  function settle(id: number, update: Partial<Entry>) {
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...update } : entry)),
    );
    setPending(false);
  }

  function failureOf(error: unknown): AskFailure {
    return error instanceof AskQuestionError ? error.failure : ({ kind: 'network' } as AskFailure);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    const id = nextId.current++;
    // The history is read before this question joins it, so a question is never
    // sent as prior context for itself.
    const conversation = turnsFrom(entries);
    setEntries((current) => [...current, { id, question: trimmed }]);
    setPending(true);
    setQuestion('');

    void askQuestion(trimmed, conversation)
      .then((result) => settle(id, { answer: answerFrom(result) }))
      .catch((error: unknown) => settle(id, { failure: failureOf(error) }));
  }

  /**
   * Answers a suggestion without asking the model again.
   *
   * The definition is already known and already validated, so it goes straight to
   * the evaluation endpoint. That makes no provider call and spends nothing
   * against the question limits.
   */
  function handleSuggestion(suggestion: QuerySuggestion) {
    const id = nextId.current++;
    const label = describeDefinition(suggestion);
    setEntries((current) => [...current, { id, question: label }]);
    setPending(true);

    void evaluateDefinition(suggestion)
      .then((evaluation: QueryDefinitionEvaluation) =>
        settle(id, { answer: { question: label, evaluation, suggestions: [] } }),
      )
      .catch((error: unknown) => settle(id, { failure: failureOf(error) }));
  }

  function handleNewConversation() {
    setEntries([]);
    setQuestion('');
    setPending(false);
    inputRef.current?.focus();
  }

  const started = entries.length > 0;

  return (
    <div className="chat-panel__overlay" onKeyDown={handleKeyDown}>
      <div aria-labelledby={titleId} aria-modal="true" className="chat-panel" role="dialog">
        <div className="chat-panel__header">
          <h2 id={titleId}>Ask a stats question</h2>
          <div className="chat-panel__header-actions">
            {started ? (
              <button
                className="button button--secondary"
                onClick={handleNewConversation}
                type="button"
              >
                New conversation
              </button>
            ) : null}
            <button className="button button--secondary" onClick={onClose} type="button">
              Close
            </button>
          </div>
        </div>

        <div aria-live="polite" className="chat-panel__transcript" role="log">
          {started ? null : (
            <div className="chat-panel__intro">
              <p>
                Ask about runs, wickets, a player&rsquo;s record or two players side by side. Each
                answer is drawn from the statistics already published here.
              </p>
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
            </div>
          )}

          {entries.map((entry) => (
            <div className="chat-panel__turn" key={entry.id}>
              <p className="chat-panel__question">{entry.question}</p>
              {entry.answer ? (
                <div className="chat-panel__answer">
                  <p className="ask-question__interpretation">
                    Read as:{' '}
                    <strong>{describeDefinition(entry.answer.evaluation.definition)}</strong>
                  </p>
                  <Outcome
                    evaluation={entry.answer.evaluation}
                    assumptions={entry.answer.assumptions}
                  />
                  <Suggestions suggestions={entry.answer.suggestions} onChoose={handleSuggestion} />
                </div>
              ) : null}
              {entry.failure ? (
                <div className="chat-panel__answer">
                  <FailureMessage failure={entry.failure} />
                  {entry.failure.kind === 'not_understood' ? (
                    <ExampleFallback onChoose={setQuestion} />
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
          {pending ? <p className="chat-panel__pending">Working out the answer…</p> : null}
          <div ref={transcriptEndRef} />
        </div>

        <form className="chat-panel__composer" onSubmit={handleSubmit}>
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
            Your question text is sent to Anthropic for processing, with up to {MAX_TURNS} earlier
            questions from this conversation. No cricket data and no account information is sent
            with it. See the <Link to="/privacy">privacy notice</Link>.
          </p>
          <button className="button button--primary" disabled={!canSubmit} type="submit">
            {pending ? 'Asking…' : 'Ask'}
          </button>
        </form>
      </div>
    </div>
  );
}
