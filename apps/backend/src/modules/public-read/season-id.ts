import { z } from 'zod';

import { decodeOpaqueValue, encodeOpaqueValue } from './opaque-value';

const seasonIdentitySchema = z.object({
  competitionId: z.string().min(1),
  label: z.string().min(1),
});

export interface SeasonIdentity {
  competitionId: string;
  label: string;
}

const SEASON_PREFIX = 'season_';

export function createSeasonId(identity: SeasonIdentity): string {
  return `${SEASON_PREFIX}${encodeOpaqueValue(identity)}`;
}

export function parseSeasonId(seasonId: string): SeasonIdentity | null {
  if (!seasonId.startsWith(SEASON_PREFIX)) {
    return null;
  }

  return decodeOpaqueValue(seasonId.slice(SEASON_PREFIX.length), seasonIdentitySchema);
}
