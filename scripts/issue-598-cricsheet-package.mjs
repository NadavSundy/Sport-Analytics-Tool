import { readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function sourceId(value) {
  return `cricsheet:participant:${value}`;
}

function participant(name, team, people) {
  const sourceRef = people?.[name];
  return {
    ...(sourceRef ? { sourceId: sourceId(sourceRef) } : {}),
    context: { name, team: { context: { name: team } } },
  };
}

function extras(sourceExtras = {}) {
  const names = {
    wides: 'wides',
    noballs: 'noBalls',
    byes: 'byes',
    legbyes: 'legByes',
    penalty: 'penalty',
  };
  return Object.fromEntries(
    Object.entries(sourceExtras)
      .filter(([, value]) => Number.isInteger(value) && value > 0)
      .map(([name, value]) => [names[name] ?? name, value]),
  );
}

function wickets(sourceWickets = [], battingTeam, fieldingTeam, people) {
  return sourceWickets.map((wicket) => ({
    kind: wicket.kind,
    playerOut: participant(wicket.player_out, battingTeam, people),
    fielders: (wicket.fielders ?? []).map((fielder) => ({
      participant: participant(fielder.name, fieldingTeam, people),
    })),
  }));
}

/** Converts one Cricsheet JSON match into the repository's batch-package shape. */
export function convertCricsheetFixture(source, fixtureId) {
  const info = source.info;
  const [firstTeam, secondTeam] = info.teams;
  const people = info.registry?.people;
  const date = info.dates[0];
  const winner = info.outcome?.winner;
  const outcome = winner ? 'won' : info.outcome?.result === 'tie' ? 'tie' : 'no result';

  return {
    contractVersion: '1.1',
    packageId: `cricsheet:package:${fixtureId}`,
    competition: { context: { name: info.event.name } },
    season: { context: { name: String(info.season) } },
    fixtures: [
      {
        sourceId: `cricsheet:fixture:${fixtureId}`,
        context: {
          date,
          teams: [firstTeam, secondTeam].map((name) => ({ context: { name } })),
          venue: info.venue,
        },
        proposal: {
          endDate: info.dates.at(-1),
          matchType: info.match_type,
          teamType: info.team_type,
          gender: info.gender,
          ballsPerOver: info.balls_per_over,
          outcome,
          ...(winner ? { winner } : {}),
          sourceVersion: source.meta.data_version,
          sourceRevision: source.meta.revision,
        },
        season: { context: { name: String(info.season) } },
        innings: source.innings.map((innings, inningsIndex) => {
          const bowlingTeam = info.teams.find((team) => team !== innings.team);
          let sequence = 0;
          return {
            context: {
              ordinal: inningsIndex + 1,
              battingTeam: { context: { name: innings.team } },
            },
            events: innings.overs.flatMap((over) =>
              over.deliveries.map((delivery, positionInOver) => {
                sequence += 1;
                return {
                  eventId: `cricsheet:delivery:${fixtureId}-${inningsIndex + 1}-${over.over}-${positionInOver + 1}`,
                  occurrenceSequence: sequence,
                  overNumber: over.over,
                  positionInOver,
                  ballLabel: delivery.actual_delivery ?? `${over.over}.${positionInOver + 1}`,
                  striker: participant(delivery.batter, innings.team, people),
                  nonStriker: participant(delivery.non_striker, innings.team, people),
                  bowler: participant(delivery.bowler, bowlingTeam, people),
                  runs: {
                    offBat: delivery.runs.batter,
                    extras: delivery.runs.extras,
                    total: delivery.runs.total,
                  },
                  extras: extras(delivery.extras),
                  wickets: wickets(delivery.wickets, innings.team, bowlingTeam, people),
                };
              }),
            ),
          };
        }),
      },
    ],
  };
}

async function main() {
  const [sourcePath, outputPath] = process.argv.slice(2);
  if (!sourcePath || !outputPath) {
    throw new Error(
      'Usage: node scripts/issue-598-cricsheet-package.mjs <source.json> <output.json>',
    );
  }
  const source = JSON.parse(await readFile(sourcePath, 'utf8'));
  const fixtureId = basename(sourcePath, '.json');
  const output = convertCricsheetFixture(source, fixtureId);
  await writeFile(resolve(outputPath), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
