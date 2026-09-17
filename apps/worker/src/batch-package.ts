import { TextDecoder } from 'node:util';
import type { Readable } from 'node:stream';

import {
  competitionReferenceSchema,
  FIXTURE_PROPOSAL_CONTRACT_VERSION,
  participantReferenceSchema,
  seasonReferenceSchema,
  seasonUploadPackageSchema,
  teamReferenceSchema,
  type SeasonUploadEvent,
  type SeasonUploadPackage,
} from '@sport-analytics/contracts';
import { z } from 'zod';

const MAX_BATCH_ITEMS = 50_000;
const MAX_CSV_RECORD_CHARS = 2_000_000;
const MAX_NDJSON_LINE_CHARS = 2_000_000;

type JsonObject = Record<string, unknown>;

export interface SourceFault {
  sourceOrdinal: number;
  ruleCode: string;
  filePath: string | null;
  rowNumber: number | null;
  fieldPath: string | null;
  message: string;
  countsAsItem?: boolean;
}

interface BatchCandidate {
  ordinal: number;
  filePath: string;
  rowNumber: number | null;
  fixtureKey: string;
  inningsKey: string;
  packageEnvelope: {
    contractVersion: unknown;
    packageId: unknown;
    competition: unknown;
    season: unknown;
  };
  fixture: { sourceId?: unknown; context?: unknown; proposal?: unknown };
  innings: { sourceId?: unknown; context?: unknown; powerplays?: unknown };
  event: unknown;
}

export interface NormalisedCandidate {
  ordinal: number;
  filePath: string;
  rowNumber: number | null;
  fixtureKey: string;
  inningsKey: string;
  packageEnvelope: Pick<
    SeasonUploadPackage,
    'contractVersion' | 'packageId' | 'competition' | 'season'
  >;
  fixture: Pick<SeasonUploadPackage['fixtures'][number], 'sourceId' | 'context' | 'proposal'>;
  innings: Pick<
    SeasonUploadPackage['fixtures'][number]['innings'][number],
    'sourceId' | 'context' | 'powerplays'
  >;
  event: SeasonUploadEvent;
}

export interface ReferenceScanResult {
  rejectedOrdinals: Set<number>;
  sourceFaults: SourceFault[];
  eventCount: number;
  fatal: boolean;
}

export interface ReferenceChunk {
  referencePackage: SeasonUploadPackage | null;
  referencePathByOrdinal: Map<number, string>;
}

export type OpenBatchSource = () => Promise<Readable>;

function safeMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The source package could not be parsed.';
}

async function* decodedText(source: Readable): AsyncGenerator<string> {
  const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false });
  let first = true;
  try {
    for await (const chunk of source) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
      let text = decoder.decode(bytes, { stream: true });
      if (first) {
        first = false;
        if (text.startsWith('\uFEFF')) text = text.slice(1);
      }
      if (text) yield text;
    }
    const tail = decoder.decode();
    if (tail) yield tail;
  } catch (error) {
    throw new Error(`The batch source is not valid UTF-8: ${safeMessage(error)}`);
  }
}

class AsyncCharReader {
  private readonly chunks: AsyncIterator<string>;
  private chunk = '';
  private index = 0;
  private ended = false;

  constructor(source: Readable) {
    this.chunks = decodedText(source)[Symbol.asyncIterator]();
  }

  private async ensure(): Promise<boolean> {
    while (this.index >= this.chunk.length && !this.ended) {
      const next = await this.chunks.next();
      if (next.done) {
        this.ended = true;
        return false;
      }
      this.chunk = next.value;
      this.index = 0;
    }
    return this.index < this.chunk.length;
  }

  async peek(): Promise<string | null> {
    return (await this.ensure()) ? this.chunk[this.index]! : null;
  }

  async read(): Promise<string | null> {
    if (!(await this.ensure())) return null;
    return this.chunk[this.index++]!;
  }

  async whitespace(): Promise<void> {
    for (;;) {
      const char = await this.peek();
      if (char === null || !/\s/.test(char)) return;
      await this.read();
    }
  }

  async expect(expected: string): Promise<void> {
    await this.whitespace();
    const actual = await this.read();
    if (actual !== expected) {
      throw new Error(`Expected "${expected}" in JSON package.`);
    }
  }

  async jsonString(): Promise<string> {
    await this.whitespace();
    if ((await this.read()) !== '"') throw new Error('Expected a JSON object key.');
    let raw = '"';
    let escaped = false;
    for (;;) {
      const char = await this.read();
      if (char === null) throw new Error('Unterminated JSON string.');
      raw += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        return JSON.parse(raw) as string;
      }
    }
  }

  async valueRaw(): Promise<string> {
    await this.whitespace();
    const first = await this.peek();
    if (first === null) throw new Error('Unexpected end of JSON package.');

    if (first === '"') {
      let raw = '';
      let escaped = false;
      for (;;) {
        const char = await this.read();
        if (char === null) throw new Error('Unterminated JSON string.');
        raw += char;
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"' && raw.length > 1) return raw;
      }
    }

    if (first === '{' || first === '[') {
      let raw = '';
      let depth = 0;
      let inString = false;
      let escaped = false;
      for (;;) {
        const char = await this.read();
        if (char === null) throw new Error('Unterminated JSON value.');
        raw += char;
        if (inString) {
          if (escaped) escaped = false;
          else if (char === '\\') escaped = true;
          else if (char === '"') inString = false;
          continue;
        }
        if (char === '"') {
          inString = true;
          continue;
        }
        if (char === '{' || char === '[') depth += 1;
        if (char === '}' || char === ']') depth -= 1;
        if (depth === 0) return raw;
      }
    }

    let raw = '';
    for (;;) {
      const char = await this.peek();
      if (char === null || char === ',' || char === '}' || /\s/.test(char)) return raw;
      raw += await this.read();
    }
  }
}

interface JsonEnvelope {
  contractVersion?: unknown;
  packageId?: unknown;
  competition?: unknown;
  season?: unknown;
}

async function readJsonEnvelope(source: Readable): Promise<JsonEnvelope> {
  const reader = new AsyncCharReader(source);
  const envelope: JsonEnvelope = {};
  await reader.expect('{');
  let firstMember = true;
  for (;;) {
    await reader.whitespace();
    if ((await reader.peek()) === '}') {
      await reader.read();
      return envelope;
    }
    if (!firstMember) await reader.expect(',');
    firstMember = false;
    const key = await reader.jsonString();
    await reader.expect(':');
    if (key === 'fixtures') {
      await reader.expect('[');
      let firstFixture = true;
      for (;;) {
        await reader.whitespace();
        if ((await reader.peek()) === ']') {
          await reader.read();
          break;
        }
        if (!firstFixture) await reader.expect(',');
        firstFixture = false;
        await reader.valueRaw();
      }
    } else {
      const value = JSON.parse(await reader.valueRaw()) as unknown;
      if (
        key === 'contractVersion' ||
        key === 'packageId' ||
        key === 'competition' ||
        key === 'season'
      ) {
        envelope[key] = value;
      }
    }
  }
}

async function* jsonCandidates(
  source: Readable,
  envelope: JsonEnvelope,
): AsyncGenerator<BatchCandidate> {
  const reader = new AsyncCharReader(source);
  await reader.expect('{');
  let firstMember = true;
  let ordinal = 0;
  for (;;) {
    await reader.whitespace();
    if ((await reader.peek()) === '}') return;
    if (!firstMember) await reader.expect(',');
    firstMember = false;
    const key = await reader.jsonString();
    await reader.expect(':');
    if (key !== 'fixtures') {
      await reader.valueRaw();
      continue;
    }

    await reader.expect('[');
    let fixtureIndex = 0;
    let firstFixture = true;
    for (;;) {
      await reader.whitespace();
      if ((await reader.peek()) === ']') {
        await reader.read();
        return;
      }
      if (!firstFixture) await reader.expect(',');
      firstFixture = false;
      const fixture = JSON.parse(await reader.valueRaw()) as JsonObject;
      const inningsValues = Array.isArray(fixture.innings) ? fixture.innings : [];
      for (const [inningsIndex, inningsValue] of inningsValues.entries()) {
        const innings = inningsValue as JsonObject;
        const events = Array.isArray(innings.events) ? innings.events : [];
        for (const event of events) {
          yield {
            ordinal: ordinal++,
            filePath: 'batch.json',
            rowNumber: null,
            fixtureKey: `json:${String(fixtureIndex)}`,
            inningsKey: `json:${String(fixtureIndex)}:${String(inningsIndex)}`,
            packageEnvelope: {
              contractVersion: envelope.contractVersion,
              packageId: envelope.packageId,
              competition: envelope.competition,
              season: envelope.season,
            },
            fixture: {
              sourceId: fixture.sourceId,
              context: fixture.context,
              proposal: fixture.proposal,
            },
            innings: {
              sourceId: innings.sourceId,
              context: innings.context,
              powerplays: innings.powerplays,
            },
            event,
          };
        }
      }
      fixtureIndex += 1;
    }
  }
}

async function* csvRecords(
  source: Readable,
): AsyncGenerator<{ record: string; rowNumber: number }> {
  let record = '';
  let inQuotes = false;
  let quotePending = false;
  let rowNumber = 1;

  for await (const text of decodedText(source)) {
    for (const char of text) {
      record += char;
      if (record.length > MAX_CSV_RECORD_CHARS)
        throw new Error('A CSV record exceeds the safe size limit.');

      if (quotePending) {
        if (char === '"') {
          quotePending = false;
          continue;
        }
        inQuotes = false;
        quotePending = false;
      }

      if (char === '"' && inQuotes) {
        quotePending = true;
        continue;
      }
      if (char === '"' && !inQuotes) {
        inQuotes = true;
        continue;
      }
      if (char === '\n' && !inQuotes) {
        const value = record.endsWith('\r\n') ? record.slice(0, -2) : record.slice(0, -1);
        yield { record: value, rowNumber };
        rowNumber += 1;
        record = '';
      }
    }
  }
  if (inQuotes && !quotePending) throw new Error('CSV ended inside a quoted field.');
  if (record.length > 0)
    yield { record: record.endsWith('\r') ? record.slice(0, -1) : record, rowNumber };
}

function splitCsvRecord(record: string): string[] {
  const fields: string[] = [];
  let field = '';
  let inQuotes = false;
  let afterQuote = false;

  for (let index = 0; index < record.length; index += 1) {
    const char = record[index]!;
    if (inQuotes) {
      if (char === '"') {
        if (record[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
          afterQuote = true;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (afterQuote) {
      if (char === ',') {
        fields.push(field);
        field = '';
        afterQuote = false;
        continue;
      }
      throw new Error('Unexpected character after a closing CSV quote.');
    }
    if (char === ',') {
      fields.push(field);
      field = '';
    } else if (char === '"') {
      if (field.length > 0) throw new Error('CSV quotes must begin at the start of a field.');
      inQuotes = true;
    } else {
      field += char;
    }
  }
  if (inQuotes) throw new Error('CSV record contains an unterminated quoted field.');
  fields.push(field);
  return fields;
}

function optional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function numeric(value: string | undefined): number | undefined {
  const text = optional(value);
  if (text === undefined) return undefined;
  if (!/^-?\d+$/.test(text)) return Number.NaN;
  return Number(text);
}

function reference(sourceId: string | undefined, name: string | undefined): JsonObject {
  const result: JsonObject = {};
  const id = optional(sourceId);
  const label = optional(name);
  if (id) result.sourceId = id;
  if (label) result.context = { name: label };
  return result;
}

// The direct-submission CSV's boolean spelling (booleanValue in submission-upload.ts):
// blank is absent, exactly "true" or "false" is a boolean, and any other spelling is
// passed through so the package contract rejects it rather than the parser guessing.
function csvBoolean(value: string | undefined): boolean | string | undefined {
  const text = optional(value);
  if (text === 'true') return true;
  if (text === 'false') return false;
  return text;
}

const CSV_FIELDER_SLOTS = [1, 2, 3] as const;

/**
 * The dismissal columns of one CSV row in the season-upload wicket shape. A row can
 * express one dismissal with up to three fielders; anything more needs the JSON
 * package. Which dismissal kinds need a fielder is the contract's rule, not this one.
 */
function csvWickets(row: Record<string, string>): JsonObject[] | undefined {
  const kind = optional(row.wicketKind);
  if (kind === undefined) return undefined;

  const fielders: JsonObject[] = [];
  for (const slot of CSV_FIELDER_SLOTS) {
    const participant = reference(row[`fielder${slot}SourceId`], row[`fielder${slot}Name`]);
    const substitute = csvBoolean(row[`fielder${slot}Substitute`]);
    const identified = Object.keys(participant).length > 0;
    // An empty slot is skipped, so a filled slot after an empty one moves up and the
    // fielders keep their order without a gap.
    if (!identified && (substitute === undefined || substitute === false)) continue;
    fielders.push({
      ...(identified ? { participant } : {}),
      ...(substitute === undefined ? {} : { substitute }),
    });
  }

  return [{ kind, playerOut: reference(row.playerOutSourceId, row.playerOutName), fielders }];
}

const CSV_DISMISSAL_DETAIL_COLUMNS = [
  'playerOutSourceId',
  'playerOutName',
  ...CSV_FIELDER_SLOTS.flatMap((slot) => [
    `fielder${slot}SourceId`,
    `fielder${slot}Name`,
    `fielder${slot}Substitute`,
  ]),
];

/** The dismissal columns filled in on a row whose wicketKind is blank. */
function csvDismissalColumnsWithoutKind(row: Record<string, string>): string[] {
  if (optional(row.wicketKind) !== undefined) return [];
  return CSV_DISMISSAL_DETAIL_COLUMNS.filter((column) => optional(row[column]) !== undefined);
}

const REQUIRED_CSV_COLUMNS = [
  'contractVersion',
  'packageId',
  'competitionName',
  'seasonName',
  'fixtureDate',
  'homeTeamName',
  'awayTeamName',
  'inningsOrdinal',
  'battingTeamName',
  'eventId',
  'occurrenceSequence',
  'ballLabel',
  'strikerName',
  'nonStrikerName',
  'bowlerName',
  'runsOffBat',
  'runsExtras',
  'runsTotal',
] as const;

async function* csvCandidates(
  source: Readable,
  faults: SourceFault[],
): AsyncGenerator<BatchCandidate> {
  let header: string[] | null = null;
  let ordinal = 0;
  for await (const { record, rowNumber } of csvRecords(source)) {
    if (record.trim() === '') continue;
    let fields: string[];
    try {
      fields = splitCsvRecord(record);
    } catch (error) {
      faults.push({
        sourceOrdinal: ordinal,
        ruleCode: 'CSV_MALFORMED_ROW',
        filePath: 'batch.csv',
        rowNumber,
        fieldPath: null,
        message: safeMessage(error),
        countsAsItem: true,
      });
      ordinal += 1;
      if (ordinal > MAX_BATCH_ITEMS)
        throw new Error(`Batch exceeds the ${String(MAX_BATCH_ITEMS)}-item limit.`);
      continue;
    }
    if (!header) {
      header = fields.map((value, index) =>
        (index === 0 ? value.replace(/^\uFEFF/, '') : value).trim(),
      );
      const missing = REQUIRED_CSV_COLUMNS.filter((column) => !header!.includes(column));
      if (missing.length > 0)
        throw new Error(`CSV header is missing required columns: ${missing.join(', ')}.`);
      continue;
    }
    if (fields.length !== header.length) {
      faults.push({
        sourceOrdinal: ordinal,
        ruleCode: 'CSV_COLUMN_COUNT',
        filePath: 'batch.csv',
        rowNumber,
        fieldPath: null,
        message: `Expected ${String(header.length)} columns but received ${String(fields.length)}.`,
        countsAsItem: true,
      });
      ordinal += 1;
      if (ordinal > MAX_BATCH_ITEMS)
        throw new Error(`Batch exceeds the ${String(MAX_BATCH_ITEMS)}-item limit.`);
      continue;
    }
    const row = Object.fromEntries(
      header.map((key, index) => [key, fields[index] ?? '']),
    ) as Record<string, string>;
    const strayDismissalColumns = csvDismissalColumnsWithoutKind(row);
    if (strayDismissalColumns.length > 0) {
      // Reported rather than dropped: a dismissal whose kind was left out would
      // otherwise reach publication as a delivery without its wicket.
      faults.push({
        sourceOrdinal: ordinal,
        ruleCode: 'CSV_WICKET_KIND_MISSING',
        filePath: 'batch.csv',
        rowNumber,
        fieldPath: 'wicketKind',
        message: `wicketKind is blank but ${strayDismissalColumns.join(', ')} ${strayDismissalColumns.length === 1 ? 'is' : 'are'} filled in. Enter the dismissal kind, or clear the dismissal columns.`,
        countsAsItem: true,
      });
      ordinal += 1;
      if (ordinal > MAX_BATCH_ITEMS)
        throw new Error(`Batch exceeds the ${String(MAX_BATCH_ITEMS)}-item limit.`);
      continue;
    }
    const fixtureKey =
      optional(row.fixtureSourceId) ?? `${row.fixtureDate}|${row.homeTeamName}|${row.awayTeamName}`;
    const inningsKey =
      optional(row.inningsSourceId) ?? `${fixtureKey}|${row.inningsOrdinal}|${row.battingTeamName}`;
    const wickets = csvWickets(row);
    const event: JsonObject = {
      eventId: optional(row.eventId),
      occurrenceSequence: numeric(row.occurrenceSequence),
      overNumber: numeric(row.overNumber),
      positionInOver: numeric(row.positionInOver),
      ballLabel: optional(row.ballLabel),
      operation: optional(row.operation) ?? 'upsert',
      correctsEventId: optional(row.correctsEventId),
      striker: reference(row.strikerSourceId, row.strikerName),
      nonStriker: reference(row.nonStrikerSourceId, row.nonStrikerName),
      bowler: reference(row.bowlerSourceId, row.bowlerName),
      runs: {
        offBat: numeric(row.runsOffBat),
        extras: numeric(row.runsExtras),
        total: numeric(row.runsTotal),
      },
      extras: {
        ...(optional(row.extraWides) ? { wides: numeric(row.extraWides) } : {}),
        ...(optional(row.extraNoBalls) ? { noBalls: numeric(row.extraNoBalls) } : {}),
        ...(optional(row.extraByes) ? { byes: numeric(row.extraByes) } : {}),
        ...(optional(row.extraLegByes) ? { legByes: numeric(row.extraLegByes) } : {}),
        ...(optional(row.extraPenalty) ? { penalty: numeric(row.extraPenalty) } : {}),
      },
      ...(wickets ? { wickets } : {}),
    };
    const currentOrdinal = ordinal++;
    if (ordinal > MAX_BATCH_ITEMS)
      throw new Error(`Batch exceeds the ${String(MAX_BATCH_ITEMS)}-item limit.`);
    yield {
      ordinal: currentOrdinal,
      filePath: 'batch.csv',
      rowNumber,
      fixtureKey,
      inningsKey,
      packageEnvelope: {
        contractVersion: optional(row.contractVersion),
        packageId: optional(row.packageId),
        competition: reference(row.competitionSourceId, row.competitionName),
        season: reference(row.seasonSourceId, row.seasonName),
      },
      fixture: {
        sourceId: optional(row.fixtureSourceId),
        context: {
          date: optional(row.fixtureDate),
          teams: [
            reference(row.homeTeamSourceId, row.homeTeamName),
            reference(row.awayTeamSourceId, row.awayTeamName),
          ],
        },
        ...(optional(row.contractVersion) === FIXTURE_PROPOSAL_CONTRACT_VERSION
          ? {
              proposal: {
                endDate: optional(row.fixtureEndDate),
                matchType: optional(row.fixtureMatchType),
                teamType: optional(row.fixtureTeamType),
                gender: optional(row.fixtureGender),
                ballsPerOver: numeric(row.fixtureBallsPerOver),
                outcome: optional(row.fixtureOutcome),
                sourceVersion: optional(row.fixtureSourceVersion),
                sourceRevision: numeric(row.fixtureSourceRevision),
              },
            }
          : {}),
      },
      innings: {
        sourceId: optional(row.inningsSourceId),
        context: {
          ordinal: numeric(row.inningsOrdinal),
          battingTeam: reference(row.battingTeamSourceId, row.battingTeamName),
        },
      },
      event,
    };
  }
  if (!header) throw new Error('CSV batch source has no header row.');
}

const ndjsonManifestSchema = z
  .object({
    recordType: z.literal('manifest'),
    contractVersion: z.unknown(),
    packageId: z.unknown(),
    competition: z.unknown(),
    season: z.unknown(),
  })
  .passthrough();
const ndjsonFixtureSchema = z
  .object({
    recordType: z.literal('fixture'),
    fixtureKey: z.string().trim().min(1),
    sourceId: z.unknown().optional(),
    context: z.unknown().optional(),
    powerplays: z.unknown().optional(),
  })
  .passthrough();
const ndjsonInningsSchema = z
  .object({
    recordType: z.literal('innings'),
    fixtureKey: z.string().trim().min(1),
    inningsKey: z.string().trim().min(1),
    sourceId: z.unknown().optional(),
    context: z.unknown().optional(),
  })
  .passthrough();
const ndjsonParticipantSchema = z
  .object({
    recordType: z.literal('participant'),
    participantKey: z.string().trim().min(1),
    reference: z.unknown(),
  })
  .passthrough();
const ndjsonEventSchema = z
  .object({
    recordType: z.literal('event'),
    fixtureKey: z.string().trim().min(1),
    inningsKey: z.string().trim().min(1),
    event: z.record(z.unknown()),
  })
  .passthrough();

async function* textLines(source: Readable): AsyncGenerator<{ line: string; rowNumber: number }> {
  let buffer = '';
  let rowNumber = 1;
  for await (const text of decodedText(source)) {
    buffer += text;
    if (buffer.length > MAX_NDJSON_LINE_CHARS && !buffer.includes('\n'))
      throw new Error('An NDJSON record exceeds the safe size limit.');
    for (;;) {
      const newline = buffer.indexOf('\n');
      if (newline < 0) break;
      let line = buffer.slice(0, newline);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      yield { line, rowNumber };
      rowNumber += 1;
      buffer = buffer.slice(newline + 1);
    }
  }
  if (buffer.length > 0)
    yield { line: buffer.endsWith('\r') ? buffer.slice(0, -1) : buffer, rowNumber };
}

async function* ndjsonCandidates(
  source: Readable,
  faults: SourceFault[],
): AsyncGenerator<BatchCandidate> {
  let manifest: z.infer<typeof ndjsonManifestSchema> | null = null;
  const fixtures = new Map<string, z.infer<typeof ndjsonFixtureSchema>>();
  const innings = new Map<string, z.infer<typeof ndjsonInningsSchema>>();
  const participants = new Map<string, SeasonUploadEvent['striker']>();
  let ordinal = 0;

  for await (const { line, rowNumber } of textLines(source)) {
    if (!line.trim()) continue;
    let raw: unknown;
    try {
      raw = JSON.parse(line);
    } catch {
      // An NDJSON line can represent package metadata as well as an event. If
      // the JSON itself is malformed we cannot safely classify it as a batch
      // item, so record a deterministic row fault without consuming an event
      // ordinal. The next valid event therefore keeps the same item ordinal.
      faults.push({
        sourceOrdinal: ordinal,
        ruleCode: 'NDJSON_MALFORMED_RECORD',
        filePath: 'batch.ndjson',
        rowNumber,
        fieldPath: null,
        message: 'Record is not valid JSON.',
      });
      continue;
    }
    const recordType =
      typeof raw === 'object' && raw !== null ? (raw as JsonObject).recordType : undefined;
    if (recordType === 'manifest') {
      const parsed = ndjsonManifestSchema.safeParse(raw);
      if (!parsed.success || manifest) {
        faults.push({
          sourceOrdinal: ordinal,
          ruleCode: 'NDJSON_MANIFEST_INVALID',
          filePath: 'batch.ndjson',
          rowNumber,
          fieldPath: null,
          message: manifest
            ? 'Only one manifest record is allowed.'
            : 'Manifest record is invalid.',
        });
      } else manifest = parsed.data;
      continue;
    }
    if (recordType === 'fixture') {
      const parsed = ndjsonFixtureSchema.safeParse(raw);
      if (!parsed.success)
        faults.push({
          sourceOrdinal: ordinal,
          ruleCode: 'NDJSON_FIXTURE_INVALID',
          filePath: 'batch.ndjson',
          rowNumber,
          fieldPath: null,
          message: 'Fixture record is invalid.',
        });
      else fixtures.set(parsed.data.fixtureKey, parsed.data);
      continue;
    }
    if (recordType === 'innings') {
      const parsed = ndjsonInningsSchema.safeParse(raw);
      if (!parsed.success)
        faults.push({
          sourceOrdinal: ordinal,
          ruleCode: 'NDJSON_INNINGS_INVALID',
          filePath: 'batch.ndjson',
          rowNumber,
          fieldPath: null,
          message: 'Innings record is invalid.',
        });
      else innings.set(`${parsed.data.fixtureKey}|${parsed.data.inningsKey}`, parsed.data);
      continue;
    }
    if (recordType === 'participant') {
      const parsed = ndjsonParticipantSchema.safeParse(raw);
      const reference = parsed.success
        ? participantReferenceSchema.safeParse(parsed.data.reference)
        : null;
      if (!parsed.success || !reference?.success) {
        faults.push({
          sourceOrdinal: ordinal,
          ruleCode: 'NDJSON_PARTICIPANT_INVALID',
          filePath: 'batch.ndjson',
          rowNumber,
          fieldPath: null,
          message: 'Participant record is invalid.',
        });
      } else {
        participants.set(parsed.data.participantKey, reference.data);
      }
      continue;
    }
    if (recordType === 'event') {
      const parsed = ndjsonEventSchema.safeParse(raw);
      const currentOrdinal = ordinal++;
      if (ordinal > MAX_BATCH_ITEMS)
        throw new Error(`Batch exceeds the ${String(MAX_BATCH_ITEMS)}-item limit.`);
      if (!parsed.success || !manifest) {
        faults.push({
          sourceOrdinal: currentOrdinal,
          ruleCode: 'NDJSON_EVENT_INVALID',
          filePath: 'batch.ndjson',
          rowNumber,
          fieldPath: null,
          message: !manifest
            ? 'A manifest record must appear before event records.'
            : 'Event record is invalid.',
          countsAsItem: true,
        });
        continue;
      }
      const fixture = fixtures.get(parsed.data.fixtureKey);
      const inningsRecord = innings.get(`${parsed.data.fixtureKey}|${parsed.data.inningsKey}`);
      if (!fixture || !inningsRecord) {
        faults.push({
          sourceOrdinal: currentOrdinal,
          ruleCode: 'NDJSON_CONTEXT_MISSING',
          filePath: 'batch.ndjson',
          rowNumber,
          fieldPath: null,
          message: 'Event references a fixture or innings record that has not been defined.',
          countsAsItem: true,
        });
        continue;
      }
      const event = { ...parsed.data.event } as JsonObject;
      for (const role of ['striker', 'nonStriker', 'bowler'] as const) {
        const value = event[role];
        if (typeof value === 'string') event[role] = participants.get(value) ?? value;
      }
      yield {
        ordinal: currentOrdinal,
        filePath: 'batch.ndjson',
        rowNumber,
        fixtureKey: parsed.data.fixtureKey,
        inningsKey: parsed.data.inningsKey,
        packageEnvelope: {
          contractVersion: manifest.contractVersion,
          packageId: manifest.packageId,
          competition: manifest.competition,
          season: manifest.season,
        },
        fixture: {
          sourceId: fixture.sourceId,
          context: fixture.context,
          proposal: fixture.proposal,
        },
        innings: {
          sourceId: inningsRecord.sourceId,
          context: inningsRecord.context,
          powerplays: inningsRecord.powerplays,
        },
        event,
      };
      continue;
    }
    faults.push({
      sourceOrdinal: ordinal,
      ruleCode: 'NDJSON_RECORD_TYPE',
      filePath: 'batch.ndjson',
      rowNumber,
      fieldPath: 'recordType',
      message: 'Unsupported or missing NDJSON recordType.',
    });
  }
  if (!manifest) throw new Error('NDJSON batch source has no manifest record.');
}

async function* candidatesFor(
  openSource: OpenBatchSource,
  mediaType: string,
  faults: SourceFault[],
): AsyncGenerator<BatchCandidate> {
  if (mediaType === 'application/json') {
    const envelope = await readJsonEnvelope(await openSource());
    yield* jsonCandidates(await openSource(), envelope);
    return;
  }
  if (mediaType === 'text/csv') {
    yield* csvCandidates(await openSource(), faults);
    return;
  }
  if (mediaType === 'application/x-ndjson') {
    yield* ndjsonCandidates(await openSource(), faults);
    return;
  }
  throw new Error(`Unsupported batch media type: ${mediaType}`);
}

function normaliseCandidate(candidate: BatchCandidate): {
  value?: NormalisedCandidate;
  fault?: SourceFault;
} {
  const single = seasonUploadPackageSchema.safeParse({
    ...candidate.packageEnvelope,
    fixtures: [
      {
        ...candidate.fixture,
        innings: [{ ...candidate.innings, events: [candidate.event] }],
      },
    ],
  });
  if (!single.success) {
    return {
      fault: {
        sourceOrdinal: candidate.ordinal,
        ruleCode: 'PACKAGE_ITEM_INVALID',
        filePath: candidate.filePath,
        rowNumber: candidate.rowNumber,
        fieldPath: single.error.issues[0]?.path.join('.') ?? null,
        message:
          single.error.issues[0]?.message ??
          'The event does not satisfy the batch package contract.',
      },
    };
  }
  const parsed = single.data;
  return {
    value: {
      ordinal: candidate.ordinal,
      filePath: candidate.filePath,
      rowNumber: candidate.rowNumber,
      fixtureKey: candidate.fixtureKey,
      inningsKey: candidate.inningsKey,
      packageEnvelope: {
        contractVersion: parsed.contractVersion,
        packageId: parsed.packageId,
        competition: parsed.competition,
        season: parsed.season,
      },
      fixture: {
        sourceId: parsed.fixtures[0]!.sourceId,
        context: parsed.fixtures[0]!.context,
        proposal: parsed.fixtures[0]!.proposal,
      },
      innings: {
        sourceId: parsed.fixtures[0]!.innings[0]!.sourceId,
        context: parsed.fixtures[0]!.innings[0]!.context,
        powerplays: parsed.fixtures[0]!.innings[0]!.powerplays,
      },
      event: parsed.fixtures[0]!.innings[0]!.events[0]!,
    },
  };
}

class BatchIntegrityScanner {
  private envelopeFingerprint: string | null = null;
  private readonly eventIdsByInnings = new Map<string, Set<string>>();
  private readonly sequencesByInnings = new Map<string, Set<number>>();

  add(candidate: NormalisedCandidate): SourceFault | null {
    const fingerprint = JSON.stringify(candidate.packageEnvelope);
    if (this.envelopeFingerprint === null) {
      this.envelopeFingerprint = fingerprint;
    } else if (this.envelopeFingerprint !== fingerprint) {
      return {
        sourceOrdinal: candidate.ordinal,
        ruleCode: 'PACKAGE_ENVELOPE_MISMATCH',
        filePath: candidate.filePath,
        rowNumber: candidate.rowNumber,
        fieldPath: null,
        message: 'Event row does not match the package envelope established by earlier rows.',
      };
    }

    const fullInningsKey = `${candidate.fixtureKey}|${candidate.inningsKey}`;
    const ids = this.eventIdsByInnings.get(fullInningsKey) ?? new Set<string>();
    const sequences = this.sequencesByInnings.get(fullInningsKey) ?? new Set<number>();
    this.eventIdsByInnings.set(fullInningsKey, ids);
    this.sequencesByInnings.set(fullInningsKey, sequences);

    if (ids.has(candidate.event.eventId)) {
      return {
        sourceOrdinal: candidate.ordinal,
        ruleCode: 'DUPLICATE_SOURCE_EVENT',
        filePath: candidate.filePath,
        rowNumber: candidate.rowNumber,
        fieldPath: 'eventId',
        message: 'Delivery event identity is duplicated within the innings.',
      };
    }
    if (sequences.has(candidate.event.occurrenceSequence)) {
      return {
        sourceOrdinal: candidate.ordinal,
        ruleCode: 'DUPLICATE_OCCURRENCE_SEQUENCE',
        filePath: candidate.filePath,
        rowNumber: candidate.rowNumber,
        fieldPath: 'occurrenceSequence',
        message: 'Occurrence sequence is duplicated within the innings.',
      };
    }

    ids.add(candidate.event.eventId);
    sequences.add(candidate.event.occurrenceSequence);
    return null;
  }
}

class ReferencePackageBuilder {
  private packageValue: SeasonUploadPackage | null = null;
  private readonly fixtureByKey = new Map<string, number>();
  private readonly inningsByKey = new Map<string, number>();
  private readonly eventIdsByInnings = new Map<string, Set<string>>();
  private readonly sequencesByInnings = new Map<string, Set<number>>();

  add(candidate: NormalisedCandidate): { path?: string; fault?: SourceFault } {
    if (!this.packageValue) {
      this.packageValue = { ...candidate.packageEnvelope, fixtures: [] };
    } else if (
      this.packageValue.contractVersion !== candidate.packageEnvelope.contractVersion ||
      this.packageValue.packageId !== candidate.packageEnvelope.packageId ||
      JSON.stringify(this.packageValue.competition) !==
        JSON.stringify(candidate.packageEnvelope.competition) ||
      JSON.stringify(this.packageValue.season) !== JSON.stringify(candidate.packageEnvelope.season)
    ) {
      return {
        fault: {
          sourceOrdinal: candidate.ordinal,
          ruleCode: 'PACKAGE_ENVELOPE_MISMATCH',
          filePath: candidate.filePath,
          rowNumber: candidate.rowNumber,
          fieldPath: null,
          message: 'Event row does not match the package envelope established by earlier rows.',
        },
      };
    }

    let fixtureIndex = this.fixtureByKey.get(candidate.fixtureKey);
    if (fixtureIndex === undefined) {
      fixtureIndex = this.packageValue.fixtures.length;
      this.fixtureByKey.set(candidate.fixtureKey, fixtureIndex);
      this.packageValue.fixtures.push({ ...candidate.fixture, innings: [] });
    }
    const fixture = this.packageValue.fixtures[fixtureIndex]!;
    const fullInningsKey = `${candidate.fixtureKey}|${candidate.inningsKey}`;
    let inningsIndex = this.inningsByKey.get(fullInningsKey);
    if (inningsIndex === undefined) {
      inningsIndex = fixture.innings.length;
      this.inningsByKey.set(fullInningsKey, inningsIndex);
      fixture.innings.push({ ...candidate.innings, events: [] });
    }
    const innings = fixture.innings[inningsIndex]!;
    const ids = this.eventIdsByInnings.get(fullInningsKey) ?? new Set<string>();
    const sequences = this.sequencesByInnings.get(fullInningsKey) ?? new Set<number>();
    this.eventIdsByInnings.set(fullInningsKey, ids);
    this.sequencesByInnings.set(fullInningsKey, sequences);
    if (ids.has(candidate.event.eventId)) {
      return {
        fault: {
          sourceOrdinal: candidate.ordinal,
          ruleCode: 'DUPLICATE_SOURCE_EVENT',
          filePath: candidate.filePath,
          rowNumber: candidate.rowNumber,
          fieldPath: 'eventId',
          message: 'Delivery event identity is duplicated within the innings.',
        },
      };
    }
    if (sequences.has(candidate.event.occurrenceSequence)) {
      return {
        fault: {
          sourceOrdinal: candidate.ordinal,
          ruleCode: 'DUPLICATE_OCCURRENCE_SEQUENCE',
          filePath: candidate.filePath,
          rowNumber: candidate.rowNumber,
          fieldPath: 'occurrenceSequence',
          message: 'Occurrence sequence is duplicated within the innings.',
        },
      };
    }
    ids.add(candidate.event.eventId);
    sequences.add(candidate.event.occurrenceSequence);
    const eventIndex = innings.events.length;
    innings.events.push(candidate.event);
    return {
      path: `fixtures.${String(fixtureIndex)}.innings.${String(inningsIndex)}.events.${String(eventIndex)}`,
    };
  }

  value(): SeasonUploadPackage | null {
    return this.packageValue;
  }
}

export async function scanBatchReferences(
  openSource: OpenBatchSource,
  mediaType: string,
): Promise<ReferenceScanResult> {
  const faults: SourceFault[] = [];
  const rejectedOrdinals = new Set<number>();
  const integrity = new BatchIntegrityScanner();
  let eventCount = 0;
  let fatal = false;

  try {
    for await (const candidate of candidatesFor(openSource, mediaType, faults)) {
      eventCount = Math.max(eventCount, candidate.ordinal + 1);
      if (eventCount > MAX_BATCH_ITEMS) {
        faults.push({
          sourceOrdinal: candidate.ordinal,
          ruleCode: 'BATCH_ITEM_LIMIT',
          filePath: candidate.filePath,
          rowNumber: candidate.rowNumber,
          fieldPath: null,
          message: `Batch exceeds the ${String(MAX_BATCH_ITEMS)}-item limit.`,
        });
        fatal = true;
        break;
      }
      const normalised = normaliseCandidate(candidate);
      if (normalised.fault) {
        faults.push(normalised.fault);
        rejectedOrdinals.add(candidate.ordinal);
        continue;
      }
      const integrityFault = integrity.add(normalised.value!);
      if (integrityFault) {
        faults.push(integrityFault);
        rejectedOrdinals.add(candidate.ordinal);
      }
    }
  } catch (error) {
    faults.push({
      sourceOrdinal: 0,
      ruleCode: 'PACKAGE_PARSE_FAILED',
      filePath: null,
      rowNumber: null,
      fieldPath: null,
      message: safeMessage(error),
    });
    fatal = true;
  }

  for (const fault of faults) {
    if (fault.countsAsItem) eventCount = Math.max(eventCount, fault.sourceOrdinal + 1);
  }
  if (eventCount > MAX_BATCH_ITEMS) {
    eventCount = MAX_BATCH_ITEMS;
    fatal = true;
  }
  return { rejectedOrdinals, sourceFaults: faults, eventCount, fatal };
}

/**
 * Reorders normalised candidates so that, within each fixture/innings, events
 * are ordered by `occurrenceSequence` rather than by their position in the
 * source file or stream (#588). Fixtures and innings themselves keep the
 * order in which they were first encountered; only the events within one
 * innings are reordered, so a reversed or shuffled but logically valid
 * innings settles on the same canonical order as an already-ordered one.
 *
 * `occurrenceSequence` values are unique within an innings by contract
 * (rejected earlier as `DUPLICATE_OCCURRENCE_SEQUENCE` otherwise); the
 * original arrival ordinal is used only as a deterministic tiebreaker and
 * should never actually apply to accepted input.
 */
export function canonicaliseCandidates(
  candidates: readonly NormalisedCandidate[],
): NormalisedCandidate[] {
  const groupOrder: string[] = [];
  const groups = new Map<string, NormalisedCandidate[]>();
  for (const candidate of candidates) {
    const key = `${candidate.fixtureKey}|${candidate.inningsKey}`;
    let group = groups.get(key);
    if (!group) {
      group = [];
      groups.set(key, group);
      groupOrder.push(key);
    }
    group.push(candidate);
  }
  const ordered: NormalisedCandidate[] = [];
  for (const key of groupOrder) {
    const group = groups.get(key)!;
    group.sort(
      (left, right) =>
        left.event.occurrenceSequence - right.event.occurrenceSequence ||
        left.ordinal - right.ordinal,
    );
    ordered.push(...group);
  }
  return ordered;
}

export function buildReferenceChunk(candidates: NormalisedCandidate[]): ReferenceChunk {
  const builder = new ReferencePackageBuilder();
  const referencePathByOrdinal = new Map<number, string>();
  for (const candidate of canonicaliseCandidates(candidates)) {
    const added = builder.add(candidate);
    if (added.fault || !added.path) {
      throw new Error(
        `Reference chunk contains an item rejected during the source scan at ordinal ${String(candidate.ordinal)}.`,
      );
    }
    referencePathByOrdinal.set(candidate.ordinal, added.path);
  }
  return { referencePackage: builder.value(), referencePathByOrdinal };
}

export async function* normalisedBatchCandidates(
  openSource: OpenBatchSource,
  mediaType: string,
): AsyncGenerator<NormalisedCandidate> {
  const ignoredFaults: SourceFault[] = [];
  for await (const candidate of candidatesFor(openSource, mediaType, ignoredFaults)) {
    const normalised = normaliseCandidate(candidate);
    if (normalised.value) yield normalised.value;
  }
}

// Keep these imports exercised: they document that NDJSON participant and CSV
// reference records use the same public reference schemas as the JSON package.
void competitionReferenceSchema;
void seasonReferenceSchema;
void teamReferenceSchema;
