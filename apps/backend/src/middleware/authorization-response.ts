import type { Response } from 'express';

export function rejectAuthorization(response: Response): void {
  response.status(403).json({
    error: {
      code: 'FORBIDDEN',
      message: 'The authenticated account is not permitted to perform this operation.',
    },
  });
}
