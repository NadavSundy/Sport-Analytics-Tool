import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

const CRICSHEET_EXTRA_KEYS = ['wides', 'noballs', 'byes', 'legbyes', 'penalty'] as const;

interface CricsheetDelivery {
  extras?: Partial<Record<(typeof CRICSHEET_EXTRA_KEYS)[number], number>>;
}

interface CricsheetMatch {
  innings: Array<{ overs?: Array<{ deliveries: CricsheetDelivery[] }> }>;
}

/**
 * Writes a copy of a Cricsheet match in which every other delivery states each
 * absent extra as an explicit zero, and returns its path (issue #590).
 *
 * Cricsheet omits zero extras, but the platform accepts `wides: 0` and the rest,
 * and stores them as 0 rather than null. Ingesting this copy gives a fixture
 * that holds both representations while describing exactly the same cricket, so
 * published figures asserted against it must be unchanged. The file keeps the
 * seed's name, so repeated ingestion of the same copy stays idempotent.
 */
export function withExplicitZeroExtras(seedPath: string): string {
  const match = JSON.parse(readFileSync(seedPath, 'utf8')) as CricsheetMatch;
  let position = 0;

  for (const innings of match.innings) {
    for (const over of innings.overs ?? []) {
      for (const delivery of over.deliveries) {
        position += 1;
        if (position % 2 === 1) {
          continue;
        }

        const extras = { ...delivery.extras };
        for (const key of CRICSHEET_EXTRA_KEYS) {
          extras[key] ??= 0;
        }
        delivery.extras = extras;
      }
    }
  }

  const directory = mkdtempSync(join(tmpdir(), 'sport-analytics-explicit-zero-extras-'));
  const copyPath = join(directory, basename(seedPath));
  writeFileSync(copyPath, JSON.stringify(match));
  return copyPath;
}
