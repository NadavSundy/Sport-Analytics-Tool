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

function csvRow(competitionName = 'Competition'): string {
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
    'upsert',
    '',
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

describe('shipped guided templates (#500)', () => {
  it.each([
    ['season-upload-template.csv', 'text/csv'],
    ['season-upload-template.json', 'application/json'],
  ])(
    'expands %s with only readable names filled in and carries no reference identifier',
    async (fileName, mediaType) => {
      const source = shippedTemplateWithReadableNames(fileName);

      const scan = await scanBatchReferences(async () => Readable.from(source), mediaType);
      expect(scan.fatal).toBe(false);
      expect(scan.sourceFaults).toEqual([]);
      expect(scan.eventCount).toBe(1);

      const { referencePackage } = await referenceChunkFor(source, mediaType);
      const fixture = referencePackage?.fixtures[0];
      const innings = fixture?.innings[0];
      const event = innings?.events[0];

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
      for (const role of ['striker', 'nonStriker', 'bowler'] as const) {
        expect(event?.[role].sourceId).toBeUndefined();
      }
    },
  );
});

describe('batch package streaming expansion', () => {
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
