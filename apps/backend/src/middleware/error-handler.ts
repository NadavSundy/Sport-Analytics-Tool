import type { ErrorRequestHandler } from 'express';

import { DatabaseAccessError } from '../database/errors';

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (response.headersSent) {
    _next(error);
    return;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'entity.too.large'
  ) {
    response.status(413).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'The request payload exceeds the 1 MB limit.',
      },
    });
    return;
  }

  if (
    error instanceof SyntaxError &&
    typeof error === 'object' &&
    'type' in error &&
    error.type === 'entity.parse.failed'
  ) {
    response.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'The request body is not valid JSON.',
      },
    });
    return;
  }

  // A cancelled statement is a temporary condition rather than a defect, so it
  // is reported as retryable instead of as an internal error. Every other
  // database failure keeps its existing 500: those are not known to be
  // retryable and reclassifying them is not this change.
  if (error instanceof DatabaseAccessError && error.code === 'DATABASE_STATEMENT_TIMEOUT') {
    response.status(503).json({
      error: {
        code: 'DATABASE_STATEMENT_TIMEOUT',
        message: 'The request exceeded the database time limit. Please retry.',
      },
    });
    return;
  }

  const message = error instanceof Error ? error.message : 'Unknown error';

  response.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected server error occurred.',
    },
  });

  // Replace this temporary console output with the central logger once observability is configured.
  console.error(message);
};
