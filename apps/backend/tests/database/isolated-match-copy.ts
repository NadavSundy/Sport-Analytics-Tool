import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

interface CricsheetMatch {
  info: {
    registry?: { people?: Record<string, string> };
    teams?: string[];
    players?: Record<string, string[]>;
    supersubs?: Record<string, string>;
    toss?: { winner?: string };
    outcome?: { winner?: string; eliminator?: string };
    event?: { name?: string };
    venue?: string;
  };
  innings?: Array<{
    team?: string;
    overs?: Array<{ deliveries: Array<{ review?: { by?: string } }> }>;
  }>;
}

/**
 * Writes a copy of a Cricsheet match whose people, teams, venue and competition
 * belong to the calling test alone, and returns its path (issue #592).
 *
 * Ingest upserts people, teams, venues and competitions and advances the
 * statistics versions of everyone it adds, holding those row locks until the
 * test's transaction ends. Database test files run in parallel, so two files
 * ingesting the same seed wait on each other's locks. Prefixing every such
 * identity keeps the cricket, and therefore every figure, unchanged while the
 * rows the ingest locks are the test's own.
 */
export function isolatedMatchCopy(seedPath: string, prefix: string): string {
  const match = JSON.parse(readFileSync(seedPath, 'utf8')) as CricsheetMatch;
  const team = (name: string | undefined) => (name === undefined ? name : `${prefix} ${name}`);
  const info = match.info;

  if (info.registry?.people) {
    info.registry.people = Object.fromEntries(
      Object.entries(info.registry.people).map(([name, ref]) => [name, `${prefix}:${ref}`]),
    );
  }
  info.teams = info.teams?.map((name) => team(name)!);
  if (info.players) {
    info.players = Object.fromEntries(
      Object.entries(info.players).map(([name, players]) => [team(name)!, players]),
    );
  }
  if (info.supersubs) {
    info.supersubs = Object.fromEntries(
      Object.entries(info.supersubs).map(([name, player]) => [team(name)!, player]),
    );
  }
  if (info.toss?.winner) info.toss.winner = team(info.toss.winner);
  if (info.outcome?.winner) info.outcome.winner = team(info.outcome.winner);
  if (info.outcome?.eliminator) info.outcome.eliminator = team(info.outcome.eliminator);
  if (info.event?.name) info.event.name = `${prefix} ${info.event.name}`;
  if (info.venue) info.venue = `${prefix} ${info.venue}`;
  for (const innings of match.innings ?? []) {
    innings.team = team(innings.team);
    for (const over of innings.overs ?? []) {
      for (const delivery of over.deliveries) {
        if (delivery.review?.by) delivery.review.by = team(delivery.review.by);
      }
    }
  }

  const directory = mkdtempSync(join(tmpdir(), 'isolated-match-'));
  const path = join(directory, basename(seedPath));
  writeFileSync(path, JSON.stringify(match));
  return path;
}
