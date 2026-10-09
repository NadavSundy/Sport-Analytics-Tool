import {
  MAX_CONVERSATION_TURNS,
  NATURAL_LANGUAGE_QUESTION_MAX_LENGTH,
  naturalLanguageQueryResponseSchema,
  queryDefinitionEvaluationResponseSchema,
  type AnalyticsQueryDefinition,
  type NaturalLanguageQueryResult,
  type QueryDefinitionEvaluation,
  type QuerySuggestion,
} from '@sport-analytics/contracts';
import { ApiResponseError } from '../../api/client';
import { ApiContractError, postPublicApi } from '../../api/public-read';

/**
 * Asks the public natural-language endpoint one question.
 *
 * Every failure is turned into a named outcome here rather than in the component,
 * so the dialog renders a message for a case it recognises instead of deciding
 * what a status code means. The nine the endpoint can return are all represented:
 * nothing falls through to a generic error.
 */

export const MAX_QUESTION_LENGTH = NATURAL_LANGUAGE_QUESTION_MAX_LENGTH;
export const MAX_TURNS = MAX_CONVERSATION_TURNS;

/**
 * One earlier turn, as the issue #868 request contract defines it: the question
 * that was asked and the definition it was read as. The definition is taken from
 * that turn's own `evaluation.definition`, never rebuilt here, so what is sent
 * back is what the backend already validated.
 */
export interface ConversationTurn {
  question: string;
  definition: AnalyticsQueryDefinition;
}

export type AskFailure =
  | { kind: 'not_understood' }
  | { kind: 'invalid'; message: string }
  | { kind: 'rate_limited'; retryAfterSeconds: number | undefined }
  | { kind: 'quota_reached'; retryAfterSeconds: number | undefined }
  | { kind: 'service_busy'; retryAfterSeconds: number | undefined }
  | { kind: 'unavailable' }
  | { kind: 'network' };

export class AskQuestionError extends Error {
  constructor(readonly failure: AskFailure) {
    super(`The question could not be answered (${failure.kind}).`);
    this.name = 'AskQuestionError';
  }
}

function failureFor(error: ApiResponseError): AskFailure {
  if (error.status === 422) {
    return error.code === 'QUERY_NOT_UNDERSTOOD'
      ? { kind: 'not_understood' }
      : { kind: 'invalid', message: error.message };
  }

  if (error.status === 429) {
    const retryAfterSeconds = error.retryAfterSeconds;
    if (error.code === 'GLOBAL_DAILY_LIMIT_REACHED') {
      return { kind: 'service_busy', retryAfterSeconds };
    }
    return error.code === 'QUOTA_EXCEEDED'
      ? { kind: 'quota_reached', retryAfterSeconds }
      : { kind: 'rate_limited', retryAfterSeconds };
  }

  return { kind: 'unavailable' };
}

export async function askQuestion(
  question: string,
  conversation: readonly ConversationTurn[] = [],
  signal?: AbortSignal,
): Promise<NaturalLanguageQueryResult> {
  // Only the most recent turns are sent. The contract caps it at five, and every
  // turn is re-sent on every question, so a long conversation must not grow the
  // request without bound.
  const recent = conversation.slice(-MAX_CONVERSATION_TURNS);
  try {
    const response = await postPublicApi(
      '/natural-language-queries',
      // Omitted rather than sent empty, so a first question is byte-for-byte the
      // request this endpoint has always received.
      recent.length > 0 ? { question, conversation: recent } : { question },
      naturalLanguageQueryResponseSchema,
      signal,
    );
    return response.data;
  } catch (error) {
    if (error instanceof ApiResponseError) {
      throw new AskQuestionError(failureFor(error));
    }
    // A response that does not satisfy the contract is not a question the reader
    // can fix, so it is reported as the service being unavailable rather than as
    // their question being wrong.
    if (error instanceof ApiContractError) {
      throw new AskQuestionError({ kind: 'unavailable' });
    }
    throw new AskQuestionError({ kind: 'network' });
  }
}

/**
 * Answers a suggestion the reader clicked.
 *
 * It posts the definition to the public evaluation endpoint, which makes no
 * language-model call and is not subject to the limits on asking a question. A
 * suggestion has already passed the definition contract before it was offered, so
 * this cannot be the first time it is validated.
 */
export async function evaluateDefinition(
  definition: QuerySuggestion,
  signal?: AbortSignal,
): Promise<QueryDefinitionEvaluation> {
  try {
    const response = await postPublicApi(
      '/query-definitions/evaluate',
      definition,
      queryDefinitionEvaluationResponseSchema,
      signal,
    );
    return response.data;
  } catch (error) {
    if (error instanceof ApiResponseError || error instanceof ApiContractError) {
      throw new AskQuestionError({ kind: 'unavailable' });
    }
    throw new AskQuestionError({ kind: 'network' });
  }
}
