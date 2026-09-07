/**
 * Create a deterministic, entirely fictional T20 corpus for local performance
 * measurements.  The files use the Cricsheet JSON shape so the normal importer
 * exercises the same database path as a source dataset.
 *
 * Usage: node scripts/generate-representative-corpus.mjs [--fixtures 300] [--output data/performance/representative-t20]
 */
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DEFAULT_FIXTURES = 300;
const DELIVERIES_PER_FIXTURE = 240;

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : (process.argv[index + 1] ?? fallback);
}

function positiveInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

function players(prefix) {
  return Array.from({ length: 11 }, (_, index) => `${prefix} Player ${index + 1}`);
}

const north = players('North');
const south = players('South');
const allPlayers = [...north, ...south];
const registry = Object.fromEntries(
  allPlayers.map((name, index) => [name, `fictional-perf-player-${index + 1}`]),
);

function delivery(innings, over, ball) {
  const batting = innings === 0 ? north : south;
  const bowling = innings === 0 ? south : north;
  const striker = batting[(over * 6 + ball) % batting.length];
  const nonStriker = batting[(over * 6 + ball + 1) % batting.length];
  const bowler = bowling[(over + Math.floor(ball / 2)) % bowling.length];
  const runs = (over * 7 + ball * 3 + innings) % 7;

  return {
    batter: striker,
    bowler,
    non_striker: nonStriker,
    runs: { batter: runs, extras: 0, total: runs },
  };
}

function fixture(index) {
  const date = `2025-${String(Math.floor(index / 28) + 1).padStart(2, '0')}-${String((index % 28) + 1).padStart(2, '0')}`;
  const innings = [north, south].map((team, inningsIndex) => ({
    team: inningsIndex === 0 ? 'North XI' : 'South XI',
    overs: Array.from({ length: 20 }, (_, over) => ({
      over,
      deliveries: Array.from({ length: 6 }, (_, ball) => delivery(inningsIndex, over, ball)),
    })),
  }));

  return {
    meta: { data_version: '1.0.0', revision: 1 },
    info: {
      balls_per_over: 6,
      city: 'Fictional City',
      dates: [date],
      event: { name: 'Representative Performance T20', match_number: index + 1 },
      gender: 'male',
      match_type: 'T20',
      outcome: { winner: index % 2 === 0 ? 'North XI' : 'South XI', by: { runs: 12 } },
      overs: 20,
      player_of_match: [north[index % north.length]],
      players: { 'North XI': north, 'South XI': south },
      registry: { people: registry },
      season: '2025/26',
      team_type: 'club',
      teams: ['North XI', 'South XI'],
      toss: { decision: 'bat', winner: index % 2 === 0 ? 'North XI' : 'South XI' },
      venue: 'Representative Ground',
    },
    innings,
  };
}

async function main() {
  const fixtureCount = positiveInteger(
    argument('--fixtures', String(DEFAULT_FIXTURES)),
    '--fixtures',
  );
  const output = resolve(argument('--output', 'data/performance/representative-t20'));
  await mkdir(output, { recursive: true });
  if ((await readdir(output)).length > 0) {
    throw new Error(`Refusing to overwrite non-empty output directory: ${output}`);
  }

  for (let index = 0; index < fixtureCount; index += 1) {
    const filename = `representative-t20-${String(index + 1).padStart(3, '0')}.json`;
    await writeFile(resolve(output, filename), `${JSON.stringify(fixture(index), null, 2)}\n`);
  }

  const manifest = {
    generatedBy: 'scripts/generate-representative-corpus.mjs',
    fictional: true,
    fixtureCount,
    deliveriesPerFixture: DELIVERIES_PER_FIXTURE,
    deliveryCount: fixtureCount * DELIVERIES_PER_FIXTURE,
    sourceReferencePrefix: 'representative-t20-',
  };
  await writeFile(resolve(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(
    `Generated ${fixtureCount} fictional fixtures and ${manifest.deliveryCount} deliveries in ${output}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
