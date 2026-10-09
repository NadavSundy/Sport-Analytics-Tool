import type {
  NaturalLanguageQueryResult,
  QueryDefinitionEvaluation,
  QuerySuggestion,
} from '@sport-analytics/contracts';
import { Link } from 'react-router-dom';
import { AnsweredResult } from './AnsweredResult';
import type { AskFailure } from './askQuestion';
import { EXAMPLE_QUESTIONS } from './examples';
import { describeDefinition, referenceNoun, unsupportedMessage } from './interpretation';

/**
 * How one question's answer is rendered.
 *
 * Moved out of `AskQuestionDialog` under issue #936 so the chat panel renders an
 * answer exactly as the home-page widget did. The code is unchanged: the
 * behaviour a reader sees for an outcome, a refusal, a suggestion or a failure is
 * the behaviour the issue #816, #851 and #868 tests already pin down, and this is
 * the only copy of it.
 */

export interface Answer {
  /** The reader's words, or the wording of the suggestion they clicked. */
  question: string;
  evaluation: QueryDefinitionEvaluation;
  suggestions: QuerySuggestion[];
  /**
   * Which reference the translation filled in, when the reader named none. Absent
   * on a suggestion, which the reader chose with its scope already shown.
   */
  assumptions?: NaturalLanguageQueryResult['assumptions'];
}

export function answerFrom(result: NaturalLanguageQueryResult): Answer {
  return {
    question: result.question,
    evaluation: result.evaluation,
    suggestions: result.suggestions ?? [],
    ...(result.assumptions ? { assumptions: result.assumptions } : {}),
  };
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

export function FailureMessage({ failure }: { failure: AskFailure }) {
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

export function Outcome({
  evaluation,
  assumptions,
}: {
  evaluation: QueryDefinitionEvaluation;
  assumptions?: NaturalLanguageQueryResult['assumptions'];
}) {
  if (evaluation.outcome === 'unsupported') {
    return (
      <div className="ask-question__message">
        <p>{unsupportedMessage(evaluation.reason)}</p>
        {/* Issue #940: a match question is refused as `other`, and the fixtures
            pages are where a reader finds what they asked for. The pointer is
            attached to that reason alone — a refusal about a dimension the
            platform does not record is not helped by it. */}
        {evaluation.reason === 'other' ? (
          <p>
            For one match &mdash; who won, the score, the margin &mdash; see the{' '}
            <Link to="/fixtures">fixtures pages</Link>.
          </p>
        ) : null}
      </div>
    );
  }

  if (evaluation.outcome === 'entity_not_found') {
    // Issue #940: naming the kind of thing that was not found is what makes this
    // actionable. A competition the platform does not hold and a misspelt player
    // read identically otherwise, and they lead somewhere different.
    const noun = referenceNoun(evaluation.reference);

    return (
      <div className="ask-question__message">
        <p>
          No {noun.singular} published here matches <strong>{evaluation.nameHint}</strong>.
        </p>
        <p>Check the spelling, or browse the published {noun.plural}.</p>
      </div>
    );
  }

  if (evaluation.outcome === 'entity_ambiguous') {
    // One candidate is a real outcome since issue #868: a name resolved by
    // surname alone, whose initial does not agree with what the reader wrote, is
    // offered for confirmation rather than answered. "More than one entry
    // matches" would be untrue there, so the wording follows the count.
    const single = evaluation.candidates.length === 1;

    return (
      <div className="ask-question__message">
        <p>
          {single ? (
            <>
              Nothing published here is spelled <strong>{evaluation.nameHint}</strong>. Did you
              mean:
            </>
          ) : (
            <>
              More than one entry matches <strong>{evaluation.nameHint}</strong>. Choose the one you
              meant:
            </>
          )}
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

  return <AnsweredResult evaluation={evaluation} assumptions={assumptions} />;
}

/**
 * Questions the platform can answer, when the reader's own could not be.
 *
 * Each is worded from its definition by `describeDefinition`, not by the model:
 * a label that does not come over the wire cannot disagree with the definition it
 * describes. Each has already passed the definition contract before being offered.
 */
export function Suggestions({
  onChoose,
  suggestions,
}: {
  onChoose: (suggestion: QuerySuggestion) => void;
  suggestions: QuerySuggestion[];
}) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="ask-question__suggestions">
      <p>Questions this can answer:</p>
      <ul>
        {suggestions.map((suggestion) => (
          <li key={describeDefinition(suggestion)}>
            <button onClick={() => onChoose(suggestion)} type="button">
              {describeDefinition(suggestion)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The fallback when the model's own output was unusable.
 *
 * There is no suggestion to offer in that case — the output that would have
 * carried one is what failed — so the examples stand in. They fill the field
 * rather than being answered directly, because they are questions rather than
 * definitions.
 */
export function ExampleFallback({ onChoose }: { onChoose: (question: string) => void }) {
  return (
    <div className="ask-question__suggestions">
      <p>Questions this can answer:</p>
      <ul>
        {EXAMPLE_QUESTIONS.map((example) => (
          <li key={example.question}>
            <button onClick={() => onChoose(example.question)} type="button">
              {example.question}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
