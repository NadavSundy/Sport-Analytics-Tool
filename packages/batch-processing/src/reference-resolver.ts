/**
 * Resolve the human-facing references in a batch package to canonical records.
 *
 * The corpus importer resolves a reference by creating whatever it does not find:
 * every `ON CONFLICT ... DO UPDATE` in `scripts/ingest-match-data.ts` is a
 * create-on-sight resolution over trusted operator input. A batch package is
 * untrusted submitter input, so the trust model here is the opposite. An unknown
 * or ambiguous reference becomes a staged state that a reviewer acts on. Nothing
 * is created, and nothing is thrown: `requirePerson` in the importer has the
 * right refusal semantics but the wrong delivery mechanism, because a thrown
 * error stops a payload that must instead accumulate its faults.
 *
 * The policy implemented here is specified by section 3.6 of
 * `docs/architecture/batch-ingestion-pipeline.md`:
 *
 *   - Exact match on a namespaced source identifier, or exact match on a name
 *     within scope, or nothing. There is no fuzzy matching and no ranking by
 *     similarity, in any position, including as a fallback.
 *   - Resolution is scoped competition, then fixture, then innings and
 *     participant. A name is never treated as globally unique. Measured over the
 *     imported corpus, a display name is ambiguous for 354 people globally but
 *     collides inside a single fixture squad in only 8 of 14,011 fixtures, which
 *     is what makes squad-scoped name resolution workable and global name
 *     resolution unsafe. `scripts/queries/360-reference-ambiguity.sql` repeats
 *     that measurement.
 *   - A missing or ambiguous reference is staged with the candidates that make
 *     it actionable, and a canonical record is never created silently.
 *
 * Section 7.4 forbids a database query per item. Every lookup below is issued
 * once per package over the whole set of references, in three dependency-ordered
 * phases, so the number of round trips is fixed rather than proportional to the
 * number of events. At approximately 173 ms per round trip that is the
 * difference between a constant cost and one that grows with the season.
 */

import type { SeasonUploadPackage } from '@sport-analytics/contracts';

import { executeQuery, type QueryExecutor } from './database';

/**
 * The namespace whose source identifiers correspond to the values held in
 * `person.source_ref` and `fixture.source_ref`.
 *
 * Those columns store a bare provider reference with no namespace of their own,
 * so the namespace cannot be compared column to column. Restricting comparison
 * to a single known namespace is the strongest form of section 3.6's rule that
 * "identifiers are compared only within the same namespace and entity type" that
 * the present schema supports. An identifier from any other namespace resolves
 * to nothing and is staged, rather than being matched against a value that may
 * mean something different elsewhere.
 */
const CANONICAL_SOURCE_NAMESPACE = 'cricsheet';
const APPLICATION_SOURCE_NAMESPACE = 'app';

/**
 * Entity types this resolver produces outcomes for. `season` is deliberately
 * absent: the schema has no season relation, `fixture.season` is free text, and
 * issue #360 does not name it. A submitted season narrows the fixture lookup and
 * resolves to nothing of its own.
 */
export type ReferenceEntityType = 'competition' | 'team' | 'fixture' | 'innings' | 'participant';

/** Mirrors the `batch_reference_resolution_state` enum. */
type ReferenceResolutionState = 'resolved' | 'ambiguous' | 'unresolved' | 'invalid';

/** How a resolved reference was matched. Recorded for provenance. */
type ReferenceMatchMethod =
  | 'source-identifier'
  | 'application-id'
  | 'exact-name'
  | 'exact-alias'
  | 'natural-key'
  | 'ordinal'
  | 'manual';

export interface ReferenceResolutionOverride {
  entityType: ReferenceEntityType;
  canonicalId: string;
}

interface ReferenceCandidate {
  canonicalId: string;
  label: string;
  /** Matched, but outside the scope the package declared. */
  outOfScope?: boolean;
}

export interface ReferenceOutcome {
  referencePath: string;
  entityType: ReferenceEntityType;
  state: ReferenceResolutionState;
  submittedReference: unknown;
  canonicalId: string | null;
  matchedBy: ReferenceMatchMethod | null;
  candidates: ReferenceCandidate[];
  reason: string | null;
}

/** One staged item: the resolution outcome for a single submitted delivery. */
interface ResolvedPackageItem {
  /** Position of the event within the package, for correlating with expansion. */
  fixtureIndex: number;
  inningsIndex: number;
  eventIndex: number;
  referencePath: string;
  /** The submitted delivery identity, stored in `batch_item.source_identity`. */
  sourceIdentity: string;
  /** Canonical innings, or null while the reference is not resolved. */
  inningsId: string | null;
  /** Roll-up written to `batch_item.reference_resolution_state`. */
  state: ReferenceResolutionState;
  /** Provenance written to `batch_item.resolved_references`. */
  resolvedReferences: Record<string, unknown>;
}

export interface PackageResolution {
  /** Every reference in the package, in traversal order. */
  outcomes: ReferenceOutcome[];
  /** One entry per submitted event. */
  items: ResolvedPackageItem[];
}

interface SourceIdentifier {
  namespace: string;
  entityType: string;
  value: string;
}

interface ReferenceInput {
  sourceId?: string | undefined;
  context?: unknown;
}

interface NamedRow {
  canonicalId: string;
  name: string;
}

interface FixtureBySourceRefRow {
  canonicalId: string;
  sourceRef: string;
  competitionId: string | null;
  season: string | null;
  startDate: string | null;
  teamIds: string[];
  venue: string | null;
}

interface FixtureByNaturalKeyRow {
  canonicalId: string;
  competitionId: string | null;
  season: string | null;
  startDate: string;
  teamIds: string[];
}

interface InningsRow {
  canonicalId: string;
  fixtureId: string;
  ordinal: number;
  battingTeamId: string | null;
}

interface SquadMemberRow {
  fixtureId: string;
  canonicalId: string;
  displayName: string;
  sourceRef: string | null;
}

interface SquadAliasRow {
  fixtureId: string;
  canonicalId: string;
  name: string;
}

/**
 * Item-state precedence. A reference contradicting the declared scope is worse
 * than one that is merely unknown, and an unknown reference needs a creation
 * decision where an ambiguous one needs only a selection.
 */
const STATE_PRECEDENCE: Record<ReferenceResolutionState, number> = {
  resolved: 0,
  ambiguous: 1,
  unresolved: 2,
  invalid: 3,
};

function worstState(states: ReferenceResolutionState[]): ReferenceResolutionState {
  return states.reduce<ReferenceResolutionState>(
    (worst, state) => (STATE_PRECEDENCE[state] > STATE_PRECEDENCE[worst] ? state : worst),
    'resolved',
  );
}

/**
 * Split `namespace:entityType:value`. The contract already constrains the shape;
 * this reads it without re-validating and returns null for anything it cannot
 * split, so that a caller stages rather than assumes.
 */
function parseSourceIdentifier(value: string): SourceIdentifier | null {
  const firstSeparator = value.indexOf(':');
  if (firstSeparator < 1) {
    return null;
  }

  const secondSeparator = value.indexOf(':', firstSeparator + 1);
  if (secondSeparator < firstSeparator + 2) {
    return null;
  }

  const remainder = value.slice(secondSeparator + 1);
  if (remainder.length === 0) {
    return null;
  }

  return {
    namespace: value.slice(0, firstSeparator),
    entityType: value.slice(firstSeparator + 1, secondSeparator),
    value: remainder,
  };
}

function outcome(
  referencePath: string,
  entityType: ReferenceEntityType,
  submittedReference: unknown,
  state: ReferenceResolutionState,
  detail: {
    canonicalId?: string | null;
    matchedBy?: ReferenceMatchMethod | null;
    candidates?: ReferenceCandidate[];
    reason?: string | null;
  } = {},
): ReferenceOutcome {
  return {
    referencePath,
    entityType,
    state,
    submittedReference,
    canonicalId: detail.canonicalId ?? null,
    matchedBy: detail.matchedBy ?? null,
    candidates: detail.candidates ?? [],
    reason: detail.reason ?? null,
  };
}

function applyOverride(
  value: ReferenceOutcome,
  overrides: ReadonlyMap<string, ReferenceResolutionOverride>,
): ReferenceOutcome {
  const override = overrides.get(value.referencePath);
  if (!override || value.state === 'resolved' || override.entityType !== value.entityType)
    return value;
  const selected = value.candidates.find(
    (candidate) => candidate.canonicalId === override.canonicalId && !candidate.outOfScope,
  );
  return selected
    ? {
        ...value,
        state: 'resolved',
        canonicalId: selected.canonicalId,
        matchedBy: 'manual',
        reason: `Mapped to ${selected.label} by an authorised user.`,
      }
    : value;
}

/** Reduce an outcome to the provenance recorded against a staged item. */
function provenance(value: ReferenceOutcome): Record<string, unknown> {
  return {
    referencePath: value.referencePath,
    entityType: value.entityType,
    state: value.state,
    submittedReference: value.submittedReference,
    canonicalId: value.canonicalId,
    matchedBy: value.matchedBy,
    candidates: value.candidates,
    reason: value.reason,
  };
}

function readableName(reference: ReferenceInput): string | null {
  const context = reference.context;
  if (!context || typeof context !== 'object') {
    return null;
  }

  const name = (context as { name?: unknown }).name;
  return typeof name === 'string' && name.length > 0 ? name : null;
}

function distinct(values: string[]): string[] {
  return [...new Set(values)];
}

function groupBy<Row, Key>(rows: Row[], key: (row: Row) => Key): Map<Key, Row[]> {
  const grouped = new Map<Key, Row[]>();

  for (const row of rows) {
    const rowKey = key(row);
    const existing = grouped.get(rowKey);

    if (existing) {
      existing.push(row);
    } else {
      grouped.set(rowKey, [row]);
    }
  }

  return grouped;
}

/**
 * Explain that a source identifier can never resolve this entity type, and name
 * the key that can.
 *
 * `competition`, `team` and `innings` hold no source-reference column, and #360
 * adds none: they resolve by name or ordinal within scope. Saying so is the
 * difference between guidance a submitter can act on and a bare "not found"
 * that invites them to retry the same package unchanged.
 */
function unsupportedSourceIdentifier(
  entityType: ReferenceEntityType,
  supportedKey: string,
): string {
  return (
    `Source identifiers are not supported for a ${entityType}: the platform holds no source-reference ` +
    `column for it, so a source identifier can never resolve, on this or any later attempt. ` +
    `Supply ${supportedKey} instead.`
  );
}

/** Note that an unsupported source identifier was ignored in favour of the name. */
function ignoredSourceIdentifier(entityType: ReferenceEntityType, supportedKey: string): string {
  return (
    `The submitted source identifier was ignored: source identifiers are not supported for a ` +
    `${entityType}. Resolution used ${supportedKey}.`
  );
}

function withNote(note: string | null, reason: string): string {
  return note ? `${note} ${reason}` : reason;
}

/**
 * Whether a fixture source identifier can never be compared with a stored
 * record. Only `CANONICAL_SOURCE_NAMESPACE` (against `fixture.source_ref`) and,
 * since #480, `APPLICATION_SOURCE_NAMESPACE` (against `fixture.fixture_id`) are
 * compared. An identifier that cannot be read at all is not covered here; it
 * stays invalid.
 */
function isIncomparableFixtureSourceIdentifier(sourceId: string): boolean {
  const identifier = parseSourceIdentifier(sourceId);
  return (
    identifier !== null &&
    identifier.namespace !== CANONICAL_SOURCE_NAMESPACE &&
    identifier.namespace !== APPLICATION_SOURCE_NAMESPACE
  );
}

/** Note that an incomparable fixture identifier was ignored in favour of the natural key. */
function ignoredFixtureSourceIdentifier(sourceId: string): string {
  return (
    `The submitted source identifier "${sourceId}" was ignored: only "${CANONICAL_SOURCE_NAMESPACE}" ` +
    `and "${APPLICATION_SOURCE_NAMESPACE}" fixture identifiers can be compared. ` +
    `Resolution used the fixture date and teams.`
  );
}

/**
 * Resolve a reference whose only available key is an exact name, such as a
 * competition or a team.
 */
function resolveNamedReference(
  referencePath: string,
  entityType: ReferenceEntityType,
  reference: ReferenceInput,
  name: string | null,
  rowsByName: Map<string, NamedRow[]>,
  supportedKey: string,
): ReferenceOutcome {
  const submitted = { sourceId: reference.sourceId, context: reference.context };

  // A source identifier can never resolve this entity type, because no
  // source-reference column exists to compare against and #360 adds none. That
  // is a different situation from a reference that simply was not found this
  // time, so it is reported as such rather than left to read as absence.
  if (reference.sourceId && !name) {
    return outcome(referencePath, entityType, submitted, 'unresolved', {
      reason: unsupportedSourceIdentifier(entityType, supportedKey),
    });
  }

  if (!name) {
    return outcome(referencePath, entityType, submitted, 'invalid', {
      reason: 'The reference carries neither a source identifier nor a readable name.',
    });
  }

  // Where the reference carries both, the name is the supported key and is
  // used. The ignored identifier is still recorded, so the submitter learns the
  // field had no effect.
  const ignoredNote = reference.sourceId ? ignoredSourceIdentifier(entityType, supportedKey) : null;

  const matches = rowsByName.get(name) ?? [];

  if (matches.length === 1) {
    return outcome(referencePath, entityType, submitted, 'resolved', {
      canonicalId: matches[0]!.canonicalId,
      matchedBy: 'exact-name',
      reason: ignoredNote,
    });
  }

  if (matches.length > 1) {
    return outcome(referencePath, entityType, submitted, 'ambiguous', {
      candidates: matches.map((row) => ({ canonicalId: row.canonicalId, label: row.name })),
      reason: withNote(
        ignoredNote,
        `The name "${name}" matches ${String(matches.length)} records. A name is not treated as unique, so the choice is left to review.`,
      ),
    });
  }

  return outcome(referencePath, entityType, submitted, 'unresolved', {
    reason: withNote(ignoredNote, `No record has the exact name "${name}".`),
  });
}

function fixtureLabel(startDate: string | null, season: string | null): string {
  return `${startDate ?? 'unknown date'} (${season ?? 'unknown season'})`;
}

function resolveFixtureBySourceId(
  referencePath: string,
  submitted: unknown,
  sourceId: string,
  context: {
    date: string;
    venue?: string | undefined;
  } | null,
  teamOutcomes: ReferenceOutcome[],
  fixtureBySourceRef: Map<string, FixtureBySourceRefRow[]>,
  fixtureByCanonicalId: Map<string, FixtureBySourceRefRow[]>,
  competitionId: string,
  seasonName: string | null,
): ReferenceOutcome {
  const identifier = parseSourceIdentifier(sourceId);

  if (!identifier) {
    return outcome(referencePath, 'fixture', submitted, 'invalid', {
      reason: 'The source identifier could not be read as namespace:entityType:value.',
    });
  }

  let matches: FixtureBySourceRefRow[];
  let matchMethod: ReferenceMatchMethod;
  let missingReason: string;

  if (identifier.namespace === CANONICAL_SOURCE_NAMESPACE) {
    matches = fixtureBySourceRef.get(identifier.value) ?? [];
    matchMethod = 'source-identifier';
    missingReason = `No fixture carries the source reference "${identifier.value}".`;
  } else if (identifier.namespace === APPLICATION_SOURCE_NAMESPACE) {
    if (!/^[1-9]\d*$/.test(identifier.value)) {
      return outcome(referencePath, 'fixture', submitted, 'invalid', {
        reason: 'An application fixture reference must contain a positive database identifier.',
      });
    }
    matches = fixtureByCanonicalId.get(identifier.value) ?? [];
    matchMethod = 'application-id';
    missingReason = `No fixture has application identifier "${identifier.value}".`;
  } else {
    return outcome(referencePath, 'fixture', submitted, 'unresolved', {
      reason: `Source identifiers are compared only within the "${CANONICAL_SOURCE_NAMESPACE}" or "${APPLICATION_SOURCE_NAMESPACE}" namespaces; this reference names "${identifier.namespace}".`,
    });
  }

  if (matches.length === 0) {
    return outcome(referencePath, 'fixture', submitted, 'unresolved', { reason: missingReason });
  }

  // `fixture.source_ref` is unique, so more than one match is not reachable
  // through the present schema. The branch is kept so that relaxing that
  // constraint stages the reference rather than silently taking the first row.
  if (matches.length > 1) {
    return outcome(referencePath, 'fixture', submitted, 'ambiguous', {
      candidates: matches.map((row) => ({
        canonicalId: row.canonicalId,
        label: fixtureLabel(row.startDate, row.season),
      })),
      reason: 'More than one fixture carries this source reference.',
    });
  }

  const match = matches[0]!;

  // The reference is known and contradicts the competition the package declared.
  // That is a different fault from an unknown reference: it cannot be settled by
  // creating anything, and section 12.1 requires competition scope to be
  // enforced per item rather than only per batch.
  if (match.competitionId !== competitionId) {
    return outcome(referencePath, 'fixture', submitted, 'invalid', {
      candidates: [
        {
          canonicalId: match.canonicalId,
          label: fixtureLabel(match.startDate, match.season),
          outOfScope: true,
        },
      ],
      reason:
        'The fixture exists but belongs to a different competition from the one this package declares.',
    });
  }

  if (context && teamOutcomes.some((value) => value.state !== 'resolved')) {
    return outcome(referencePath, 'fixture', submitted, 'unresolved', {
      candidates: [
        {
          canonicalId: match.canonicalId,
          label: fixtureLabel(match.startDate, match.season),
        },
      ],
      reason:
        'The fixture source identifier resolved, but the supplied fixture-team metadata could not be resolved, so it cannot be checked against the canonical fixture.',
    });
  }

  const metadataConflicts: string[] = [];

  if (context && match.startDate !== context.date) {
    metadataConflicts.push(
      `date (submitted ${context.date}, canonical ${match.startDate ?? 'unknown'})`,
    );
  }

  if (seasonName !== null && match.season !== seasonName) {
    metadataConflicts.push(
      `season (submitted ${seasonName}, canonical ${match.season ?? 'unknown'})`,
    );
  }

  if (context) {
    const submittedTeamIds = teamOutcomes.map((value) => value.canonicalId as string).sort();
    const canonicalTeamIds = match.teamIds.slice().sort();

    const teamsMatch =
      submittedTeamIds.length === canonicalTeamIds.length &&
      submittedTeamIds.every((teamId, index) => teamId === canonicalTeamIds[index]);

    if (!teamsMatch) {
      metadataConflicts.push('team pair');
    }

    if (context.venue !== undefined && context.venue !== match.venue) {
      metadataConflicts.push(
        `venue (submitted ${context.venue}, canonical ${match.venue ?? 'unknown'})`,
      );
    }
  }

  if (metadataConflicts.length > 0) {
    return outcome(referencePath, 'fixture', submitted, 'invalid', {
      candidates: [
        {
          canonicalId: match.canonicalId,
          label: fixtureLabel(match.startDate, match.season),
        },
      ],
      reason:
        'FIXTURE_METADATA_CONFLICT: The fixture source identifier resolves to canonical data that disagrees with the submitted ' +
        metadataConflicts.join(', ') +
        '. Canonical fixture data is not changed by batch resolution.',
    });
  }

  return outcome(referencePath, 'fixture', submitted, 'resolved', {
    canonicalId: match.canonicalId,
    matchedBy: matchMethod,
  });
}

function resolveFixtureByNaturalKey(
  referencePath: string,
  submitted: unknown,
  context: { date: string },
  teamOutcomes: ReferenceOutcome[],
  candidateRows: FixtureByNaturalKeyRow[],
  seasonName: string | null,
  ignoredNote: string | null = null,
): ReferenceOutcome {
  if (teamOutcomes.some((value) => value.state !== 'resolved')) {
    return outcome(referencePath, 'fixture', submitted, 'unresolved', {
      reason: withNote(
        ignoredNote,
        'The fixture natural key is expressed in terms of its teams, and at least one team reference did not resolve.',
      ),
    });
  }

  const teamIds = teamOutcomes.map((value) => value.canonicalId as string).sort();

  const matches = candidateRows.filter((row) => {
    if (row.startDate !== context.date) {
      return false;
    }

    // The season narrows the key when the package supplies one. A mismatch
    // stages the fixture rather than being quietly ignored.
    if (seasonName !== null && row.season !== seasonName) {
      return false;
    }

    const rowTeamIds = row.teamIds.slice().sort();
    return (
      rowTeamIds.length === teamIds.length &&
      rowTeamIds.every((teamId, index) => teamId === teamIds[index])
    );
  });

  if (matches.length === 1) {
    return outcome(referencePath, 'fixture', submitted, 'resolved', {
      canonicalId: matches[0]!.canonicalId,
      matchedBy: 'natural-key',
      reason: ignoredNote,
    });
  }

  // Measured over the corpus, 131 of 13,880 natural keys identify two fixtures,
  // so this is a real outcome rather than a defensive branch.
  if (matches.length > 1) {
    return outcome(referencePath, 'fixture', submitted, 'ambiguous', {
      candidates: matches.map((row) => ({
        canonicalId: row.canonicalId,
        label: fixtureLabel(row.startDate, row.season),
      })),
      reason: withNote(
        ignoredNote,
        `The competition, season, date and teams identify ${String(matches.length)} fixtures.`,
      ),
    });
  }

  return outcome(referencePath, 'fixture', submitted, 'unresolved', {
    reason: withNote(
      ignoredNote,
      'No fixture in the declared competition matches this date, season and pair of teams. A new fixture is a review decision, not a resolution.',
    ),
  });
}

function resolveInnings(
  referencePath: string,
  submitted: unknown,
  sourceId: string | undefined,
  context: { ordinal: number } | null,
  fixtureOutcome: ReferenceOutcome,
  inningsRows: InningsRow[],
  battingTeamOutcome: ReferenceOutcome | null,
): ReferenceOutcome {
  if (fixtureOutcome.state !== 'resolved') {
    return outcome(referencePath, 'innings', submitted, 'unresolved', {
      reason:
        'The fixture reference did not resolve, so no innings scope is available. An innings is never matched outside its fixture.',
    });
  }

  const inningsKey = 'the innings ordinal and batting team';
  let matches: InningsRow[];
  let matchedBy: ReferenceMatchMethod;
  let note: string | null = null;

  if (sourceId) {
    const identifier = parseSourceIdentifier(sourceId);
    if (!identifier) {
      return outcome(referencePath, 'innings', submitted, 'invalid', {
        reason: 'The source identifier could not be read as namespace:entityType:value.',
      });
    }

    if (identifier.namespace === APPLICATION_SOURCE_NAMESPACE) {
      if (!/^[1-9]\d*$/.test(identifier.value)) {
        return outcome(referencePath, 'innings', submitted, 'invalid', {
          reason: 'An application innings reference must contain a positive database identifier.',
        });
      }
      matches = inningsRows.filter((row) => row.canonicalId === identifier.value);
      matchedBy = 'application-id';
    } else {
      if (!context) {
        return outcome(referencePath, 'innings', submitted, 'unresolved', {
          reason: unsupportedSourceIdentifier('innings', inningsKey),
        });
      }
      matches = inningsRows.filter((row) => row.ordinal === context.ordinal);
      matchedBy = 'ordinal';
      note = ignoredSourceIdentifier('innings', inningsKey);
    }
  } else if (context) {
    matches = inningsRows.filter((row) => row.ordinal === context.ordinal);
    matchedBy = 'ordinal';
  } else {
    return outcome(referencePath, 'innings', submitted, 'invalid', {
      reason: 'The innings reference carries neither a source identifier nor readable context.',
    });
  }

  if (matches.length === 0) {
    return outcome(referencePath, 'innings', submitted, 'unresolved', {
      reason: sourceId?.startsWith(`${APPLICATION_SOURCE_NAMESPACE}:`)
        ? 'The application innings identifier does not belong to the resolved fixture.'
        : withNote(
            note,
            `The resolved fixture has no innings with ordinal ${String(context?.ordinal)}.`,
          ),
    });
  }

  if (matches.length > 1) {
    return outcome(referencePath, 'innings', submitted, 'ambiguous', {
      candidates: matches.map((row) => ({
        canonicalId: row.canonicalId,
        label: `innings ${String(row.ordinal)}`,
      })),
      reason: withNote(note, 'More than one innings matched within the resolved fixture.'),
    });
  }

  const match = matches[0]!;

  if (context && match.ordinal !== context.ordinal) {
    return outcome(referencePath, 'innings', submitted, 'invalid', {
      candidates: [{ canonicalId: match.canonicalId, label: `innings ${String(match.ordinal)}` }],
      reason:
        'The application innings identifier resolves to a different ordinal from the submitted context.',
    });
  }

  if (
    battingTeamOutcome &&
    battingTeamOutcome.state === 'resolved' &&
    match.battingTeamId !== null &&
    match.battingTeamId !== battingTeamOutcome.canonicalId
  ) {
    return outcome(referencePath, 'innings', submitted, 'invalid', {
      candidates: [{ canonicalId: match.canonicalId, label: `innings ${String(match.ordinal)}` }],
      reason: withNote(
        note,
        'The innings records a different batting team from the one submitted.',
      ),
    });
  }

  return outcome(referencePath, 'innings', submitted, 'resolved', {
    canonicalId: match.canonicalId,
    matchedBy,
    reason: note,
  });
}

function resolveParticipant(
  referencePath: string,
  reference: ReferenceInput,
  fixtureOutcome: ReferenceOutcome,
  squadBySourceRef: Map<string, SquadMemberRow[]>,
  squadByCanonicalId: Map<string, SquadMemberRow[]>,
  squadByDisplayName: Map<string, SquadMemberRow[]>,
  squadByAlias: Map<string, SquadAliasRow[]>,
): ReferenceOutcome {
  const submitted = { sourceId: reference.sourceId, context: reference.context };

  if (fixtureOutcome.state !== 'resolved') {
    return outcome(referencePath, 'participant', submitted, 'unresolved', {
      reason:
        'The fixture reference did not resolve, so no squad scope is available. A participant name is never matched globally.',
    });
  }

  if (reference.sourceId) {
    const identifier = parseSourceIdentifier(reference.sourceId);

    if (!identifier) {
      return outcome(referencePath, 'participant', submitted, 'invalid', {
        reason: 'The source identifier could not be read as namespace:entityType:value.',
      });
    }

    if (identifier.namespace === APPLICATION_SOURCE_NAMESPACE) {
      if (!/^[1-9]\d*$/.test(identifier.value)) {
        return outcome(referencePath, 'participant', submitted, 'invalid', {
          reason:
            'An application participant reference must contain a positive database identifier.',
        });
      }
      const matches = squadByCanonicalId.get(identifier.value) ?? [];
      if (matches.length === 1) {
        return outcome(referencePath, 'participant', submitted, 'resolved', {
          canonicalId: matches[0]!.canonicalId,
          matchedBy: 'application-id',
        });
      }
      return outcome(referencePath, 'participant', submitted, 'unresolved', {
        reason: `Participant "${identifier.value}" is not a member of the resolved fixture squad.`,
      });
    }

    if (identifier.namespace !== CANONICAL_SOURCE_NAMESPACE) {
      return outcome(referencePath, 'participant', submitted, 'unresolved', {
        reason: `Source identifiers are compared only within the "${CANONICAL_SOURCE_NAMESPACE}" or "${APPLICATION_SOURCE_NAMESPACE}" namespaces; this reference names "${identifier.namespace}".`,
      });
    }

    const matches = squadBySourceRef.get(identifier.value) ?? [];

    if (matches.length === 1) {
      return outcome(referencePath, 'participant', submitted, 'resolved', {
        canonicalId: matches[0]!.canonicalId,
        matchedBy: 'source-identifier',
      });
    }

    return outcome(referencePath, 'participant', submitted, 'unresolved', {
      reason: `No member of the resolved fixture squad carries the source reference "${identifier.value}".`,
    });
  }

  const name = readableName(reference);

  if (!name) {
    return outcome(referencePath, 'participant', submitted, 'invalid', {
      reason: 'The participant reference carries neither a source identifier nor a readable name.',
    });
  }

  const byDisplayName = squadByDisplayName.get(name) ?? [];

  if (byDisplayName.length === 1) {
    return outcome(referencePath, 'participant', submitted, 'resolved', {
      canonicalId: byDisplayName[0]!.canonicalId,
      matchedBy: 'exact-name',
    });
  }

  if (byDisplayName.length > 1) {
    return outcome(referencePath, 'participant', submitted, 'ambiguous', {
      candidates: byDisplayName.map((member) => ({
        canonicalId: member.canonicalId,
        label: member.displayName,
      })),
      reason: `The name "${name}" belongs to ${String(byDisplayName.length)} members of this fixture squad.`,
    });
  }

  // A participant renamed since the fixture was recorded is matched on a unique
  // exact alias within the resolved fixture, and the alias match is recorded.
  const distinctAliasPeople = distinct(
    (squadByAlias.get(name) ?? []).map((alias) => alias.canonicalId),
  );

  if (distinctAliasPeople.length === 1) {
    return outcome(referencePath, 'participant', submitted, 'resolved', {
      canonicalId: distinctAliasPeople[0]!,
      matchedBy: 'exact-alias',
    });
  }

  if (distinctAliasPeople.length > 1) {
    return outcome(referencePath, 'participant', submitted, 'ambiguous', {
      candidates: distinctAliasPeople.map((canonicalId) => ({ canonicalId, label: name })),
      reason: `The alias "${name}" belongs to ${String(distinctAliasPeople.length)} members of this fixture squad.`,
    });
  }

  return outcome(referencePath, 'participant', submitted, 'unresolved', {
    reason: `No member of the resolved fixture squad is named "${name}", under that name or any recorded alias.`,
  });
}

/**
 * Resolve every reference in one package.
 *
 * The executor is caller-owned so that a worker can resolve inside the same
 * transaction that writes its chunk, and so that tests can roll back.
 */
export async function resolvePackageReferences(
  client: QueryExecutor,
  uploadPackage: SeasonUploadPackage,
  overrides: ReadonlyMap<string, ReferenceResolutionOverride> = new Map(),
): Promise<PackageResolution> {
  const outcomes: ReferenceOutcome[] = [];
  const items: ResolvedPackageItem[] = [];

  // ---- phase A: competition and teams -----------------------------------
  //
  // Both are looked up by exact name over the whole package, one statement each.
  // Teams are not scoped by competition: a team legitimately appears in many
  // competitions, 160 of 371 in the corpus and one in 84, so the team name is
  // the only key available. Where a name is not unique the reference is staged
  // ambiguous rather than resolved to an arbitrary row.

  const competitionName = readableName(uploadPackage.competition);

  const teamReferences: { path: string; reference: ReferenceInput }[] = [];
  for (const [fixtureIndex, fixture] of uploadPackage.fixtures.entries()) {
    for (const [teamIndex, team] of (fixture.context?.teams ?? []).entries()) {
      teamReferences.push({
        path: `fixtures.${String(fixtureIndex)}.context.teams.${String(teamIndex)}`,
        reference: team,
      });
    }

    for (const [inningsIndex, innings] of fixture.innings.entries()) {
      if (innings.context?.battingTeam) {
        teamReferences.push({
          path: `fixtures.${String(fixtureIndex)}.innings.${String(inningsIndex)}.context.battingTeam`,
          reference: innings.context.battingTeam,
        });
      }
    }
  }

  const teamNames = distinct(
    teamReferences.flatMap(({ reference }) => {
      const name = readableName(reference);
      return name ? [name] : [];
    }),
  );

  const [competitionRows, teamRows] = await Promise.all([
    competitionName
      ? executeQuery<NamedRow>(
          client,
          `SELECT competition_id::text AS "canonicalId", name
             FROM competition
            WHERE name = ANY($1::text[])`,
          [[competitionName]],
        ).then((result) => result.rows)
      : Promise.resolve<NamedRow[]>([]),
    teamNames.length > 0
      ? executeQuery<NamedRow>(
          client,
          `SELECT team_id::text AS "canonicalId", name
             FROM team
            WHERE name = ANY($1::text[])`,
          [teamNames],
        ).then((result) => result.rows)
      : Promise.resolve<NamedRow[]>([]),
  ]);

  const competitionsByName = groupBy(competitionRows, (row) => row.name);
  const teamsByName = groupBy(teamRows, (row) => row.name);

  const competitionOutcome = applyOverride(
    resolveNamedReference(
      'competition',
      'competition',
      uploadPackage.competition,
      competitionName,
      competitionsByName,
      'the competition name',
    ),
    overrides,
  );
  outcomes.push(competitionOutcome);

  const competitionId = competitionOutcome.canonicalId;

  const teamOutcomeByPath = new Map<string, ReferenceOutcome>();
  for (const { path, reference } of teamReferences) {
    if (teamOutcomeByPath.has(path)) {
      continue;
    }

    const resolved = applyOverride(
      resolveNamedReference(
        path,
        'team',
        reference,
        readableName(reference),
        teamsByName,
        'the team name',
      ),
      overrides,
    );
    teamOutcomeByPath.set(path, resolved);
    outcomes.push(resolved);
  }

  // ---- phase B: fixtures -------------------------------------------------

  const fixtureSourceValues = distinct(
    uploadPackage.fixtures.flatMap((fixture) => {
      const identifier = fixture.sourceId ? parseSourceIdentifier(fixture.sourceId) : null;
      return identifier && identifier.namespace === CANONICAL_SOURCE_NAMESPACE
        ? [identifier.value]
        : [];
    }),
  );

  const fixtureCanonicalValues = distinct(
    uploadPackage.fixtures.flatMap((fixture) => {
      const identifier = fixture.sourceId ? parseSourceIdentifier(fixture.sourceId) : null;
      return identifier &&
        identifier.namespace === APPLICATION_SOURCE_NAMESPACE &&
        /^[1-9]\d*$/.test(identifier.value)
        ? [identifier.value]
        : [];
    }),
  );

  const fixtureDates = distinct(
    uploadPackage.fixtures.flatMap((fixture) =>
      fixture.context?.date ? [fixture.context.date] : [],
    ),
  );

  const [fixtureBySourceRows, fixtureByCanonicalRows, fixtureByNaturalKeyRows] = await Promise.all([
    fixtureSourceValues.length > 0
      ? executeQuery<FixtureBySourceRefRow>(
          client,
          `SELECT f.fixture_id::text                  AS "canonicalId",
                  f.source_ref                        AS "sourceRef",
                  f.competition_id::text              AS "competitionId",
                  f.season,
                  to_char(f.start_date, 'YYYY-MM-DD') AS "startDate",
                  v.name                              AS venue,
                  COALESCE(
                    array_agg(ft.team_id::text ORDER BY ft.team_id)
                      FILTER (WHERE ft.team_id IS NOT NULL),
                    ARRAY[]::text[]
                  )                                   AS "teamIds"
             FROM fixture f
             LEFT JOIN venue v ON v.venue_id = f.venue_id
             LEFT JOIN fixture_team ft ON ft.fixture_id = f.fixture_id
            WHERE f.source_ref = ANY($1::text[])
            GROUP BY
              f.fixture_id,
              f.source_ref,
              f.competition_id,
              f.season,
              f.start_date,
              v.name`,
          [fixtureSourceValues],
        ).then((result) => result.rows)
      : Promise.resolve<FixtureBySourceRefRow[]>([]),
    fixtureCanonicalValues.length > 0
      ? executeQuery<FixtureBySourceRefRow>(
          client,
          `SELECT f.fixture_id::text                  AS "canonicalId",
                  f.source_ref                        AS "sourceRef",
                  f.competition_id::text              AS "competitionId",
                  f.season,
                  to_char(f.start_date, 'YYYY-MM-DD') AS "startDate",
                  v.name                              AS venue,
                  COALESCE(
                    array_agg(ft.team_id::text ORDER BY ft.team_id)
                      FILTER (WHERE ft.team_id IS NOT NULL),
                    ARRAY[]::text[]
                  )                                   AS "teamIds"
             FROM fixture f
             LEFT JOIN venue v ON v.venue_id = f.venue_id
             LEFT JOIN fixture_team ft ON ft.fixture_id = f.fixture_id
            WHERE f.fixture_id = ANY($1::bigint[])
            GROUP BY
              f.fixture_id,
              f.source_ref,
              f.competition_id,
              f.season,
              f.start_date,
              v.name`,
          [fixtureCanonicalValues],
        ).then((result) => result.rows)
      : Promise.resolve<FixtureBySourceRefRow[]>([]),
    competitionId !== null && fixtureDates.length > 0
      ? executeQuery<FixtureByNaturalKeyRow>(
          client,
          `SELECT f.fixture_id::text                    AS "canonicalId",
                  f.competition_id::text                AS "competitionId",
                  f.season,
                  to_char(f.start_date, 'YYYY-MM-DD')   AS "startDate",
                  COALESCE(
                    array_agg(ft.team_id::text ORDER BY ft.team_id)
                      FILTER (WHERE ft.team_id IS NOT NULL),
                    ARRAY[]::text[]
                  )                                     AS "teamIds"
             FROM fixture f
             LEFT JOIN fixture_team ft ON ft.fixture_id = f.fixture_id
            WHERE f.competition_id = $1::bigint
              AND f.start_date = ANY($2::date[])
            GROUP BY f.fixture_id, f.competition_id, f.season, f.start_date`,
          [competitionId, fixtureDates],
        ).then((result) => result.rows)
      : Promise.resolve<FixtureByNaturalKeyRow[]>([]),
  ]);

  const fixtureBySourceRef = groupBy(fixtureBySourceRows, (row) => row.sourceRef);
  const fixtureByCanonicalId = groupBy(fixtureByCanonicalRows, (row) => row.canonicalId);
  const fixtureResolutions: ReferenceOutcome[] = [];

  for (const [fixtureIndex, fixture] of uploadPackage.fixtures.entries()) {
    const fixturePath = `fixtures.${String(fixtureIndex)}`;
    const fixtureSeason = fixture.season ?? uploadPackage.season;
    const fixtureSeasonName = readableName(fixtureSeason);
    const submitted = {
      sourceId: fixture.sourceId,
      context: fixture.context,
      proposal: fixture.proposal,
      season: fixtureSeason,
    };

    let resolvedFixture: ReferenceOutcome;

    const fixtureTeamOutcomes = (fixture.context?.teams ?? []).map((_team, teamIndex) =>
      teamOutcomeByPath.get(`${fixturePath}.context.teams.${String(teamIndex)}`)!,
    );

    if (competitionId === null) {
      resolvedFixture = outcome(fixturePath, 'fixture', submitted, 'unresolved', {
        reason:
          'The competition reference did not resolve, so no fixture scope is available. Resolution is scoped from competition to fixture and is not attempted globally.',
      });
    } else if (
      fixture.sourceId &&
      !(fixture.context && isIncomparableFixtureSourceIdentifier(fixture.sourceId))
    ) {
      resolvedFixture = resolveFixtureBySourceId(
        fixturePath,
        submitted,
        fixture.sourceId,
        fixture.context ?? null,
        fixtureTeamOutcomes,
        fixtureBySourceRef,
        fixtureByCanonicalId,
        competitionId,
        fixtureSeasonName,
      );
    } else if (fixture.context) {
      // Section 3.7 applied to the fixture (#500). An identifier from a namespace
      // that is never compared can never resolve, so readable context is the
      // supported key. The templates published before #500 carried such a
      // placeholder, and copies already downloaded keep it. A comparable
      // `cricsheet` or `app` (#480) identifier never reaches this arm.
      resolvedFixture = resolveFixtureByNaturalKey(
        fixturePath,
        submitted,
        fixture.context,
        fixtureTeamOutcomes,
        fixtureByNaturalKeyRows,
        fixtureSeasonName,
        fixture.sourceId ? ignoredFixtureSourceIdentifier(fixture.sourceId) : null,
      );
    } else {
      // The contract requires a sourceId or context. This arm keeps the resolver
      // total rather than assuming the contract has run.
      resolvedFixture = outcome(fixturePath, 'fixture', submitted, 'invalid', {
        reason: 'The fixture reference carries neither a source identifier nor readable context.',
      });
    }

    resolvedFixture = applyOverride(resolvedFixture, overrides);
    outcomes.push(resolvedFixture);
    fixtureResolutions.push(resolvedFixture);
  }

  // ---- phase C: innings and participants ---------------------------------
  //
  // Both are scoped to the fixtures resolved above, so both are loaded once over
  // the whole set of resolved fixtures.

  const resolvedFixtureIds = distinct(
    fixtureResolutions.flatMap((value) =>
      value.state === 'resolved' && value.canonicalId ? [value.canonicalId] : [],
    ),
  );

  const [inningsRows, squadRows, aliasRows] = await Promise.all([
    resolvedFixtureIds.length > 0
      ? executeQuery<InningsRow>(
          client,
          `SELECT innings_id::text      AS "canonicalId",
                  fixture_id::text      AS "fixtureId",
                  ordinal,
                  batting_team_id::text AS "battingTeamId"
             FROM innings
            WHERE fixture_id = ANY($1::bigint[])`,
          [resolvedFixtureIds],
        ).then((result) => result.rows)
      : Promise.resolve<InningsRow[]>([]),
    resolvedFixtureIds.length > 0
      ? executeQuery<SquadMemberRow>(
          client,
          `SELECT fs.fixture_id::text AS "fixtureId",
                  p.person_id::text   AS "canonicalId",
                  p.display_name      AS "displayName",
                  p.source_ref        AS "sourceRef"
             FROM fixture_squad fs
             JOIN person p ON p.person_id = fs.person_id
            WHERE fs.fixture_id = ANY($1::bigint[])`,
          [resolvedFixtureIds],
        ).then((result) => result.rows)
      : Promise.resolve<SquadMemberRow[]>([]),
    resolvedFixtureIds.length > 0
      ? executeQuery<SquadAliasRow>(
          client,
          `SELECT fs.fixture_id::text AS "fixtureId",
                  pa.person_id::text  AS "canonicalId",
                  pa.name
             FROM fixture_squad fs
             JOIN person_alias pa ON pa.person_id = fs.person_id
            WHERE fs.fixture_id = ANY($1::bigint[])`,
          [resolvedFixtureIds],
        ).then((result) => result.rows)
      : Promise.resolve<SquadAliasRow[]>([]),
  ]);

  const inningsByFixture = groupBy(inningsRows, (row) => row.fixtureId);
  const squadByFixture = groupBy(squadRows, (row) => row.fixtureId);
  const aliasesByFixture = groupBy(aliasRows, (row) => row.fixtureId);

  for (const [fixtureIndex, fixture] of uploadPackage.fixtures.entries()) {
    const fixturePath = `fixtures.${String(fixtureIndex)}`;
    const fixtureOutcome = fixtureResolutions[fixtureIndex]!;
    const fixtureId = fixtureOutcome.state === 'resolved' ? fixtureOutcome.canonicalId : null;

    const squad = fixtureId ? (squadByFixture.get(fixtureId) ?? []) : [];
    const aliases = fixtureId ? (aliasesByFixture.get(fixtureId) ?? []) : [];

    const squadBySourceRef = groupBy(
      squad.filter((member): member is SquadMemberRow & { sourceRef: string } =>
        Boolean(member.sourceRef),
      ),
      (member) => member.sourceRef,
    );
    const squadByCanonicalId = groupBy(squad, (member) => member.canonicalId);
    const squadByDisplayName = groupBy(squad, (member) => member.displayName);
    const squadByAlias = groupBy(aliases, (alias) => alias.name);

    for (const [inningsIndex, innings] of fixture.innings.entries()) {
      const inningsPath = `${fixturePath}.innings.${String(inningsIndex)}`;
      const submittedInnings = {
        sourceId: innings.sourceId,
        context: innings.context,
        ...(innings.powerplays === undefined ? {} : { powerplays: innings.powerplays }),
      };

      const battingTeamOutcome =
        teamOutcomeByPath.get(`${inningsPath}.context.battingTeam`) ?? null;

      const inningsOutcome = applyOverride(
        resolveInnings(
          inningsPath,
          submittedInnings,
          innings.sourceId,
          innings.context ?? null,
          fixtureOutcome,
          fixtureId ? (inningsByFixture.get(fixtureId) ?? []) : [],
          battingTeamOutcome,
        ),
        overrides,
      );
      outcomes.push(inningsOutcome);

      for (const [eventIndex, event] of innings.events.entries()) {
        const eventPath = `${inningsPath}.events.${String(eventIndex)}`;

        const participantReferences: Array<[string, typeof event.striker]> = [
          ['striker', event.striker],
          ['nonStriker', event.nonStriker],
          ['bowler', event.bowler],
        ];

        for (const [wicketIndex, wicket] of event.wickets.entries()) {
          participantReferences.push([
            `wickets.${String(wicketIndex)}.playerOut`,
            wicket.playerOut,
          ]);

          for (const [fielderIndex, fielder] of wicket.fielders.entries()) {
            if (fielder.participant) {
              participantReferences.push([
                `wickets.${String(wicketIndex)}.fielders.${String(fielderIndex)}.participant`,
                fielder.participant,
              ]);
            }
          }
        }

        const participantOutcomes = participantReferences.map(([role, reference]) => {
          const participantOutcome = applyOverride(
            resolveParticipant(
              `${eventPath}.${role}`,
              reference,
              fixtureOutcome,
              squadBySourceRef,
              squadByCanonicalId,
              squadByDisplayName,
              squadByAlias,
            ),
            overrides,
          );
          outcomes.push(participantOutcome);
          return [role, participantOutcome] as const;
        });

        items.push({
          fixtureIndex,
          inningsIndex,
          eventIndex,
          referencePath: eventPath,
          sourceIdentity: event.eventId,
          inningsId: inningsOutcome.state === 'resolved' ? inningsOutcome.canonicalId : null,
          state: worstState([
            competitionOutcome.state,
            fixtureOutcome.state,
            inningsOutcome.state,
            ...participantOutcomes.map(([, value]) => value.state),
          ]),
          resolvedReferences: {
            competition: provenance(competitionOutcome),
            fixture: provenance(fixtureOutcome),
            innings: provenance(inningsOutcome),
            participants: Object.fromEntries(
              participantOutcomes.map(([role, value]) => [role, provenance(value)]),
            ),
          },
        });
      }
    }
  }

  return { outcomes, items };
}
