import { z } from 'zod';

export function encodeOpaqueValue(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

export function decodeOpaqueValue<T>(value: string, schema: z.ZodType<T>): T | null {
  try {
    const decoded = Buffer.from(value, 'base64url').toString('utf8');

    const parsed: unknown = JSON.parse(decoded);
    const result = schema.safeParse(parsed);

    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
