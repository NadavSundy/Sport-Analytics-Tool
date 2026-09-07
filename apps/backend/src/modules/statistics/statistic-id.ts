import { createHash } from 'node:crypto';

/**
 * The separator between identifier parts. NUL cannot appear in a database
 * identifier, a scope name or a season label, so no two distinct part lists can
 * join to the same string.
 */
const PART_SEPARATOR = '\u0000';

/**
 * A stable, opaque identifier for a derived statistic resource.
 *
 * Statistics are calculated on request rather than stored, so a statistic has no
 * database key of its own. The identifier is a deterministic hash of the parts
 * naming the projection, which means replaying the same events preserves every
 * resource reference a client already holds.
 */
export function createStatisticId(parts: readonly string[]): string {
  const digest = createHash('sha256').update(parts.join(PART_SEPARATOR)).digest('base64url');

  return `stat_${digest}`;
}
