import type { Express } from 'express';
import { describe, expect, test } from 'vitest';

import { SubmissionValidationError } from '../../src/modules/submissions/submission.errors';
import { parseSubmissionUpload } from '../../src/modules/submissions/submission-upload';

const csvHeader = [
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
].join(',');

function validRow(eventId: string, fixtureId = '7'): string {
  return `${fixtureId},1.0,${eventId},10,1,0,0,0.1,20,21,22,4,0,4,false,,,,,,[]`;
}

function multerFile(content: string, fileName = 'events.csv'): Express.Multer.File {
  const buffer = Buffer.from(content);
  return {
    fieldname: 'file',
    originalname: fileName,
    encoding: '7bit',
    mimetype: 'text/csv',
    size: buffer.length,
    buffer,
  } as Express.Multer.File;
}

function uploadErrorDetails(file: Express.Multer.File) {
  try {
    parseSubmissionUpload(file);
    throw new Error('Expected parseSubmissionUpload to throw a SubmissionValidationError');
  } catch (error) {
    expect(error).toBeInstanceOf(SubmissionValidationError);
    return (error as SubmissionValidationError).details;
  }
}

describe('parseSubmissionUpload CSV row faults', () => {
  test('accepts a valid multi-row CSV unchanged', () => {
    const content = [
      csvHeader,
      validRow('11111111-1111-4111-8111-111111111111'),
      validRow('22222222-2222-4222-8222-222222222222'),
    ].join('\n');

    const result = parseSubmissionUpload(multerFile(content));
    const submission = result.submission as { events: unknown[] };

    expect(submission.events).toHaveLength(2);
  });

  test('reports every malformed row instead of stopping at the first one', () => {
    const content = [
      csvHeader,
      validRow('11111111-1111-4111-8111-111111111111'), // row 2: valid
      '7,1.0,too,few,columns', // row 3: wrong column count
      validRow('22222222-2222-4222-8222-222222222222'), // row 4: valid
      '7,1.0,also,too,few,columns,here', // row 5: wrong column count
    ].join('\n');

    const details = uploadErrorDetails(multerFile(content, 'match-events.csv'));

    const malformedRowFaults = details.filter((detail) => detail.field === 'file');
    expect(malformedRowFaults).toHaveLength(2);

    // Every malformed row carries its own location (event index / CSV line)
    // and identifies the source file, rather than only reporting the first.
    expect(malformedRowFaults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'INVALID_FILE_ROW',
          eventIndex: 1,
          message: expect.stringContaining('match-events.csv'),
        }),
        expect.objectContaining({
          code: 'INVALID_FILE_ROW',
          eventIndex: 3,
          message: expect.stringContaining('match-events.csv'),
        }),
      ]),
    );
    expect(malformedRowFaults[0]!.message).toContain('row 3');
    expect(malformedRowFaults[1]!.message).toContain('row 5');
  });

  test('still parses structurally valid rows when other rows are malformed', () => {
    const content = [
      csvHeader,
      validRow('11111111-1111-4111-8111-111111111111'),
      '7,1.0,broken,row', // malformed row 3
      validRow('22222222-2222-4222-8222-222222222222'),
    ].join('\n');

    const details = uploadErrorDetails(multerFile(content));

    // The malformed row is reported...
    expect(details).toEqual(
      expect.arrayContaining([expect.objectContaining({ eventIndex: 1, field: 'file' })]),
    );
    // ...but does not prevent the two structurally valid rows from being
    // recognised as parseable (they are simply not included in the
    // rejected submission's normalised output).
    expect(details.filter((detail) => detail.field === 'file')).toHaveLength(1);
  });

  test('surfaces a malformed row together with an independent cross-row fault', () => {
    const content = [
      csvHeader,
      validRow('11111111-1111-4111-8111-111111111111', '7'),
      '7,1.0,broken,row', // malformed row 3
      validRow('22222222-2222-4222-8222-222222222222', '9'), // row 4: different fixtureId
    ].join('\n');

    const details = uploadErrorDetails(multerFile(content));

    expect(details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventIndex: 1, field: 'file' }),
        expect.objectContaining({ eventIndex: 2, field: 'fixtureId' }),
      ]),
    );
    expect(details).toHaveLength(2);
  });

  test('existing valid single-row uploads remain accepted', () => {
    const content = `${csvHeader}\n${validRow('11111111-1111-4111-8111-111111111111')}`;

    const result = parseSubmissionUpload(multerFile(content));
    const submission = result.submission as { fixtureId: string; events: unknown[] };

    expect(submission.fixtureId).toBe('7');
    expect(submission.events).toHaveLength(1);
  });
});
