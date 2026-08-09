import { z } from 'zod';

import { decodeOpaqueValue, encodeOpaqueValue } from './opaque-value';

export class InvalidCursorError extends Error {
  constructor() {
    super('The pagination cursor is invalid.');
    this.name = 'InvalidCursorError';
  }
}

export function createCursor(value: unknown): string {
  return encodeOpaqueValue(value);
}

export function readCursor<T>(value: string | undefined, schema: z.ZodType<T>): T | undefined {
  if (!value) {
    return undefined;
  }

  const decoded = decodeOpaqueValue(value, schema);

  if (!decoded) {
    throw new InvalidCursorError();
  }

  return decoded;
}
