import type { BatchReportItem } from '@sport-analytics/contracts';

type Resolution = BatchReportItem['referenceResolutions'][number];

export interface FixtureReferenceDescription {
  title: string | null;
  date: string | null;
  venue: string | null;
  sourceReference: string | null;
}

export interface GroupedReferenceResolutions {
  /** The unresolved fixture every dependent reference is waiting on. */
  fixture: Resolution | null;
  /** References that cannot resolve until the fixture resolves (shown beneath it). */
  dependents: Resolution[];
  /** References that fail for their own reasons. */
  independent: Resolution[];
}

/** Entity types whose resolution is scoped to a fixture and so fail with it. */
const FIXTURE_SCOPED_ENTITY_TYPES = new Set<Resolution['entityType']>(['innings']);

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function contextName(value: unknown): string | null {
  return text(record(record(value)?.context)?.name);
}

function readableDate(value: unknown): string | null {
  const raw = text(value);
  if (!raw || !/^\d{4}-\d{2}-\d{2}/.test(raw)) return null;
  const parsed = new Date(`${raw.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

function ordinal(value: number): string {
  const remainder100 = value % 100;
  if (remainder100 >= 11 && remainder100 <= 13) return `${value}th`;
  return `${value}${['th', 'st', 'nd', 'rd'][value % 10] ?? 'th'}`;
}

export function describeFixtureReference(submitted: unknown): FixtureReferenceDescription {
  const fixture = record(submitted);
  const context = record(fixture?.context);
  const teams = Array.isArray(context?.teams)
    ? context.teams.map(contextName).filter((name): name is string => name !== null)
    : [];
  return {
    title: teams.length > 0 ? teams.join(' vs ') : null,
    date: readableDate(context?.date),
    venue: text(context?.venue),
    sourceReference: text(fixture?.sourceId),
  };
}

export function describeInningsReference(submitted: unknown): string | null {
  const context = record(record(submitted)?.context);
  const inningsOrdinal =
    typeof context?.ordinal === 'number' && Number.isInteger(context.ordinal) && context.ordinal > 0
      ? `${ordinal(context.ordinal)} innings`
      : null;
  const battingTeam = contextName(context?.battingTeam);
  if (!inningsOrdinal && !battingTeam) return null;
  if (!battingTeam) return inningsOrdinal;
  return `${inningsOrdinal ?? 'Innings'}, ${battingTeam} batting`;
}

export function groupReferenceResolutions(
  resolutions: readonly Resolution[],
): GroupedReferenceResolutions {
  const fixture = resolutions.find((resolution) => resolution.entityType === 'fixture') ?? null;
  if (!fixture) return { fixture: null, dependents: [], independent: [...resolutions] };
  const others = resolutions.filter((resolution) => resolution !== fixture);
  return {
    fixture,
    dependents: others.filter((resolution) =>
      FIXTURE_SCOPED_ENTITY_TYPES.has(resolution.entityType),
    ),
    independent: others.filter(
      (resolution) => !FIXTURE_SCOPED_ENTITY_TYPES.has(resolution.entityType),
    ),
  };
}
