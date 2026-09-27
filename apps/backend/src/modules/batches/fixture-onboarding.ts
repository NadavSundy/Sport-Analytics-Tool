import { storedOutcomes } from './reference-outcomes';

/**
 * Minimal shape needed from a batch item row. Kept narrow (rather than
 * importing the full `BatchItemRecord`) so this module can stay dependency
 * free and be exercised with lightweight fixtures in unit tests.
 */
export interface FixtureOnboardingSourceItem {
  resolvedReferences: unknown;
}

export interface FixtureOnboardingInnings {
  ordinal: number;
  battingTeamName: string;
}

export interface FixtureOnboardingParticipant {
  /** A durable source identifier such as `cricsheet:participant:abcd`, if supplied. */
  sourceId?: string;
  /** A readable display name, if supplied. */
  name?: string;
  /** The team the participant is proposed to belong to, if supplied. */
  teamName?: string;
}

export interface FixtureOnboardingContext {
  innings: FixtureOnboardingInnings[];
  participants: FixtureOnboardingParticipant[];
}

interface SubmittedFixtureReference {
  sourceId?: string;
}

interface SubmittedInningsReference {
  context?: {
    ordinal?: number;
    battingTeam?: { context?: { name?: string } };
  };
}

interface SubmittedParticipantReference {
  sourceId?: string;
  context?: {
    name?: string;
    team?: { context?: { name?: string } };
  };
}

/**
 * Stable identity of a submitted participant within its fixture: the source
 * identifier where one was submitted, otherwise the name and team. Exported so
 * that an onboarding task is keyed by exactly the identity the extraction
 * collected by, and a repeated decision updates its task rather than adding a
 * second one for the same person.
 */
export function participantKey(participant: FixtureOnboardingParticipant): string | null {
  if (participant.sourceId) return `source:${participant.sourceId}`;
  if (participant.name) return `name:${participant.name}::${participant.teamName ?? ''}`;
  return null;
}

function belongsToFixture(
  outcomes: readonly { entityType: string; referencePath: string; submittedReference: unknown }[],
  fixtureReferencePath: string,
  fixtureSourceId: string,
): boolean {
  return outcomes.some((outcome) => {
    if (outcome.entityType !== 'fixture' || outcome.referencePath !== fixtureReferencePath) {
      return false;
    }
    const submitted = outcome.submittedReference as SubmittedFixtureReference | undefined;
    return submitted?.sourceId === fixtureSourceId;
  });
}

function participantFrom(submitted: SubmittedParticipantReference | undefined) {
  return {
    ...(submitted?.sourceId ? { sourceId: submitted.sourceId } : {}),
    ...(submitted?.context?.name ? { name: submitted.context.name } : {}),
    ...(submitted?.context?.team?.context?.name
      ? { teamName: submitted.context.team.context.name }
      : {}),
  } satisfies FixtureOnboardingParticipant;
}

/** One place a participant is named: the item it is on, and the path within it. */
export interface ParticipantReferenceSite {
  itemOrdinal: number;
  referencePath: string;
}

/**
 * Every place each participant of this fixture is named, keyed by the same
 * identity the onboarding task is keyed by.
 *
 * Settling a task puts the person in the squad, but that alone does not make
 * the submission resolve: a participant submitted as a name is matched against
 * squad display names and retained aliases, and a person created from a
 * durable identifier carries that identifier as its display name. Without
 * these paths the reviewer's answer cannot be recorded against the references
 * it answers, and the deliveries stay unresolved for ever. Issue #708.
 */
export function extractParticipantReferenceSites(
  items: readonly (FixtureOnboardingSourceItem & { ordinal: number })[],
  fixtureId: string,
): Map<string, ParticipantReferenceSite[]> {
  const sitesByKey = new Map<string, ParticipantReferenceSite[]>();
  for (const item of items) {
    const outcomes = storedOutcomes(item.resolvedReferences);
    // Scoped to the fixture the task belongs to. The fixture is canonical by
    // the time a task can be settled, so its outcome names it.
    const onThisFixture = outcomes.some(
      (outcome) => outcome.entityType === 'fixture' && outcome.canonicalId === fixtureId,
    );
    if (!onThisFixture) continue;
    for (const outcome of outcomes) {
      if (outcome.entityType !== 'participant') continue;
      const key = participantKey(
        participantFrom(outcome.submittedReference as SubmittedParticipantReference | undefined),
      );
      if (!key) continue;
      sitesByKey.set(key, [
        ...(sitesByKey.get(key) ?? []),
        { itemOrdinal: item.ordinal, referencePath: outcome.referencePath },
      ]);
    }
  }
  return sitesByKey;
}

/**
 * A reviewer-approved fixture proposal only carries fixture-level facts
 * (issue #584): the innings and the squad it needs still live, unresolved,
 * on every delivery event that referenced this fixture before it existed.
 * This walks every item in the batch and collects the distinct innings
 * (ordinal + batting team) and participants (by durable source id, or by
 * name + team) that belong to the fixture identified by `fixtureReferencePath`
 * and `fixtureSourceId`, so the caller can create them deterministically
 * instead of leaving every delivery permanently unresolved.
 */
export function extractFixtureOnboardingContext(
  items: readonly FixtureOnboardingSourceItem[],
  fixtureReferencePath: string,
  fixtureSourceId: string,
): FixtureOnboardingContext {
  const inningsByKey = new Map<string, FixtureOnboardingInnings>();
  const participantsByKey = new Map<string, FixtureOnboardingParticipant>();

  for (const item of items) {
    const outcomes = storedOutcomes(item.resolvedReferences);

    if (!belongsToFixture(outcomes, fixtureReferencePath, fixtureSourceId)) continue;

    for (const outcome of outcomes) {
      if (
        outcome.entityType === 'innings' &&
        outcome.referencePath.startsWith(`${fixtureReferencePath}.innings.`)
      ) {
        const submitted = outcome.submittedReference as SubmittedInningsReference | undefined;
        const ordinal = submitted?.context?.ordinal;
        const battingTeamName = submitted?.context?.battingTeam?.context?.name;
        if (typeof ordinal === 'number' && battingTeamName) {
          inningsByKey.set(`${ordinal}::${battingTeamName}`, { ordinal, battingTeamName });
        }
        continue;
      }

      if (outcome.entityType === 'participant') {
        const participant = participantFrom(
          outcome.submittedReference as SubmittedParticipantReference | undefined,
        );
        const key = participantKey(participant);
        if (key) participantsByKey.set(key, participant);
      }
    }
  }

  return {
    innings: [...inningsByKey.values()],
    participants: [...participantsByKey.values()],
  };
}
