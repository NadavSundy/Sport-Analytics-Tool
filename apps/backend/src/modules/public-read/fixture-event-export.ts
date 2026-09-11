import type { PublicEvent } from '@sport-analytics/contracts';

/**
 * The published fixture-event export format, shared by the filtered export and
 * the calculation-trace export so that both produce identical columns, escaping
 * and filenames.
 */

export interface FixtureEventExportFilenameFilters {
  inningsId?: string | undefined;
  competitorId?: string | undefined;
  participantId?: string | undefined;
  overNumber?: number | undefined;
  wicketKind?: string | undefined;
}

const fixtureEventCsvColumns = [
  'eventId',
  'fixtureId',
  'competitionId',
  'competitionName',
  'inningsId',
  'inningsOrdinal',
  'sequenceNumber',
  'overNumber',
  'positionInOver',
  'ballNumber',
  'battingCompetitorId',
  'battingCompetitorName',
  'bowlingCompetitorId',
  'bowlingCompetitorName',
  'strikerParticipantId',
  'strikerParticipantName',
  'nonStrikerParticipantId',
  'nonStrikerParticipantName',
  'bowlerParticipantId',
  'bowlerParticipantName',
  'runsOffBat',
  'runsExtras',
  'runsTotal',
  'runsNonBoundary',
  'extrasWides',
  'extrasNoBalls',
  'extrasByes',
  'extrasLegByes',
  'extrasPenalty',
  'wicketCount',
  'wicketIds',
  'wicketKinds',
  'playersOutParticipantIds',
  'playersOutParticipantNames',
  'fielderParticipantIds',
  'fielderParticipantNames',
] as const;

function escapeCsvCell(value: boolean | number | string | null): string {
  let text = value === null ? '' : String(value);

  // Prevent spreadsheet applications from interpreting public text as a formula.
  if (/^[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

export function normalizeExportEvent(event: PublicEvent): PublicEvent {
  return {
    ...event,
    extras: {
      wides: event.extras.wides ?? 0,
      noBalls: event.extras.noBalls ?? 0,
      byes: event.extras.byes ?? 0,
      legByes: event.extras.legByes ?? 0,
      penalty: event.extras.penalty ?? 0,
    },
  };
}

function filenamePart(value: string | number): string {
  return String(value).replace(/[^a-zA-Z0-9_-]+/g, '-');
}

export function fixtureEventExportFilename(
  fixtureId: string,
  filters: FixtureEventExportFilenameFilters,
): string {
  const trace = [
    filters.inningsId ? `innings-${filenamePart(filters.inningsId)}` : null,
    filters.competitorId ? `team-${filenamePart(filters.competitorId)}` : null,
    filters.participantId ? `player-${filenamePart(filters.participantId)}` : null,
    filters.overNumber !== undefined ? `over-${filters.overNumber}` : null,
    filters.wicketKind ? `wicket-${filenamePart(filters.wicketKind)}` : null,
  ].filter((part): part is string => part !== null);

  return `fixture-${filenamePart(fixtureId)}-${trace.length > 0 ? trace.join('-') : 'all'}-events.csv`;
}

export function serializeFixtureEventsCsv(events: PublicEvent[]): string {
  const rows = events.map((event) => {
    const wickets = event.wickets;
    const fielderParticipantIds = wickets.flatMap((wicket) =>
      wicket.fielders.flatMap((fielder) =>
        fielder.participantId === null ? [] : [fielder.participantId],
      ),
    );
    const fielderParticipantNames = wickets.flatMap((wicket) =>
      wicket.fielders.flatMap((fielder) =>
        fielder.participantName === null ? [] : [fielder.participantName],
      ),
    );

    const values: Array<boolean | number | string | null> = [
      event.eventId,
      event.fixtureId,
      event.competitionId,
      event.competitionName,
      event.inningsId,
      event.inningsOrdinal,
      event.sequenceNumber,
      event.overNumber,
      event.positionInOver,
      event.ballNumber,
      event.battingCompetitorId,
      event.battingCompetitorName,
      event.bowlingCompetitorId,
      event.bowlingCompetitorName,
      event.strikerParticipantId,
      event.strikerParticipantName,
      event.nonStrikerParticipantId,
      event.nonStrikerParticipantName,
      event.bowlerParticipantId,
      event.bowlerParticipantName,
      event.runs.offBat,
      event.runs.extras,
      event.runs.total,
      event.runs.nonBoundary,
      event.extras.wides ?? 0,
      event.extras.noBalls ?? 0,
      event.extras.byes ?? 0,
      event.extras.legByes ?? 0,
      event.extras.penalty ?? 0,
      wickets.length,
      wickets.map((wicket) => wicket.wicketId).join('|'),
      wickets.map((wicket) => wicket.kind).join('|'),
      wickets.map((wicket) => wicket.playerOutParticipantId).join('|'),
      wickets.map((wicket) => wicket.playerOutParticipantName).join('|'),
      fielderParticipantIds.join('|'),
      fielderParticipantNames.join('|'),
    ];

    return values.map(escapeCsvCell).join(',');
  });

  return [fixtureEventCsvColumns.join(','), ...rows].join('\r\n').concat('\r\n');
}
