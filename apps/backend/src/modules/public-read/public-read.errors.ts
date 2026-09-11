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

/**
 * An export would exceed the synchronous bound. The whole export fails, so a
 * short file is never produced without the reader being told.
 */
export class FixtureEventExportTooLargeError extends Error {
  readonly code = 'EXPORT_TOO_LARGE';

  constructor(public readonly maximumEvents: number) {
    super(
      `This export has more than ${maximumEvents} events. Narrow it with an innings, team, player, over or wicket-kind filter.`,
    );
    this.name = 'FixtureEventExportTooLargeError';
  }
}
