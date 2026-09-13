import type { SubmissionEvent } from './submissions';

export type ComparableCricketDelivery = Omit<SubmissionEvent, 'eventId'>;

export interface PublishedCricketFielder {
  participantId: string | null;
  substitute: boolean;
}

export interface PublishedCricketWicket {
  kind: string;
  playerOutId: string;
  fielders: readonly PublishedCricketFielder[];
}

export interface PublishedCricketDelivery {
  inningsId: string;
  sequenceNumber: number;
  overNumber: number;
  positionInOver: number;
  ballNumber: string;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  runs: {
    offBat: number;
    extras: number;
    total: number;
    nonBoundary: boolean;
  };
  extras: {
    wides: number | null;
    noBalls: number | null;
    byes: number | null;
    legByes: number | null;
    penalty: number | null;
  };
  wickets: readonly PublishedCricketWicket[];
}

export type PublishedDeliveryClassification = 'new' | 'exact-duplicate' | 'conflict';

export interface PublishedDeliveryDifference {
  fieldPath: string;
  submittedValue: unknown;
  publishedValue: unknown;
}

export function diffPublishedCricketDelivery(
  submitted: ComparableCricketDelivery,
  published: PublishedCricketDelivery,
): PublishedDeliveryDifference[] {
  const differences: PublishedDeliveryDifference[] = [];
  const push = (fieldPath: string, submittedValue: unknown, publishedValue: unknown) => {
    if (JSON.stringify(submittedValue) !== JSON.stringify(publishedValue)) {
      differences.push({ fieldPath, submittedValue, publishedValue });
    }
  };

  push('inningsId', submitted.inningsId, published.inningsId);
  push('sequenceNumber', submitted.sequenceNumber, published.sequenceNumber);
  push('overNumber', submitted.overNumber, published.overNumber);
  push('positionInOver', submitted.positionInOver, published.positionInOver);
  push('ballNumber', submitted.ballNumber, published.ballNumber);
  push('strikerId', submitted.strikerId, published.strikerId);
  push('nonStrikerId', submitted.nonStrikerId, published.nonStrikerId);
  push('bowlerId', submitted.bowlerId, published.bowlerId);
  push('runs.offBat', submitted.runs.offBat, published.runs.offBat);
  push('runs.extras', submitted.runs.extras, published.runs.extras);
  push('runs.total', submitted.runs.total, published.runs.total);
  push('runs.nonBoundary', submitted.runs.nonBoundary, published.runs.nonBoundary);
  push('extras.wides', submitted.extras.wides ?? 0, published.extras.wides ?? 0);
  push('extras.noBalls', submitted.extras.noBalls ?? 0, published.extras.noBalls ?? 0);
  push('extras.byes', submitted.extras.byes ?? 0, published.extras.byes ?? 0);
  push('extras.legByes', submitted.extras.legByes ?? 0, published.extras.legByes ?? 0);
  push('extras.penalty', submitted.extras.penalty ?? 0, published.extras.penalty ?? 0);
  if (!wicketsEqual(submitted.wickets, published.wickets)) {
    differences.push({
      fieldPath: 'wickets',
      submittedValue: submitted.wickets,
      publishedValue: published.wickets,
    });
  }

  return differences;
}

function extrasEqual(
  submitted: ComparableCricketDelivery['extras'],
  published: PublishedCricketDelivery['extras'],
): boolean {
  return (
    (submitted.wides ?? 0) === (published.wides ?? 0) &&
    (submitted.noBalls ?? 0) === (published.noBalls ?? 0) &&
    (submitted.byes ?? 0) === (published.byes ?? 0) &&
    (submitted.legByes ?? 0) === (published.legByes ?? 0) &&
    (submitted.penalty ?? 0) === (published.penalty ?? 0)
  );
}

function wicketsEqual(
  submitted: ComparableCricketDelivery['wickets'],
  published: PublishedCricketDelivery['wickets'],
): boolean {
  if (submitted.length !== published.length) {
    return false;
  }

  return submitted.every((wicket, wicketIndex) => {
    const existing = published[wicketIndex];

    if (
      existing === undefined ||
      wicket.kind !== existing.kind ||
      wicket.playerOutId !== existing.playerOutId ||
      wicket.fielders.length !== existing.fielders.length
    ) {
      return false;
    }

    return wicket.fielders.every((fielder, fielderIndex) => {
      const existingFielder = existing.fielders[fielderIndex];

      return (
        existingFielder !== undefined &&
        (fielder.participantId ?? null) === existingFielder.participantId &&
        fielder.substitute === existingFielder.substitute
      );
    });
  });
}

/**
 * Classifies a staged canonical delivery against the current published delivery
 * at the same natural position.
 *
 * Event/source identity is deliberately not part of content equality. A retry
 * from another package may carry a different external identity while still
 * describing the same cricket event. Conversely, reusing an external identity
 * never makes different cricket content an exact duplicate.
 */
export function classifyPublishedCricketDelivery(
  submitted: ComparableCricketDelivery,
  published: PublishedCricketDelivery | null,
): PublishedDeliveryClassification {
  if (published === null) {
    return 'new';
  }

  const exact =
    submitted.inningsId === published.inningsId &&
    submitted.sequenceNumber === published.sequenceNumber &&
    submitted.overNumber === published.overNumber &&
    submitted.positionInOver === published.positionInOver &&
    submitted.ballNumber === published.ballNumber &&
    submitted.strikerId === published.strikerId &&
    submitted.nonStrikerId === published.nonStrikerId &&
    submitted.bowlerId === published.bowlerId &&
    submitted.runs.offBat === published.runs.offBat &&
    submitted.runs.extras === published.runs.extras &&
    submitted.runs.total === published.runs.total &&
    submitted.runs.nonBoundary === published.runs.nonBoundary &&
    extrasEqual(submitted.extras, published.extras) &&
    wicketsEqual(submitted.wickets, published.wickets);

  return exact ? 'exact-duplicate' : 'conflict';
}
