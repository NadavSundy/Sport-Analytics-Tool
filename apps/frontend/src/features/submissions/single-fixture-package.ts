import type { Fixture } from '@sport-analytics/contracts';

export class SingleFixturePackageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SingleFixturePackageError';
  }
}

export type FixtureContext = { date: string; teams: string[] };
export type SingleFixturePackageContext = FixtureContext & {
  competitionName: string;
  seasonName: string;
};

function normalise(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function expectedContext(fixture: Fixture): FixtureContext {
  return {
    date: fixture.startDate,
    teams: fixture.competitors.map((competitor) => competitor.name),
  };
}

function assertMatchesFixture(contexts: FixtureContext[], expected: FixtureContext): void {
  if (contexts.length === 0 || contexts.some((context) => context.teams.length !== 2)) {
    throw new SingleFixturePackageError(
      'Include the fixture date and both team names so the selected fixture can be verified.',
    );
  }
  if (
    contexts.some(
      (context) =>
        context.date !== expected.date ||
        [...context.teams].map(normalise).sort().join('|') !==
          [...expected.teams].map(normalise).sort().join('|'),
    )
  ) {
    throw new SingleFixturePackageError(
      'The package does not match the selected fixture. Check its date and both team names.',
    );
  }
}

function fixtureContextsFromJson(contents: string): FixtureContext[] {
  let value: unknown;
  try {
    value = JSON.parse(contents);
  } catch {
    throw new SingleFixturePackageError('The JSON package could not be read. Check its syntax.');
  }
  if (!value || typeof value !== 'object' || !('fixtures' in value)) {
    throw new SingleFixturePackageError('The JSON package must contain a fixtures array.');
  }
  const fixtures = (value as { fixtures?: unknown }).fixtures;
  if (!Array.isArray(fixtures) || fixtures.length !== 1) {
    throw new SingleFixturePackageError(
      'Single-fixture mode requires exactly one fixture. Choose Season or Back catalogue for larger packages.',
    );
  }
  const context = (fixtures[0] as { context?: unknown } | null)?.context;
  if (!context || typeof context !== 'object') return [];
  const date = (context as { date?: unknown }).date;
  const teams = (context as { teams?: unknown }).teams;
  if (typeof date !== 'string' || !Array.isArray(teams)) return [];
  return [
    {
      date,
      teams: teams.flatMap((team) => {
        const name = (team as { context?: { name?: unknown } } | null)?.context?.name;
        return typeof name === 'string' ? [name] : [];
      }),
    },
  ];
}

export function parseCsvRecords(contents: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < contents.length; index += 1) {
    const character = contents[index];
    if (character === '"') {
      if (quoted && contents[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      record.push(field);
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && contents[index + 1] === '\n') index += 1;
      record.push(field);
      if (record.some((value) => value.trim() !== '')) records.push(record);
      record = [];
      field = '';
    } else {
      field += character;
    }
  }
  if (quoted) throw new SingleFixturePackageError('The CSV package contains an unclosed quote.');
  record.push(field);
  if (record.some((value) => value.trim() !== '')) records.push(record);
  return records;
}

function fixtureContextsFromCsv(contents: string): FixtureContext[] {
  const [header, ...rows] = parseCsvRecords(contents);
  if (!header || rows.length === 0) {
    throw new SingleFixturePackageError(
      'The CSV package must include a header and at least one row.',
    );
  }
  const dateIndex = header.indexOf('fixtureDate');
  const homeTeamIndex = header.indexOf('homeTeamName');
  const awayTeamIndex = header.indexOf('awayTeamName');
  if ([dateIndex, homeTeamIndex, awayTeamIndex].some((index) => index < 0)) {
    throw new SingleFixturePackageError(
      'The CSV package must include fixtureDate, homeTeamName and awayTeamName columns.',
    );
  }
  return rows.map((row) => ({
    date: row[dateIndex] ?? '',
    teams: [row[homeTeamIndex] ?? '', row[awayTeamIndex] ?? ''],
  }));
}

export function validateSingleFixturePackage(
  fileName: string,
  contents: string,
  fixture: Fixture,
): void {
  validateSingleFixturePackageContext(fileName, contents, expectedContext(fixture));
}

export function validateSingleFixturePackageContext(
  fileName: string,
  contents: string,
  expected: FixtureContext,
): void {
  const contexts = fileName.toLocaleLowerCase().endsWith('.json')
    ? fixtureContextsFromJson(contents)
    : fixtureContextsFromCsv(contents);
  assertMatchesFixture(contexts, expected);
}

export function readSingleFixturePackageContext(
  fileName: string,
  contents: string,
): SingleFixturePackageContext {
  if (fileName.toLocaleLowerCase().endsWith('.json')) {
    let value: unknown;
    try {
      value = JSON.parse(contents) as unknown;
    } catch {
      throw new SingleFixturePackageError('The JSON package could not be read. Check its syntax.');
    }
    const upload = value as {
      competition?: { context?: { name?: unknown } };
      season?: { context?: { name?: unknown } };
    } | null;
    const [fixture] = fixtureContextsFromJson(contents);
    const competitionName = upload?.competition?.context?.name;
    const seasonName = upload?.season?.context?.name;
    if (!fixture || typeof competitionName !== 'string' || typeof seasonName !== 'string') {
      throw new SingleFixturePackageError(
        'Include competition, season, fixture date and both team names in the package.',
      );
    }
    return { ...fixture, competitionName, seasonName };
  }

  const [header, firstRow] = parseCsvRecords(contents);
  if (!header || !firstRow) {
    throw new SingleFixturePackageError(
      'The CSV package must include a header and at least one row.',
    );
  }
  const value = (field: string) => firstRow[header.indexOf(field)]?.trim() ?? '';
  const context = {
    competitionName: value('competitionName'),
    seasonName: value('seasonName'),
    date: value('fixtureDate'),
    teams: [value('homeTeamName'), value('awayTeamName')],
  };
  if (
    !context.competitionName ||
    !context.seasonName ||
    !context.date ||
    context.teams.some((team) => !team)
  ) {
    throw new SingleFixturePackageError(
      'Include competition, season, fixture date and both team names in the package.',
    );
  }
  return context;
}
