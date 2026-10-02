import {
  unsupportedQueryReasonSchema,
  type AnalyticsQueryDefinition,
} from '@sport-analytics/contracts';
import { describe, expect, it } from 'vitest';
import { EXAMPLE_QUESTIONS } from './examples';
import { describeDefinition, unsupportedMessage } from './interpretation';

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
