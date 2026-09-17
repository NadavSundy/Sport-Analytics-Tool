import { readFileSync } from 'node:fs';
import { Readable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import {
  buildReferenceChunk,
  normalisedBatchCandidates,
  scanBatchReferences,
} from '../src/batch-package';

const header =
  'contractVersion,packageId,competitionSourceId,competitionName,seasonSourceId,seasonName,fixtureSourceId,fixtureDate,homeTeamSourceId,homeTeamName,awayTeamSourceId,awayTeamName,inningsSourceId,inningsOrdinal,battingTeamSourceId,battingTeamName,eventId,occurrenceSequence,overNumber,positionInOver,ballLabel,operation,correctsEventId,strikerSourceId,strikerName,nonStrikerSourceId,nonStrikerName,bowlerSourceId,bowlerName,runsOffBat,runsExtras,runsTotal,extraWides,extraNoBalls,extraByes,extraLegByes,extraPenalty';

async function referenceChunkFor(source: string | Buffer, mediaType: string) {
  const openSource = async () =>
    Readable.from(Buffer.isBuffer(source) ? source : Buffer.from(source, 'utf8'));
  const candidates = [];
  for await (const candidate of normalisedBatchCandidates(openSource, mediaType)) {
    candidates.push(candidate);
  }
  return buildReferenceChunk(candidates);
}

function csvRow(
  competitionName = 'Competition',
  operation: 'upsert' | 'correction' = 'upsert',
  correctsEventId = '',
): string {
  return [
    '1.0',
    'test:package:season-1',
    '',
    competitionName,
    '',
    '2026',
    'cricsheet:fixture:100',
    '2026-03-14',
    '',
    'Home',
    '',
    'Away',
    'test:innings:100-0',
    '0',
    '',
    'Home',
    'cricsheet:delivery:100-1',
    '1',
    '0',
    '0',
    '0.1',
    operation,
    correctsEventId,
    '',
    'Striker',
    '',
    'Non-striker',
    '',
    'Bowler',
    '0',
    '0',
    '0',
    '',
    '',
    '',
    '',
    '',
  ]
    .map((value) => (value.includes(',') ? `"${value}"` : value))
    .join(',');
}

/**
 * A shipped template with only its readable placeholders replaced, as a submitter
 * who knows the match but not the platform would complete it. Each placeholder
 * must be present, so a template change cannot quietly make a test vacuous.
 */
function shippedTemplateWithReadableNames(fileName: string): string {
  let text = readFileSync(new URL(`../../frontend/public/${fileName}`, import.meta.url), 'utf8');
  const readableValues: [placeholder: RegExp, value: string][] = [
    [/Competition name/g, 'Premier T20'],
    [/Home team/g, 'Wanderers'],
    [/Away team/g, 'Strikers'],
    [/\bStriker\b/g, 'A. Batter'],
    [/Non-striker/g, 'B. Batter'],
    [/\bBowler\b/g, 'C. Bowler'],
  ];
  for (const [placeholder, value] of readableValues) {
    expect(text).toMatch(placeholder);
    text = text.replace(placeholder, value);
  }
  return text;
}

/**
 * A minimal, valid season-upload package for one fixture/innings with the given
 * events. Callers control `occurrenceSequence` and file-array position
 * independently, so tests can express "logically ordered" vs "arrival order"
 * for the same fixture (#588).
 */
function jsonPackageWithEvents(
  events: { eventId: string; occurrenceSequence: number; ballLabel: string }[],
): string {
  return JSON.stringify({
    contractVersion: '1.0',
    packageId: 'test:package:occurrence-sequence',
    competition: { context: { name: 'Premier T20' } },
    season: { context: { name: '2026' } },
    fixtures: [
      {
        context: {
          date: '2026-03-14',
          teams: [{ context: { name: 'Home' } }, { context: { name: 'Away' } }],
        },
        innings: [
          {
            context: { ordinal: 0, battingTeam: { context: { name: 'Home' } } },
            events: events.map((event) => ({
              eventId: event.eventId,
              occurrenceSequence: event.occurrenceSequence,
              ballLabel: event.ballLabel,
              striker: { context: { name: 'Striker', team: { context: { name: 'Home' } } } },
              nonStriker: {
                context: { name: 'Non-striker', team: { context: { name: 'Home' } } },
              },
              bowler: { context: { name: 'Bowler', team: { context: { name: 'Away' } } } },
              runs: { offBat: 0, extras: 0, total: 0 },
              extras: {},
            })),
          },
        ],
      },
    ],
  });
}

describe('occurrence-sequence ordering independent of arrival order (#588)', () => {
  const orderedEvents = [
    { eventId: 'test:delivery:1', occurrenceSequence: 1, ballLabel: '0.1' },
    { eventId: 'test:delivery:2', occurrenceSequence: 2, ballLabel: '0.2' },
    { eventId: 'test:delivery:3', occurrenceSequence: 3, ballLabel: '0.3' },
  ];

  it.each([
    ['ordered', orderedEvents],
    ['reversed', [...orderedEvents].reverse()],
    ['shuffled', [orderedEvents[1]!, orderedEvents[2]!, orderedEvents[0]!]],
  ])(
    'settles on the same canonical event order for %s arrival order',
    async (_label, arrivalOrderEvents) => {
      const source = jsonPackageWithEvents(arrivalOrderEvents);

      const scan = await scanBatchReferences(async () => Readable.from(source), 'application/json');
      expect(scan.fatal).toBe(false);
      expect(scan.sourceFaults).toEqual([]);

      const { referencePackage } = await referenceChunkFor(source, 'application/json');
      const events = referencePackage?.fixtures[0]?.innings[0]?.events ?? [];

      // The published/canonical order must reflect occurrenceSequence, not the
      // order the rows appeared in the source file.
      expect(events.map((event) => event.eventId)).toEqual([
        'test:delivery:1',
        'test:delivery:2',
        'test:delivery:3',
      ]);
      expect(events.map((event) => event.occurrenceSequence)).toEqual([1, 2, 3]);
    },
  );

  it('rejects duplicate occurrence sequences regardless of arrival order', async () => {
    const source = jsonPackageWithEvents([
      { eventId: 'test:delivery:1', occurrenceSequence: 1, ballLabel: '0.1' },
      { eventId: 'test:delivery:2', occurrenceSequence: 1, ballLabel: '0.2' },
    ]);

    const scan = await scanBatchReferences(async () => Readable.from(source), 'application/json');

    expect(scan.sourceFaults.map((fault) => fault.ruleCode)).toContain(
      'DUPLICATE_OCCURRENCE_SEQUENCE',
    );
  });
});

describe('authoritative powerplay metadata', () => {
  it('preserves JSON innings ranges in the staged reference package', async () => {
    const value = JSON.parse(
      jsonPackageWithEvents([
        { eventId: 'test:delivery:powerplay-1', occurrenceSequence: 1, ballLabel: '0.1' },
      ]),
    ) as {
      fixtures: Array<{ innings: Array<{ powerplays?: unknown }> }>;
    };
    value.fixtures[0]!.innings[0]!.powerplays = [{ from: 0.1, to: 5.6, type: 'mandatory' }];

    const chunk = await referenceChunkFor(JSON.stringify(value), 'application/json');

    expect(chunk.referencePackage?.fixtures[0]?.innings[0]?.powerplays).toEqual([
      { from: 0.1, to: 5.6, type: 'mandatory' },
    ]);
  });

  it('reports an actionable source path for an invalid range', async () => {
    const value = JSON.parse(
      jsonPackageWithEvents([
        { eventId: 'test:delivery:powerplay-invalid', occurrenceSequence: 1, ballLabel: '0.1' },
      ]),
    ) as {
      fixtures: Array<{ innings: Array<{ powerplays?: unknown }> }>;
    };
    value.fixtures[0]!.innings[0]!.powerplays = [{ from: 5.6, to: 0.1, type: 'mandatory' }];

    const scan = await scanBatchReferences(
      async () => Readable.from(JSON.stringify(value)),
      'application/json',
    );

    expect(scan.sourceFaults).toEqual([
      expect.objectContaining({
        ruleCode: 'PACKAGE_ITEM_INVALID',
        fieldPath: expect.stringContaining('powerplays'),
        message: expect.stringContaining('must not precede'),
      }),
    ]);
  });
});

describe('shipped guided templates (#500)', () => {
  // The JSON template's second event demonstrates a caught dismissal (#536); the CSV
  // template's example row leaves its dismissal columns blank.
  it.each([
    ['season-upload-template.csv', 'text/csv', 1, 0],
    ['season-upload-template.json', 'application/json', 2, 1],
  ])(
    'expands %s with only readable names filled in and carries no reference identifier',
    async (fileName, mediaType, eventCount, wicketCount) => {
      const source = shippedTemplateWithReadableNames(fileName);

      const scan = await scanBatchReferences(async () => Readable.from(source), mediaType);
      expect(scan.fatal).toBe(false);
      expect(scan.sourceFaults).toEqual([]);
      expect(scan.eventCount).toBe(eventCount);

      const { referencePackage } = await referenceChunkFor(source, mediaType);
      const fixture = referencePackage?.fixtures[0];
      const innings = fixture?.innings[0];
      const events = innings?.events ?? [];

      // Competition, fixture, innings and participants must reach the resolver as
      // readable context alone. A placeholder identifier would be preferred over
      // the names and leave every delivery unresolved.
      expect(referencePackage?.competition.sourceId).toBeUndefined();
      expect(referencePackage?.competition.context?.name).toBe('Premier T20');
      expect(fixture?.sourceId).toBeUndefined();
      expect(fixture?.context?.teams).toEqual([
        { context: { name: 'Wanderers' } },
        { context: { name: 'Strikers' } },
      ]);
      expect(innings?.sourceId).toBeUndefined();
      expect(events).toHaveLength(eventCount);
      expect(events.flatMap((event) => event.wickets)).toHaveLength(wicketCount);
      for (const event of events) {
        for (const role of ['striker', 'nonStriker', 'bowler'] as const) {
          expect(event[role].sourceId).toBeUndefined();
        }
        for (const wicket of event.wickets) {
          expect(wicket.playerOut.sourceId).toBeUndefined();
          for (const fielder of wicket.fielders) {
            expect(fielder.participant?.sourceId).toBeUndefined();
          }
        }
      }
    },
  );

  it('preserves a version 1.1 fixture proposal for reviewer resolution', async () => {
    const value = JSON.parse(
      shippedTemplateWithReadableNames('season-upload-template.json'),
    ) as Record<string, unknown> & { fixtures: Array<Record<string, unknown>> };
    const proposal = {
      endDate: '2026-03-14',
      matchType: 'T20',
      teamType: 'club',
      gender: 'female',
      ballsPerOver: 6,
      outcome: 'no result',
      sourceVersion: '1',
      sourceRevision: 0,
    };
    value.contractVersion = '1.1';
    value.fixtures[0] = {
      ...value.fixtures[0],
      sourceId: 'app:fixture:test-package-fixture',
      proposal,
    };
    const source = JSON.stringify(value);

    const scan = await scanBatchReferences(async () => Readable.from(source), 'application/json');
    const referenceChunk = await referenceChunkFor(source, 'application/json');

    expect(scan.fatal).toBe(false);
    expect(scan.sourceFaults).toEqual([]);
    expect(referenceChunk.referencePackage?.contractVersion).toBe('1.1');
    expect(referenceChunk.referencePackage?.fixtures[0]?.proposal).toEqual(proposal);
  });

  it('preserves a version 1.1 fixture proposal from CSV', async () => {
    const [headerLine = '', rowLine = ''] = shippedTemplateWithReadableNames(
      'season-upload-template.csv',
    ).split(/\r?\n/);
    const columns = headerLine.split(',');
    const cells = rowLine.split(',');
    cells[columns.indexOf('contractVersion')] = '1.1';
    cells[columns.indexOf('fixtureSourceId')] = 'submitter:fixture:csv-package';
    const proposalColumns: Record<string, string> = {
      fixtureEndDate: '2026-03-14',
      fixtureMatchType: 'T20',
      fixtureTeamType: 'club',
      fixtureGender: 'female',
      fixtureBallsPerOver: '6',
      fixtureOutcome: 'no result',
      fixtureSourceVersion: '1',
      fixtureSourceRevision: '0',
    };
    for (const [column, value] of Object.entries(proposalColumns)) {
      const index = columns.indexOf(column);
      expect(index, `template column ${column}`).toBeGreaterThanOrEqual(0);
      cells[index] = value;
    }
    const source = `${columns.join(',')}\n${cells.join(',')}\n`;

    const scan = await scanBatchReferences(async () => Readable.from(source), 'text/csv');
    const referenceChunk = await referenceChunkFor(source, 'text/csv');

    expect(scan.fatal).toBe(false);
    expect(scan.sourceFaults).toEqual([]);
    expect(referenceChunk.referencePackage?.contractVersion).toBe('1.1');
    expect(referenceChunk.referencePackage?.fixtures[0]?.proposal).toEqual({
      endDate: '2026-03-14',
      matchType: 'T20',
      teamType: 'club',
      gender: 'female',
      ballsPerOver: 6,
      outcome: 'no result',
      sourceVersion: '1',
      sourceRevision: 0,
    });
  });

  it('preserves a version 1.1 fixture proposal from NDJSON', async () => {
    const proposal = {
      endDate: '2026-03-14',
      matchType: 'T20',
      teamType: 'club',
      gender: 'female',
      ballsPerOver: 6,
      outcome: 'no result',
      sourceVersion: '1',
      sourceRevision: 0,
    };
    const source = [
      JSON.stringify({
        recordType: 'manifest',
        contractVersion: '1.1',
        packageId: 'submitter:package:ndjson-package',
        competition: { context: { name: 'Premier T20' } },
        season: { context: { name: '2026' } },
      }),
      JSON.stringify({
        recordType: 'fixture',
        fixtureKey: 'fixture-1',
        sourceId: 'submitter:fixture:ndjson-package',
        context: {
          date: '2026-03-14',
          teams: [{ context: { name: 'Wanderers' } }, { context: { name: 'Strikers' } }],
        },
        proposal,
      }),
      JSON.stringify({
        recordType: 'innings',
        fixtureKey: 'fixture-1',
        inningsKey: 'innings-1',
        context: { ordinal: 0, battingTeam: { context: { name: 'Wanderers' } } },
      }),
      JSON.stringify({
        recordType: 'event',
        fixtureKey: 'fixture-1',
        inningsKey: 'innings-1',
        event: {
          eventId: 'submitter:delivery:ndjson-package-1',
          occurrenceSequence: 1,
          overNumber: 0,
          positionInOver: 0,
          ballLabel: '0.1',
          striker: { context: { name: 'A. Batter' } },
          nonStriker: { context: { name: 'B. Batter' } },
          bowler: { context: { name: 'C. Bowler' } },
          runs: { offBat: 0, extras: 0, total: 0 },
          extras: {},
        },
      }),
    ].join('\n');

    const scan = await scanBatchReferences(
      async () => Readable.from(source),
      'application/x-ndjson',
    );
    const referenceChunk = await referenceChunkFor(source, 'application/x-ndjson');

    expect(scan.fatal).toBe(false);
    expect(scan.sourceFaults).toEqual([]);
    expect(referenceChunk.referencePackage?.fixtures[0]?.proposal).toEqual(proposal);
  });
});

/**
 * The shipped CSV template's example row, with readable names filled in and the named
 * columns set as a submitter recording a dismissal would complete them. Every column
 * set must exist in the template header, so a template change cannot make a test vacuous.
 */
function shippedCsvTemplateWith(values: Record<string, string>): string {
  const [headerLine = '', rowLine = ''] = shippedTemplateWithReadableNames(
    'season-upload-template.csv',
  ).split(/\r?\n/);
  const columns = headerLine.split(',');
  const cells = rowLine.split(',');
  expect(cells).toHaveLength(columns.length);
  for (const [column, value] of Object.entries(values)) {
    const index = columns.indexOf(column);
    expect(index, `template column ${column}`).toBeGreaterThanOrEqual(0);
    cells[index] = value;
  }
  return `${headerLine}\n${cells.join(',')}\n`;
}

async function normalisedCsvEvents(source: string) {
  const events = [];
  for await (const candidate of normalisedBatchCandidates(
    async () => Readable.from(source),
    'text/csv',
  )) {
    events.push(candidate.event);
  }
  return events;
}

describe('CSV dismissal columns (#536)', () => {
  it('carries a dismissal and its fielder from a template-shaped row', async () => {
    const source = shippedCsvTemplateWith({
      wicketKind: 'caught',
      playerOutName: 'A. Batter',
      fielder1Name: 'D. Fielder',
    });

    const scan = await scanBatchReferences(async () => Readable.from(source), 'text/csv');
    expect(scan.sourceFaults).toEqual([]);
    const events = await normalisedCsvEvents(source);
    expect(events).toHaveLength(1);
    expect(events[0]?.wickets).toEqual([
      {
        kind: 'caught',
        playerOut: { context: { name: 'A. Batter' } },
        fielders: [{ participant: { context: { name: 'D. Fielder' } }, substitute: false }],
      },
    ]);
  });

  it('produces no wicket when wicketKind is blank', async () => {
    const source = shippedCsvTemplateWith({ wicketKind: '' });

    const scan = await scanBatchReferences(async () => Readable.from(source), 'text/csv');
    expect(scan.sourceFaults).toEqual([]);
    const events = await normalisedCsvEvents(source);
    expect(events).toHaveLength(1);
    expect(events[0]?.wickets).toEqual([]);
  });

  // A submitter who records a dismissal but forgets its kind is told, rather than the
  // delivery quietly losing its wicket.
  it.each([
    ['playerOutSourceId', 'my-club:participant:dismissed-batter'],
    ['playerOutName', 'A. Batter'],
    ['fielder1SourceId', 'my-club:participant:fielder'],
    ['fielder1Name', 'D. Fielder'],
    ['fielder1Substitute', 'false'],
    ['fielder2SourceId', 'my-club:participant:fielder'],
    ['fielder2Name', 'D. Fielder'],
    ['fielder2Substitute', 'true'],
    ['fielder3SourceId', 'my-club:participant:fielder'],
    ['fielder3Name', 'D. Fielder'],
    ['fielder3Substitute', 'true'],
  ])('reports %s filled in without a wicketKind instead of dropping it', async (column, value) => {
    const source = shippedCsvTemplateWith({ wicketKind: '', [column]: value });

    const scan = await scanBatchReferences(async () => Readable.from(source), 'text/csv');
    expect(scan.eventCount).toBe(1);
    expect(scan.sourceFaults).toEqual([
      {
        sourceOrdinal: 0,
        ruleCode: 'CSV_WICKET_KIND_MISSING',
        filePath: 'batch.csv',
        rowNumber: 2,
        fieldPath: 'wicketKind',
        message: expect.stringContaining(column),
        countsAsItem: true,
      },
    ]);
    expect(await normalisedCsvEvents(source)).toEqual([]);
  });

  it('carries an unidentified substitute fielder who has no name', async () => {
    const source = shippedCsvTemplateWith({
      wicketKind: 'caught',
      playerOutName: 'A. Batter',
      fielder1Substitute: 'true',
    });

    const scan = await scanBatchReferences(async () => Readable.from(source), 'text/csv');
    expect(scan.sourceFaults).toEqual([]);
    const events = await normalisedCsvEvents(source);
    expect(events[0]?.wickets).toEqual([
      {
        kind: 'caught',
        playerOut: { context: { name: 'A. Batter' } },
        fielders: [{ substitute: true }],
      },
    ]);
  });

  it('moves filled fielder slots up past an empty slot', async () => {
    const source = shippedCsvTemplateWith({
      wicketKind: 'run out',
      playerOutName: 'A. Batter',
      fielder2Name: 'D. Fielder',
      fielder3Name: 'E. Fielder',
    });

    const events = await normalisedCsvEvents(source);
    expect(events[0]?.wickets[0]?.fielders).toEqual([
      { participant: { context: { name: 'D. Fielder' } }, substitute: false },
      { participant: { context: { name: 'E. Fielder' } }, substitute: false },
    ]);
  });

  it('rejects a substitute value other than true or false instead of guessing', async () => {
    const source = shippedCsvTemplateWith({
      wicketKind: 'caught',
      playerOutName: 'A. Batter',
      fielder1Name: 'D. Fielder',
      fielder1Substitute: 'yes',
    });

    const scan = await scanBatchReferences(async () => Readable.from(source), 'text/csv');
    expect(scan.sourceFaults).toEqual([
      expect.objectContaining({
        ruleCode: 'PACKAGE_ITEM_INVALID',
        fieldPath: 'fixtures.0.innings.0.events.0.wickets.0.fielders.0.substitute',
      }),
    ]);
    expect(await normalisedCsvEvents(source)).toEqual([]);
  });
});

describe('batch package streaming expansion', () => {
  it('preserves correction metadata from CSV packages', async () => {
    const source = `${header}\n${csvRow(
      'Competition',
      'correction',
      'cricsheet:delivery:100-original',
    )}\n`;
    const candidates = [];
    for await (const candidate of normalisedBatchCandidates(
      async () => Readable.from(source),
      'text/csv',
    )) {
      candidates.push(candidate);
    }

    expect(candidates[0]?.event).toMatchObject({
      operation: 'correction',
      correctsEventId: 'cricsheet:delivery:100-original',
    });
  });

  it('preserves correction metadata from JSON packages', async () => {
    const source = JSON.stringify({
      contractVersion: '1.0',
      packageId: 'test:package:season-1',
      competition: { context: { name: 'Competition' } },
      season: { context: { name: '2026' } },
      fixtures: [
        {
          sourceId: 'cricsheet:fixture:100',
          context: {
            date: '2026-03-14',
            teams: [{ context: { name: 'Home' } }, { context: { name: 'Away' } }],
          },
          innings: [
            {
              context: { ordinal: 0, battingTeam: { context: { name: 'Home' } } },
              events: [
                {
                  eventId: 'cricsheet:delivery:100-revision-2',
                  occurrenceSequence: 1,
                  overNumber: 0,
                  positionInOver: 0,
                  ballLabel: '0.1',
                  operation: 'correction',
                  correctsEventId: 'cricsheet:delivery:100-original',
                  striker: { context: { name: 'Striker' } },
                  nonStriker: { context: { name: 'Non-striker' } },
                  bowler: { context: { name: 'Bowler' } },
                  runs: { offBat: 1, extras: 0, total: 1 },
                  extras: {},
                },
              ],
            },
          ],
        },
      ],
    });
    const candidates = [];
    for await (const candidate of normalisedBatchCandidates(
      async () => Readable.from(source),
      'application/json',
    )) {
      candidates.push(candidate);
    }

    expect(candidates[0]?.event).toMatchObject({
      operation: 'correction',
      correctsEventId: 'cricsheet:delivery:100-original',
    });
  });

  it('strips a UTF-8 BOM and honours quoted CSV fields', async () => {
    const source = `\uFEFF${header}\r\n${csvRow('Premier, League')}\r\n`;
    const result = await scanBatchReferences(
      async () => Readable.from(Buffer.from(source, 'utf8')),
      'text/csv',
    );

    expect(result.fatal).toBe(false);
    expect(result.eventCount).toBe(1);
    expect(result.sourceFaults).toEqual([]);

    const referenceChunk = await referenceChunkFor(Buffer.from(source, 'utf8'), 'text/csv');
    expect(referenceChunk.referencePackage?.competition).toEqual({
      context: { name: 'Premier, League' },
    });
    expect(referenceChunk.referencePathByOrdinal.get(0)).toBe('fixtures.0.innings.0.events.0');
  });

  it('collects a malformed CSV row and continues to the next event', async () => {
    const source = `${header}\ninvalid,row\n${csvRow()}\n`;
    const result = await scanBatchReferences(async () => Readable.from(source), 'text/csv');

    expect(result.fatal).toBe(false);
    expect(result.eventCount).toBe(2);
    expect(result.sourceFaults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleCode: 'CSV_COLUMN_COUNT', sourceOrdinal: 0 }),
      ]),
    );

    const referenceChunk = await referenceChunkFor(source, 'text/csv');
    expect(referenceChunk.referencePathByOrdinal.get(1)).toBe('fixtures.0.innings.0.events.0');
  });

  it('keeps processing NDJSON after a malformed record', async () => {
    const records = [
      JSON.stringify({
        recordType: 'manifest',
        contractVersion: '1.0',
        packageId: 'test:package:season-1',
        competition: { context: { name: 'Competition' } },
        season: { context: { name: '2026' } },
      }),
      '{bad json',
      JSON.stringify({
        recordType: 'fixture',
        fixtureKey: 'f1',
        sourceId: 'cricsheet:fixture:100',
        context: {
          date: '2026-03-14',
          teams: [{ context: { name: 'Home' } }, { context: { name: 'Away' } }],
        },
      }),
      JSON.stringify({
        recordType: 'innings',
        fixtureKey: 'f1',
        inningsKey: 'i1',
        sourceId: 'test:innings:100-0',
        context: { ordinal: 0, battingTeam: { context: { name: 'Home' } } },
      }),
      JSON.stringify({
        recordType: 'event',
        fixtureKey: 'f1',
        inningsKey: 'i1',
        event: {
          eventId: 'cricsheet:delivery:100-1',
          occurrenceSequence: 1,
          overNumber: 0,
          positionInOver: 0,
          ballLabel: '0.1',
          striker: { context: { name: 'Striker' } },
          nonStriker: { context: { name: 'Non-striker' } },
          bowler: { context: { name: 'Bowler' } },
          runs: { offBat: 0, extras: 0, total: 0 },
          extras: {},
        },
      }),
    ].join('\n');

    const result = await scanBatchReferences(
      async () => Readable.from(records),
      'application/x-ndjson',
    );
    expect(result.fatal).toBe(false);
    expect(result.eventCount).toBe(1);
    expect(result.sourceFaults).toEqual(
      expect.arrayContaining([expect.objectContaining({ ruleCode: 'NDJSON_MALFORMED_RECORD' })]),
    );

    const referenceChunk = await referenceChunkFor(records, 'application/x-ndjson');
    expect(referenceChunk.referencePackage?.fixtures[0]?.innings[0]?.events).toHaveLength(1);
  });
});
