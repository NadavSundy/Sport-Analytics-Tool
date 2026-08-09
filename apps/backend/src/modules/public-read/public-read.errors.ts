export type PublicReadInputErrorCode = 'INVALID_CURSOR' | 'INVALID_FILTER';

export class PublicReadInputError extends Error {
  constructor(
    public readonly code: PublicReadInputErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PublicReadInputError';
  }
}
