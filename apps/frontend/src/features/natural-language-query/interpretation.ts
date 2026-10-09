import type {
  AnalyticsQueryDefinition,
  LeaderboardMetric,
  QueryDefinitionReference,
  UnsupportedQueryReason,
} from '@sport-analytics/contracts';

/**
 * Turns the definition a question was read as back into a sentence.
 *
 * It is shown before the result, not after it, so a reader can see what was
 * understood before trusting a figure. The platform published the figure; the
 * reading of the question is the only part a reader cannot otherwise check.
 */

const METRIC_LABELS: Record<LeaderboardMetric, string> = {
  most_runs: 'Most runs',
  most_wickets: 'Most wickets',
  most_fours: 'Most fours',
  most_sixes: 'Most sixes',
  highest_batting_average: 'Highest batting average',
  highest_strike_rate: 'Highest strike rate',
  best_bowling_average: 'Best bowling average',
  best_economy_rate: 'Best economy rate',
  best_bowling_strike_rate: 'Best bowling strike rate',
};

/**
 * One sentence per reason the contract can return, naming the dimension in the
 * reader's words rather than repeating the code. Every reason is covered,
 * including the two that are not about a missing dimension at all.
 */
const UNSUPPORTED_MESSAGES: Record<UnsupportedQueryReason, string> = {
  bowler_type: 'Bowler type is not recorded in the data behind these statistics.',
  batting_hand:
    'Whether a batter is left or right handed is not recorded in the data behind these statistics.',
  match_phase:
    'Phases of an innings, such as the powerplay, are not recorded in the data behind these statistics.',
  venue: 'Venues are not recorded against the statistics published here.',
  super_over: 'Super overs are not included in the statistics published here.',
  outside_cricket_statistics: 'That is not a question about the cricket statistics published here.',
  ambiguous: 'That question does not say which player, competition or season it means.',
  // Issue #940. A match result — who won, the final score, the margin — is the
  // commonest question this reason now carries, and it was being refused as
  // `outside_cricket_statistics`, whose sentence tells a reader who asked an
  // ordinary cricket question that they asked about something else. The wording
  // says what is published here instead, which is true of every `other` refusal
  // and not only of a match question.
  other:
    'That question cannot be answered from the statistics published here, which are player figures rather than match results.',
};

export function unsupportedMessage(reason: UnsupportedQueryReason): string {
  return UNSUPPORTED_MESSAGES[reason];
}

/**
 * What a reference in a definition is called when the reader is told it was not
 * found (issue #940).
 *
 * "Nothing published here matches Austria tour of Hungary" did not say what had
 * been looked for, so a reader could not tell a competition the platform does not
 * hold from a player's name they had misspelt — and the two lead somewhere
 * different. Keyed by the contract's own reference enum, so a reference added
 * there fails to compile rather than leaving the panel with no noun.
 *
 * Both sides of a comparison are "player", because the reader asked about players
 * and not about a position in an array.
 */
const REFERENCE_NOUNS: Record<QueryDefinitionReference, { singular: string; plural: string }> = {
  participant: { singular: 'player', plural: 'players' },
  'participants.0': { singular: 'player', plural: 'players' },
  'participants.1': { singular: 'player', plural: 'players' },
  competition: { singular: 'competition', plural: 'competitions' },
  season: { singular: 'season', plural: 'seasons' },
};

export function referenceNoun(reference: QueryDefinitionReference): {
  singular: string;
  plural: string;
} {
  return REFERENCE_NOUNS[reference];
}

function scopeLabel(definition: AnalyticsQueryDefinition): string | null {
  if (definition.kind === 'unsupported') {
    return null;
  }

  if (definition.scope === 'season' && definition.season) {
    return `${definition.season.competitionName} ${definition.season.seasonLabel}`;
  }
  if (definition.scope === 'competition' && definition.competition) {
    return definition.competition.name;
  }
  return definition.scope === 'career' ? 'career statistics' : null;
}

export function describeDefinition(definition: AnalyticsQueryDefinition): string {
  if (definition.kind === 'unsupported') {
    return 'Not answerable from published statistics';
  }

  const scope = scopeLabel(definition);

  if (definition.kind === 'leaderboard') {
    return [METRIC_LABELS[definition.metric], scope, `top ${definition.limit}`]
      .filter(Boolean)
      .join(' · ');
  }

  if (definition.kind === 'participant_statistics') {
    return [definition.participant.name, scope].filter(Boolean).join(' · ');
  }

  const [first, second] = definition.participants;
  return [`${first.name} compared with ${second.name}`, scope].filter(Boolean).join(' · ');
}
