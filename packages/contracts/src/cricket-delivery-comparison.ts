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
