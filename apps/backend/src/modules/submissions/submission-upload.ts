import type { ApiErrorDetail, SubmissionSourceFile } from '@sport-analytics/contracts';
import type { Express, RequestHandler } from 'express';
import multer from 'multer';
import { basename } from 'node:path';

import { SubmissionValidationError } from './submission.errors';

const MAX_SUBMISSION_UPLOAD_BYTES = 1_000_000;
const SUBMISSION_UPLOAD_FIELD = 'file';

const csvHeaders = [
  'fixtureId',
  'schemaVersion',
  'eventId',
  'inningsId',
  'sequenceNumber',
  'overNumber',
  'positionInOver',
  'ballNumber',
  'strikerId',
  'nonStrikerId',
  'bowlerId',
  'runsOffBat',
  'runsExtras',
  'runsTotal',
  'runsNonBoundary',
  'extraWides',
  'extraNoBalls',
  'extraByes',
  'extraLegByes',
  'extraPenalty',
  'wickets',
] as const;

type CsvHeader = (typeof csvHeaders)[number];
type CsvRow = Record<CsvHeader, string>;

export interface ParsedSubmissionUpload {
  submission: unknown;
  sourceFile: SubmissionSourceFile;
}

function invalidFile(message: string, field = SUBMISSION_UPLOAD_FIELD): SubmissionValidationError {
  return new SubmissionValidationError('The uploaded submission file is invalid.', [
    { code: 'INVALID_FILE', message, field },
  ]);
}

function normaliseMediaType(file: Express.Multer.File): SubmissionSourceFile['mediaType'] {
  const name = file.originalname.toLocaleLowerCase();
  const mediaType = file.mimetype.toLocaleLowerCase();

  if (name.endsWith('.json') && (mediaType === 'application/json' || mediaType === 'text/json')) {
    return 'application/json';
  }

  if (name.endsWith('.csv') && (mediaType === 'text/csv' || mediaType === 'application/csv')) {
    return 'text/csv';
  }

  throw invalidFile('Upload a .json application/json file or a .csv text/csv file.');
}

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index]!;

    if (quoted) {
      if (character === '"' && content[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        value += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      row.push(value);
      value = '';
    } else if (character === '\n') {
      row.push(value.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      value = '';
    } else {
      value += character;
    }
  }

  if (quoted) {
    throw invalidFile('The CSV file contains an unterminated quoted value.');
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value.replace(/\r$/, ''));
    rows.push(row);
  }

  return rows;
}

type CsvRowResult =
  | { ok: true; eventIndex: number; row: CsvRow }
  | { ok: false; eventIndex: number; error: ApiErrorDetail };

/**
 * Parses every data row independently. A malformed row (wrong column count)
 * is recorded as a structured fault rather than aborting the parse, so that
 * every malformed row in the file is discovered in a single pass and valid
 * rows can still be read.
 */
function csvRowResults(content: string, fileName: string): CsvRowResult[] {
  const rows = parseCsv(content);
  const [header, ...dataRows] = rows;

  if (
    !header ||
    header.length !== csvHeaders.length ||
    !csvHeaders.every((value, index) => header[index] === value)
  ) {
    throw invalidFile(`The CSV header must exactly contain: ${csvHeaders.join(', ')}.`);
  }

  if (dataRows.length === 0) {
    throw invalidFile('The CSV file must contain at least one event row.');
  }

  return dataRows.map((row, eventIndex) => {
    // CSV row numbers are 1-indexed and include the header row, so the
    // first data row (eventIndex 0) is line 2 of the file.
    const lineNumber = eventIndex + 2;

    if (row.length !== csvHeaders.length) {
      return {
        ok: false,
        eventIndex,
        error: {
          code: 'INVALID_FILE_ROW',
          message: `"${fileName}" row ${lineNumber} has ${row.length} columns; ${csvHeaders.length} are required.`,
          field: 'file',
          eventIndex,
        },
      };
    }

    return {
      ok: true,
      eventIndex,
      row: Object.fromEntries(
        csvHeaders.map((headerName, index) => [headerName, row[index]!]),
      ) as CsvRow,
    };
  });
}

function numberValue(value: string): number | undefined | string {
  if (value.trim() === '') {
    return undefined;
  }

  return /^-?\d+(?:\.\d+)?$/.test(value) ? Number(value) : value;
}

function booleanValue(value: string): boolean | undefined | string {
  if (value.trim() === '') {
    return undefined;
  }

  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return value;
}

function optionalExtras(row: CsvRow) {
  return {
    ...(row.extraWides.trim() !== '' ? { wides: numberValue(row.extraWides) } : {}),
    ...(row.extraNoBalls.trim() !== '' ? { noBalls: numberValue(row.extraNoBalls) } : {}),
    ...(row.extraByes.trim() !== '' ? { byes: numberValue(row.extraByes) } : {}),
    ...(row.extraLegByes.trim() !== '' ? { legByes: numberValue(row.extraLegByes) } : {}),
    ...(row.extraPenalty.trim() !== '' ? { penalty: numberValue(row.extraPenalty) } : {}),
  };
}

function parseWickets(value: string): unknown {
  if (value.trim() === '') {
    return [];
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normaliseCsv(content: string, fileName: string): unknown {
  const results = csvRowResults(content, fileName);

  const malformedRowFaults = results
    .filter((result): result is Extract<CsvRowResult, { ok: false }> => !result.ok)
    .map((result) => result.error);

  const validRows = results.filter(
    (result): result is Extract<CsvRowResult, { ok: true }> => result.ok,
  );

  // The first structurally valid row establishes the fixtureId/schemaVersion
  // that every other structurally valid row is compared against. Malformed
  // rows are skipped here (they're already reported above) so they can't
  // mask, or be masked by, an independent consistency fault elsewhere.
  const first = validRows[0]?.row;

  const inconsistentRowFaults: ApiErrorDetail[] = first
    ? validRows.flatMap(({ row, eventIndex }) => [
        ...(row.fixtureId === first.fixtureId
          ? []
          : [
              {
                code: 'INVALID_FILE_ROW',
                message: `"${fileName}" row ${eventIndex + 2} must use the same fixtureId as the file's other rows.`,
                field: 'fixtureId',
                eventIndex,
              },
            ]),
        ...(row.schemaVersion === first.schemaVersion
          ? []
          : [
              {
                code: 'INVALID_FILE_ROW',
                message: `"${fileName}" row ${eventIndex + 2} must use the same schemaVersion as the file's other rows.`,
                field: 'schemaVersion',
                eventIndex,
              },
            ]),
      ])
    : [];

  const faults = [...malformedRowFaults, ...inconsistentRowFaults].sort(
    (a, b) => (a.eventIndex ?? 0) - (b.eventIndex ?? 0),
  );

  if (faults.length > 0) {
    throw new SubmissionValidationError('The uploaded submission file is invalid.', faults);
  }

  return {
    fixtureId: first!.fixtureId,
    schemaVersion: first!.schemaVersion,
    events: validRows.map(({ row }) => ({
      eventId: row.eventId,
      inningsId: row.inningsId,
      sequenceNumber: numberValue(row.sequenceNumber),
      overNumber: numberValue(row.overNumber),
      positionInOver: numberValue(row.positionInOver),
      ballNumber: row.ballNumber,
      strikerId: row.strikerId,
      nonStrikerId: row.nonStrikerId,
      bowlerId: row.bowlerId,
      runs: {
        offBat: numberValue(row.runsOffBat),
        extras: numberValue(row.runsExtras),
        total: numberValue(row.runsTotal),
        ...(booleanValue(row.runsNonBoundary) !== undefined
          ? { nonBoundary: booleanValue(row.runsNonBoundary) }
          : {}),
      },
      extras: optionalExtras(row),
      wickets: parseWickets(row.wickets),
    })),
  };
}

export function parseSubmissionUpload(file: Express.Multer.File): ParsedSubmissionUpload {
  if (file.size === 0) {
    throw invalidFile('The uploaded file is empty.');
  }

  const fileName = basename(file.originalname);
  if (!fileName || fileName.length > 255) {
    throw invalidFile('The uploaded filename must be between 1 and 255 characters.');
  }

  const mediaType = normaliseMediaType(file);
  const sourceFile = {
    fileName,
    mediaType,
    sizeBytes: file.size,
  } as const;
  const content = file.buffer.toString('utf8');

  if (mediaType === 'application/json') {
    try {
      return { submission: JSON.parse(content), sourceFile };
    } catch {
      throw invalidFile('The uploaded JSON file is not valid JSON.');
    }
  }

  return { submission: normaliseCsv(content, fileName), sourceFile };
}

export function createSubmissionUploadMiddleware(): RequestHandler {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { files: 1, fileSize: MAX_SUBMISSION_UPLOAD_BYTES },
  }).single(SUBMISSION_UPLOAD_FIELD);

  return (request, response, next) => {
    upload(request, response, (error: unknown) => {
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        response.status(413).json({
          error: {
            code: 'PAYLOAD_TOO_LARGE',
            message: 'The uploaded file exceeds the 1 MB size limit.',
          },
        });
        return;
      }

      if (error instanceof multer.MulterError) {
        response.status(422).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'The uploaded submission file is invalid.',
            details: [{ code: 'INVALID_FILE', field: 'file', message: error.message }],
          },
        });
        return;
      }

      next(error);
    });
  };
}
