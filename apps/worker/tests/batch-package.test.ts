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
