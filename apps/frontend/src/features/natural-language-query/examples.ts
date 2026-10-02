import type { AnalyticsQueryKind } from '@sport-analytics/contracts';

/**
 * Questions a visitor can ask and get an answer to.
 *
 * Each one was confirmed twice for issue #816. Its shape comes from a case that
 * passed the issue #815 translation evaluation
 * (`evidence/validation/issue-815-natural-language-evaluation-2026-10-01.md`), and
 * every entity it names was then checked against the deployed public reads: the
 * competition and season are published, each player name matches exactly one
 * participant, and the leaderboard or aggregate it resolves to returns rows.
 *
 * Translating is not the same as resolving, which is why both checks were needed:
 * an example naming a player who no longer resolved uniquely would greet a
 * visitor with an ambiguity prompt rather than an answer.
 */
export interface ExampleQuestion {
  question: string;
  kind: Extract<
    AnalyticsQueryKind,
    'leaderboard' | 'participant_statistics' | 'participant_comparison'
  >;
}

export const EXAMPLE_QUESTIONS: readonly ExampleQuestion[] = [
  {
    question: 'Who scored the most runs in the 2024 Indian Premier League season?',
    kind: 'leaderboard',
  },
  {
    question: 'Who has taken the most wickets in the Indian Premier League?',
    kind: 'leaderboard',
  },
  {
    question: "What are V Kohli's career statistics?",
    kind: 'participant_statistics',
  },
  {
    question: 'Compare V Kohli and RD Gaikwad over their careers',
    kind: 'participant_comparison',
  },
];
