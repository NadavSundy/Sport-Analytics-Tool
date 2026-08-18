import { createHash } from 'node:crypto';

export function hashAuthenticationSubject(subject: string): string {
  return createHash('sha256').update(subject, 'utf8').digest('hex');
}
