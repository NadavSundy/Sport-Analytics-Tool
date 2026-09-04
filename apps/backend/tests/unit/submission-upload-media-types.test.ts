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

const validCsv = `${csvHeader}\n7,1.0,123e4567-e89b-42d3-a456-426614174000,10,1,0,0,0.1,20,21,22,4,0,4,false,,,,,,[]\n`;

function uploadFile(
  content: string,
  mimetype: string,
  originalname = 'match-events.csv',
): Parameters<typeof parseSubmissionUpload>[0] {
  const buffer = Buffer.from(content, 'utf8');
  return { originalname, mimetype, size: buffer.length, buffer } as Parameters<
    typeof parseSubmissionUpload
  >[0];
}

describe('submission CSV upload compatibility', () => {
  test('strips a UTF-8 BOM before validating the CSV header', () => {
    const parsed = parseSubmissionUpload(uploadFile(`\uFEFF${validCsv}`, 'text/csv'));

    expect(parsed.sourceFile.mediaType).toBe('text/csv');
    expect(parsed.submission).toMatchObject({ fixtureId: '7', schemaVersion: '1.0' });
  });

  test.each([
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel',
    'text/plain',
    'text/csv; charset=utf-8',
  ])('accepts CSV files reported as %s', (mimetype) => {
    const parsed = parseSubmissionUpload(uploadFile(validCsv, mimetype));
    expect(parsed.sourceFile.mediaType).toBe('text/csv');
  });

  test('still rejects non-CSV files and unsupported CSV media types', () => {
    expect(() =>
      parseSubmissionUpload(uploadFile('plain text', 'text/plain', 'events.txt')),
    ).toThrow(SubmissionValidationError);
    expect(() => parseSubmissionUpload(uploadFile(validCsv, 'application/pdf'))).toThrow(
      SubmissionValidationError,
    );
  });
});
