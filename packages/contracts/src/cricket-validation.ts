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

export interface CricketValidationEvent {
  inningsId: string;
  overNumber: number;
  ballNumber: string;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
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

const NON_TERMINAL_WICKET_KINDS = new Set(['retired hurt', 'retired not out']);

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

export function validateCricketBusinessRules(
  events: readonly CricketValidationEvent[],
  context: CricketValidationContext,
): CricketValidationResult[] {
  const results: CricketValidationResult[] = [];

  const allowedDismissalKinds =
    context.dismissalKinds === undefined ? undefined : new Set(context.dismissalKinds);

  const terminalWicketByPlayer = new Map<string, { kind: string; eventIndex: number }>();

  for (const [eventIndex, event] of events.entries()) {
    const innings = context.inningsById[event.inningsId];

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

    const printedOver = Number.parseInt(event.ballNumber.split('.')[0] ?? '', 10);

    if (Number.isInteger(printedOver) && printedOver !== event.overNumber) {
      results.push(
        makeResult(
          'BALL_NUMBER_OVER_MISMATCH',
          eventIndex,
          'ballNumber',
          'The printed ball number must use the same over number as overNumber.',
        ),
      );
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
      const previous = terminalWicketByPlayer.get(wicketKey);

      if (previous === undefined) {
        terminalWicketByPlayer.set(wicketKey, {
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
            `Player ${wicket.playerOutId} already has the same terminal dismissal in event ${previous.eventIndex}.`,
          ),
        );
      } else {
        results.push(
          makeResult(
            'CONTRADICTORY_WICKET',
            eventIndex,
            `wickets.${wicketIndex}`,
            `Player ${wicket.playerOutId} already has terminal dismissal "${previous.kind}" in event ${previous.eventIndex}.`,
          ),
        );
      }
    }
  }

  return results;
}
