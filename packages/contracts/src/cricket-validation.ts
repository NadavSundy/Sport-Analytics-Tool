export const CRICKET_VALIDATION_RULE_VERSION = '1.0' as const;

export const CRICKET_VALIDATION_RULE_CODES = [
  'STRIKER_TEAM_INVALID',
  'NON_STRIKER_TEAM_INVALID',
  'BOWLER_TEAM_INVALID',
  'DISMISSED_PLAYER_INVALID',
  'UNKNOWN_DISMISSAL_KIND',
  'DUPLICATE_WICKET',
  'CONTRADICTORY_WICKET',
  'BALL_NUMBER_OVER_MISMATCH',
  'SEQUENCE_NOT_INCREASING',
  'BALL_NUMBER_PROGRESSION_INVALID',
  'EXACT_PUBLISHED_DUPLICATE',
  'PUBLISHED_DELIVERY_CONFLICT',
  'FIXTURE_METADATA_CONFLICT',
  'CORRECTION_TARGET_NOT_FOUND',
  'CORRECTION_TARGET_AMBIGUOUS',
  'CORRECTION_TARGET_WRONG_FIXTURE',
  'CORRECTION_TARGET_WRONG_COMPETITION',
] as const;

export type CricketValidationRuleCode = (typeof CRICKET_VALIDATION_RULE_CODES)[number];

export type CricketValidationSeverity = 'error' | 'warning';

export interface CricketValidationResult {
  code: CricketValidationRuleCode;
  ruleVersion: typeof CRICKET_VALIDATION_RULE_VERSION;
  severity: CricketValidationSeverity;
  message: string;
  eventIndex: number;
  fieldPath: string;
}

export interface CricketValidationWicket {
  kind: string;
  playerOutId: string;
}

export interface CricketValidationExtras {
  wides?: number | undefined;
  noBalls?: number | undefined;
  byes?: number | undefined;
  legbyes?: number | undefined;
  penalty?: number | undefined;
}

export interface CricketValidationEvent {
  inningsId: string;
  sequenceNumber: number;
  overNumber: number;
  ballNumber: string;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  extras: CricketValidationExtras;
  wickets: readonly CricketValidationWicket[];
}

export interface CricketValidationInningsContext {
  battingTeamId: string;
  bowlingTeamId: string;
}

export interface CricketValidationContext {
  inningsById: Readonly<Record<string, CricketValidationInningsContext>>;
  participantTeamById: Readonly<Record<string, string>>;
  dismissalKinds?: readonly string[];
}

interface SequenceState {
  sequenceNumber: number;
  eventIndex: number;
}

interface BallState {
  printedBall: number;
  legal: boolean;
  eventIndex: number;
}

interface TerminalWicketState {
  kind: string;
  eventIndex: number;
}

export interface CricketValidationState {
  lastSequenceByInnings: Map<string, SequenceState>;
  previousBallByInningsOver: Map<string, BallState>;
  terminalWicketByInningsPlayer: Map<string, TerminalWicketState>;
}

export interface CricketValidationOptions {
  state?: CricketValidationState;
  eventIndexOffset?: number;
}

const NON_TERMINAL_WICKET_KINDS = new Set(['retired hurt', 'retired not out']);

export function createCricketValidationState(): CricketValidationState {
  return {
    lastSequenceByInnings: new Map(),
    previousBallByInningsOver: new Map(),
    terminalWicketByInningsPlayer: new Map(),
  };
}

function makeResult(
  code: CricketValidationRuleCode,
  eventIndex: number,
  fieldPath: string,
  message: string,
): CricketValidationResult {
  return {
    code,
    ruleVersion: CRICKET_VALIDATION_RULE_VERSION,
    severity: 'error',
    eventIndex,
    fieldPath,
    message,
  };
}

function participantTeam(
  context: CricketValidationContext,
  participantId: string,
): string | undefined {
  return context.participantTeamById[participantId];
}

function isLegalDelivery(event: CricketValidationEvent): boolean {
  return (event.extras.wides ?? 0) === 0 && (event.extras.noBalls ?? 0) === 0;
}

export function validateCricketBusinessRules(
  events: readonly CricketValidationEvent[],
  context: CricketValidationContext,
  options: CricketValidationOptions = {},
): CricketValidationResult[] {
  const results: CricketValidationResult[] = [];
  const state = options.state ?? createCricketValidationState();
  const eventIndexOffset = options.eventIndexOffset ?? 0;

  const allowedDismissalKinds =
    context.dismissalKinds === undefined ? undefined : new Set(context.dismissalKinds);

  for (const [localEventIndex, event] of events.entries()) {
    const eventIndex = eventIndexOffset + localEventIndex;
    const innings = context.inningsById[event.inningsId];

    const previousSequence = state.lastSequenceByInnings.get(event.inningsId);

    const sequenceProgresses =
      previousSequence === undefined || event.sequenceNumber > previousSequence.sequenceNumber;

    if (!sequenceProgresses && previousSequence !== undefined) {
      results.push(
        makeResult(
          'SEQUENCE_NOT_INCREASING',
          eventIndex,
          'sequenceNumber',
          `Sequence number ${String(event.sequenceNumber)} must be greater than the previous sequence number ${String(previousSequence.sequenceNumber)} from event ${String(previousSequence.eventIndex)}.`,
        ),
      );
    }

    if (sequenceProgresses) {
      state.lastSequenceByInnings.set(event.inningsId, {
        sequenceNumber: event.sequenceNumber,
        eventIndex,
      });
    }

    if (innings !== undefined) {
      const strikerTeam = participantTeam(context, event.strikerId);

      if (strikerTeam !== undefined && strikerTeam !== innings.battingTeamId) {
        results.push(
          makeResult(
            'STRIKER_TEAM_INVALID',
            eventIndex,
            'strikerId',
            'The striker must belong to the batting team for the innings.',
          ),
        );
      }

      const nonStrikerTeam = participantTeam(context, event.nonStrikerId);

      if (nonStrikerTeam !== undefined && nonStrikerTeam !== innings.battingTeamId) {
        results.push(
          makeResult(
            'NON_STRIKER_TEAM_INVALID',
            eventIndex,
            'nonStrikerId',
            'The non-striker must belong to the batting team for the innings.',
          ),
        );
      }

      const bowlerTeam = participantTeam(context, event.bowlerId);

      if (bowlerTeam !== undefined && bowlerTeam !== innings.bowlingTeamId) {
        results.push(
          makeResult(
            'BOWLER_TEAM_INVALID',
            eventIndex,
            'bowlerId',
            'The bowler must belong to the bowling team for the innings.',
          ),
        );
      }
    }

    const ballMatch = /^(\d{1,3})\.(\d{1,2})$/.exec(event.ballNumber);

    if (ballMatch !== null) {
      const printedOver = Number(ballMatch[1]);
      const printedBall = Number(ballMatch[2]);

      if (printedOver !== event.overNumber) {
        results.push(
          makeResult(
            'BALL_NUMBER_OVER_MISMATCH',
            eventIndex,
            'ballNumber',
            'The printed ball number must use the same over number as overNumber.',
          ),
        );
      } else if (sequenceProgresses) {
        const ballKey = `${event.inningsId}:${String(event.overNumber)}`;

        const previousBall = state.previousBallByInningsOver.get(ballKey);

        if (previousBall !== undefined) {
          const expectedPrintedBall = previousBall.printedBall + (previousBall.legal ? 1 : 0);

          if (printedBall !== expectedPrintedBall) {
            results.push(
              makeResult(
                'BALL_NUMBER_PROGRESSION_INVALID',
                eventIndex,
                'ballNumber',
                `Printed ball ${event.ballNumber} does not follow the previous delivery: expected ball ${String(event.overNumber)}.${String(expectedPrintedBall)} after event ${String(previousBall.eventIndex)}.`,
              ),
            );
          }
        }

        state.previousBallByInningsOver.set(ballKey, {
          printedBall,
          legal: isLegalDelivery(event),
          eventIndex,
        });
      }
    }

    for (const [wicketIndex, wicket] of event.wickets.entries()) {
      if (innings !== undefined) {
        const dismissedTeam = participantTeam(context, wicket.playerOutId);

        if (dismissedTeam !== undefined && dismissedTeam !== innings.battingTeamId) {
          results.push(
            makeResult(
              'DISMISSED_PLAYER_INVALID',
              eventIndex,
              `wickets.${wicketIndex}.playerOutId`,
              'The dismissed player must belong to the batting team for the innings.',
            ),
          );
        }
      }

      if (allowedDismissalKinds !== undefined && !allowedDismissalKinds.has(wicket.kind)) {
        results.push(
          makeResult(
            'UNKNOWN_DISMISSAL_KIND',
            eventIndex,
            `wickets.${wicketIndex}.kind`,
            'The dismissal kind is not recognised by the configured cricket vocabulary.',
          ),
        );
      }

      if (NON_TERMINAL_WICKET_KINDS.has(wicket.kind)) {
        continue;
      }

      const wicketKey = `${event.inningsId}:${wicket.playerOutId}`;

      const previous = state.terminalWicketByInningsPlayer.get(wicketKey);

      if (previous === undefined) {
        state.terminalWicketByInningsPlayer.set(wicketKey, {
          kind: wicket.kind,
          eventIndex,
        });
        continue;
      }

      if (previous.kind === wicket.kind) {
        results.push(
          makeResult(
            'DUPLICATE_WICKET',
            eventIndex,
            `wickets.${wicketIndex}`,
            `Player ${wicket.playerOutId} already has the same terminal dismissal in event ${String(previous.eventIndex)}.`,
          ),
        );
      } else {
        results.push(
          makeResult(
            'CONTRADICTORY_WICKET',
            eventIndex,
            `wickets.${wicketIndex}`,
            `Player ${wicket.playerOutId} already has terminal dismissal "${previous.kind}" in event ${String(previous.eventIndex)}.`,
          ),
        );
      }
    }
  }

  return results;
}
