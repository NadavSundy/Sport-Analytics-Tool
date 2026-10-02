import {
  type ApiErrorDetail,
  DIRECT_SUBMISSION_SCHEMA_VERSION,
  FIXTURE_PROPOSAL_CONTRACT_VERSION,
  seasonUploadPackageSchema,
  submissionRequestSchema,
  submissionResponseSchema,
  type Fixture,
  type FixtureProposal,
  type SubmissionEvent,
  type SubmissionResponse,
} from '@sport-analytics/contracts';
import type { AuthenticatedApiClient } from '../../api/client';
import { publicReadApi } from '../../api/public-read';
import { parseCsvRecords } from './single-fixture-package';
import { schemaIssuesToDetails, summariseSchemaIssues } from './submission-validation-copy';

export type NewFixtureMetadata = {
  competitionName: string;
  seasonName: string;
  startDate: string;
  homeTeamName: string;
  awayTeamName: string;
  proposal: FixtureProposal;
};

export class SubmissionInputError extends Error {
  /**
   * Every problem found before upload, in the API's detail shape. Empty when the
   * message alone says what to correct (#801).
   */
  readonly details: ApiErrorDetail[];

  constructor(message: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = 'SubmissionInputError';
    this.details = details;
  }
}

function schemaFailure(issues: readonly { path: (string | number)[]; message: string }[]) {
  return new SubmissionInputError(
    summariseSchemaIssues(issues),
    issues.length > 1 ? schemaIssuesToDetails(issues) : [],
  );
}

/**
 * Every fixture in one competition. The submission selectors load a competition
 * at a time rather than the whole table: an administrator is scoped to nothing,
 * so an unfiltered sweep is one request per hundred fixtures in the database
 * before the page can be used at all (#779).
 */
export async function listCompetitionFixtures(
  competitionId: string,
  signal?: AbortSignal,
): Promise<Fixture[]> {
  const fixtures: Fixture[] = [];
  let cursor: string | null = null;

  do {
    const parameters = new URLSearchParams({ competitionId, limit: '100' });
    if (cursor) {
      parameters.set('cursor', cursor);
    }

    const response = await publicReadApi.listFixtures(`?${parameters.toString()}`, signal);
    fixtures.push(...response.data);
    cursor = response.pagination.nextCursor;
  } while (cursor);

  return fixtures;
}

export function createTechnicalBatchFile(
  fixture: Fixture,
  eventJson: string,
  packageKey: string,
): File {
  let events: unknown;

  try {
    events = JSON.parse(eventJson) as unknown;
  } catch {
    throw new SubmissionInputError('Enter valid JSON before submitting.');
  }

  const acceptedPayload = submissionRequestSchema.safeParse({
    fixtureId: fixture.fixtureId,
    schemaVersion: DIRECT_SUBMISSION_SCHEMA_VERSION,
    events,
  });

  if (!acceptedPayload.success) {
    throw schemaFailure(acceptedPayload.error.issues);
  }

  if (!fixture.competitionId || !fixture.competitionName) {
    throw new SubmissionInputError('Select an available fixture before submitting.');
  }

  const innings = new Map<string, SubmissionEvent[]>();
  for (const event of acceptedPayload.data.events) {
    const group = innings.get(event.inningsId) ?? [];
    group.push(event);
    innings.set(event.inningsId, group);
  }

  const participant = (participantId: string) => ({
    sourceId: `app:participant:${participantId}`,
  });

  const packagePayload = {
    contractVersion: '1.0',
    packageId: `app:package:${packageKey}`,
    competition: { context: { name: fixture.competitionName } },
    season: { context: { name: fixture.season } },
    fixtures: [
      {
        sourceId: `app:fixture:${fixture.fixtureId}`,
        innings: [...innings.entries()].map(([inningsId, inningsEvents]) => ({
          sourceId: `app:innings:${inningsId}`,
          events: inningsEvents.map((event) => ({
            eventId: `app:delivery:${event.eventId}`,
            occurrenceSequence: event.sequenceNumber,
            overNumber: event.overNumber,
            positionInOver: event.positionInOver,
            ballLabel: event.ballNumber,
            operation: 'upsert' as const,
            striker: participant(event.strikerId),
            nonStriker: participant(event.nonStrikerId),
            bowler: participant(event.bowlerId),
            runs: event.runs,
            extras: event.extras,
            wickets: event.wickets.map((wicket) => ({
              kind: wicket.kind,
              playerOut: participant(wicket.playerOutId),
              fielders: wicket.fielders.map((fielder) => ({
                ...(fielder.participantId
                  ? { participant: participant(fielder.participantId) }
                  : {}),
                substitute: fielder.substitute,
              })),
            })),
          })),
        })),
      },
    ],
  };

  return new File([JSON.stringify(packagePayload)], `technical-${fixture.fixtureId}.json`, {
    type: 'application/json',
  });
}

export function createFixtureProposalBatchFile(
  fileName: string,
  contents: string,
  metadata: NewFixtureMetadata,
): File {
  if (fileName.toLocaleLowerCase().endsWith('.csv')) {
    return createFixtureProposalCsvFile(contents, metadata);
  }

  let value: unknown;

  try {
    value = JSON.parse(contents) as unknown;
  } catch {
    throw new SubmissionInputError('The JSON package could not be read. Check its syntax.');
  }

  if (!value || typeof value !== 'object') {
    throw new SubmissionInputError('The JSON package must contain a fixture package object.');
  }

  const submitted = value as Record<string, unknown>;
  const fixtures = submitted.fixtures;
  if (!Array.isArray(fixtures) || fixtures.length !== 1 || !fixtures[0]) {
    throw new SubmissionInputError('A new-fixture submission must contain exactly one fixture.');
  }

  const fixture = fixtures[0] as Record<string, unknown>;
  const packageId = submitted.packageId;
  const proposedPackage = {
    ...submitted,
    contractVersion: FIXTURE_PROPOSAL_CONTRACT_VERSION,
    competition: { context: { name: metadata.competitionName } },
    season: { context: { name: metadata.seasonName } },
    fixtures: [
      {
        ...fixture,
        sourceId:
          typeof packageId === 'string'
            ? `submitter:fixture:${encodeURIComponent(packageId)}`
            : undefined,
        context: {
          date: metadata.startDate,
          teams: [
            { context: { name: metadata.homeTeamName } },
            { context: { name: metadata.awayTeamName } },
          ],
        },
        proposal: metadata.proposal,
      },
    ],
  };
  const acceptedPackage = seasonUploadPackageSchema.safeParse(proposedPackage);
  if (!acceptedPackage.success) {
    throw schemaFailure(acceptedPackage.error.issues);
  }

  return new File([JSON.stringify(acceptedPackage.data)], 'fixture-proposal.json', {
    type: 'application/json',
  });
}

const fixtureProposalCsvFields = [
  'fixtureEndDate',
  'fixtureMatchType',
  'fixtureTeamType',
  'fixtureGender',
  'fixtureBallsPerOver',
  'fixtureOutcome',
  'fixtureWinner',
  'fixtureSourceVersion',
  'fixtureSourceRevision',
] as const;

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function createFixtureProposalCsvFile(contents: string, metadata: NewFixtureMetadata): File {
  const [submittedHeader, ...submittedRows] = parseCsvRecords(contents);
  if (!submittedHeader || submittedRows.length === 0) {
    throw new SubmissionInputError('The CSV package must include a header and at least one row.');
  }

  const requiredFields = [
    'contractVersion',
    'packageId',
    'competitionName',
    'seasonName',
    'fixtureSourceId',
    'fixtureDate',
    'homeTeamName',
    'awayTeamName',
  ];
  const missingFields = requiredFields.filter((field) => !submittedHeader.includes(field));
  if (missingFields.length > 0) {
    throw new SubmissionInputError(
      `The CSV package is missing required columns: ${missingFields.join(', ')}.`,
    );
  }

  const header = [...submittedHeader];
  for (const field of fixtureProposalCsvFields) {
    if (!header.includes(field)) header.push(field);
  }
  const fieldIndex = new Map(header.map((field, index) => [field, index]));
  const set = (row: string[], field: string, value: string) => {
    row[fieldIndex.get(field)!] = value;
  };
  const rows = submittedRows.map((submittedRow) => {
    const row = [...submittedRow, ...Array(header.length - submittedRow.length).fill('')];
    const packageId = row[fieldIndex.get('packageId')!]?.trim();
    if (!packageId) {
      throw new SubmissionInputError('Every CSV row must include the stable package label.');
    }
    set(row, 'contractVersion', FIXTURE_PROPOSAL_CONTRACT_VERSION);
    set(row, 'competitionName', metadata.competitionName);
    set(row, 'seasonName', metadata.seasonName);
    set(row, 'fixtureSourceId', `submitter:fixture:${encodeURIComponent(packageId)}`);
    set(row, 'fixtureDate', metadata.startDate);
    set(row, 'homeTeamName', metadata.homeTeamName);
    set(row, 'awayTeamName', metadata.awayTeamName);
    set(row, 'fixtureEndDate', metadata.proposal.endDate);
    set(row, 'fixtureMatchType', metadata.proposal.matchType);
    set(row, 'fixtureTeamType', metadata.proposal.teamType);
    set(row, 'fixtureGender', metadata.proposal.gender);
    set(row, 'fixtureBallsPerOver', String(metadata.proposal.ballsPerOver));
    set(row, 'fixtureOutcome', metadata.proposal.outcome);
    set(row, 'fixtureWinner', metadata.proposal.winner ?? '');
    set(row, 'fixtureSourceVersion', metadata.proposal.sourceVersion);
    set(row, 'fixtureSourceRevision', String(metadata.proposal.sourceRevision));
    return row;
  });
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');

  return new File([`${csv}\r\n`], 'fixture-proposal.csv', { type: 'text/csv' });
}

export async function submitLegacyAdminEvents(
  client: AuthenticatedApiClient,
  fixtureId: string,
  eventJson: string,
): Promise<{ response: SubmissionResponse; events: SubmissionEvent[] }> {
  let events: unknown;

  try {
    events = JSON.parse(eventJson) as unknown;
  } catch {
    throw new SubmissionInputError('Enter valid JSON before submitting.');
  }

  const payload = {
    fixtureId,
    schemaVersion: DIRECT_SUBMISSION_SCHEMA_VERSION,
    events,
  };
  const acceptedPayload = submissionRequestSchema.safeParse(payload);
  if (!acceptedPayload.success) {
    throw schemaFailure(acceptedPayload.error.issues);
  }

  const response = await client.request<unknown>('/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(acceptedPayload.data),
  });
  const parsed = submissionResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error('The direct submission API returned an invalid response.');
  }

  return { response: parsed.data, events: acceptedPayload.data.events };
}
