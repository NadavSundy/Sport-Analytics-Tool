import {
  queryDefinitionReferenceSchema,
  unsupportedQueryReasonSchema,
  type AnalyticsQueryDefinition,
} from '@sport-analytics/contracts';
import { describe, expect, it } from 'vitest';
import { EXAMPLE_QUESTIONS } from './examples';
import { describeDefinition, referenceNoun, unsupportedMessage } from './interpretation';

describe('interpreting a definition in plain English', () => {
  it('reads a season leaderboard back as a sentence a reader can check', () => {
    const definition: AnalyticsQueryDefinition = {
      kind: 'leaderboard',
      metric: 'most_runs',
      scope: 'season',
      season: { competitionName: 'Indian Premier League', seasonLabel: '2024' },
      limit: 10,
    };

    expect(describeDefinition(definition)).toBe('Most runs · Indian Premier League 2024 · top 10');
  });

  it('reads a competition leaderboard without a season label', () => {
    expect(
      describeDefinition({
        kind: 'leaderboard',
        metric: 'most_wickets',
        scope: 'competition',
        competition: { name: 'Indian Premier League' },
        limit: 10,
      }),
    ).toBe('Most wickets · Indian Premier League · top 10');
  });

  it.each([
    ['most_runs', 'Most runs'],
    ['most_wickets', 'Most wickets'],
    ['most_fours', 'Most fours'],
    ['most_sixes', 'Most sixes'],
    ['highest_batting_average', 'Highest batting average'],
    ['highest_strike_rate', 'Highest strike rate'],
    ['best_bowling_average', 'Best bowling average'],
    ['best_economy_rate', 'Best economy rate'],
    ['best_bowling_strike_rate', 'Best bowling strike rate'],
  ] as const)('names the %s metric as %s', (metric, label) => {
    expect(
      describeDefinition({
        kind: 'leaderboard',
        metric,
        scope: 'competition',
        competition: { name: 'Indian Premier League' },
        limit: 10,
      }),
    ).toContain(label);
  });

  it('reads a career participant question', () => {
    expect(
      describeDefinition({
        kind: 'participant_statistics',
        participant: { name: 'V Kohli' },
        scope: 'career',
      }),
    ).toBe('V Kohli · career statistics');
  });

  it('reads a season participant question with the season named', () => {
    expect(
      describeDefinition({
        kind: 'participant_statistics',
        participant: { name: 'V Kohli' },
        scope: 'season',
        season: { competitionName: 'Indian Premier League', seasonLabel: '2024' },
      }),
    ).toBe('V Kohli · Indian Premier League 2024');
  });

  it('reads a comparison in the order it was asked', () => {
    expect(
      describeDefinition({
        kind: 'participant_comparison',
        participants: [{ name: 'V Kohli' }, { name: 'RD Gaikwad' }],
        scope: 'career',
      }),
    ).toBe('V Kohli compared with RD Gaikwad · career statistics');
  });

  it('says plainly when the question cannot be answered', () => {
    expect(describeDefinition({ kind: 'unsupported', reason: 'venue' })).toBe(
      'Not answerable from published statistics',
    );
  });
});

describe('unsupported reasons', () => {
  // Every reason the contract can return needs its own sentence; a missing one
  // would leave a reader with no explanation at all.
  it.each(unsupportedQueryReasonSchema.options)('explains the %s reason', (reason) => {
    const message = unsupportedMessage(reason);

    expect(message.length).toBeGreaterThan(10);
    expect(message).toMatch(/[.!]$/);
  });

  it('names the dimension rather than the code', () => {
    expect(unsupportedMessage('bowler_type')).toMatch(/bowler type/i);
    expect(unsupportedMessage('venue')).toMatch(/venue/i);
    expect(unsupportedMessage('match_phase')).toMatch(/powerplay|phase/i);
    expect(unsupportedMessage('batting_hand')).toMatch(/left|hand/i);
    expect(unsupportedMessage('super_over')).toMatch(/super over/i);
  });

  it('gives every reason a distinct sentence', () => {
    const messages = unsupportedQueryReasonSchema.options.map(unsupportedMessage);

    expect(new Set(messages).size).toBe(messages.length);
  });
});

describe('example questions', () => {
  // Confirmed against the deployed public reads for issue #816: each entity
  // exists and resolves to exactly one match.
  it('offers four examples covering the three answerable kinds', () => {
    expect(EXAMPLE_QUESTIONS).toHaveLength(4);
    expect(new Set(EXAMPLE_QUESTIONS.map((example) => example.kind))).toEqual(
      new Set(['leaderboard', 'participant_statistics', 'participant_comparison']),
    );
  });

  it('keeps every example inside the contract bound', () => {
    for (const example of EXAMPLE_QUESTIONS) {
      expect(example.question.trim()).toBe(example.question);
      expect(example.question.length).toBeGreaterThan(0);
      expect(example.question.length).toBeLessThanOrEqual(300);
    }
  });
});

/**
 * Issue #940. A reader who named a competition the platform does not hold was
 * told "Nothing published here matches Austria tour of Hungary", which does not
 * say what kind of thing was looked for. Naming it is what makes the message
 * actionable: a competition that was not found is a different problem from a
 * player that was not found, and leads somewhere different.
 */
describe('naming what was not found', () => {
  // Keyed by the contract's own enum, so a reference added there cannot leave
  // the panel with no noun to use.
  it.each(queryDefinitionReferenceSchema.options)(
    'has a noun for the %s reference',
    (reference) => {
      const noun = referenceNoun(reference);

      expect(noun.singular.length).toBeGreaterThan(0);
      expect(noun.plural.length).toBeGreaterThan(0);
      expect(noun.plural).not.toBe(noun.singular);
    },
  );

  it('calls either side of a comparison a player, as the reader would', () => {
    expect(referenceNoun('participant').singular).toBe('player');
    expect(referenceNoun('participants.0').singular).toBe('player');
    expect(referenceNoun('participants.1').singular).toBe('player');
  });

  it('names a competition and a season as themselves', () => {
    expect(referenceNoun('competition')).toEqual({
      singular: 'competition',
      plural: 'competitions',
    });
    expect(referenceNoun('season')).toEqual({ singular: 'season', plural: 'seasons' });
  });
});

/**
 * Issue #940's second finding. "Who won the 01/09/2007 Kenya vs Pakistan game?"
 * was refused with `outside_cricket_statistics`, whose sentence tells the reader
 * they did not ask a cricket question. A match result is a cricket question this
 * platform does not answer, which is the `other` reason — so that reason's
 * sentence has to say what is and is not published here.
 */
describe('a match-result question', () => {
  it('says the published figures are player figures rather than match results', () => {
    expect(unsupportedMessage('other')).toMatch(/player figures/i);
    expect(unsupportedMessage('other')).toMatch(/match results/i);
  });

  // The wrong label is the defect, so the two sentences must not be confusable.
  it('does not tell the reader they asked about something other than cricket', () => {
    expect(unsupportedMessage('other')).not.toMatch(/not a question about/i);
  });

  it('leaves outside_cricket_statistics for a question that really is not one', () => {
    expect(unsupportedMessage('outside_cricket_statistics')).toMatch(/not a question about/i);
  });
});
