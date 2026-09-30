import { z } from 'zod';

import {
  leaderboardMetricSchema,
  participantAggregateScopeSchema,
  type ParticipantAggregateScope,
} from './public-read';

/**
 * The contract a natural-language question is translated into before the API
 * answers it.
 *
 * A question is turned into one of the query definitions below, the definition
 * is validated against this schema, and the definition is then answered by the
 * statistics the platform already publishes. Nothing here describes a new
 * calculation: every kind names an existing published result.
 *
 * This schema is the boundary a translated question has to cross, so it is
 * deliberately closed rather than expressive:
 *
 *   - every object is `.strict()`, so an unrecognised property is rejected
 *     rather than ignored;
 *   - every value is an enumerated choice, a bounded whole number, or a bounded
 *     name hint, so no part of a definition is free text; and
 *   - a name hint is only ever a hint. It is resolved to an identifier by an
 *     ordinary server-side lookup and is never treated as anything but a bound
 *     query parameter.
 *
 * A question the published statistics cannot answer is represented explicitly
 * by the `unsupported` kind, so an unanswerable question fails as a named
 * outcome rather than as a definition that looks answerable.
 */
export const QUERY_DEFINITION_VERSION = '1.0' as const;

/**
 * The kinds of question a definition can express, in the order the
 * discriminated union declares them. A test holds this list and the union's
 * discriminator values together.
 */
export const ANALYTICS_QUERY_KINDS = [
  'leaderboard',
  'participant_statistics',
  'participant_comparison',
  'unsupported',
] as const;

// ---------------------------------------------------------------------------
// Name hints
// ---------------------------------------------------------------------------

const NAME_HINT_MAX_LENGTH = 100;

/**
 * Control, format, surrogate and private-use code points. A name hint is
 * display-derived text, so none of these belong in one: they carry no name and
 * are the categories that smuggle line breaks, bidirectional overrides and
 * invisible separators through something that is later shown to a reader.
 * Assigned letters, marks and punctuation of every script are left alone,
 * because cricket names carry apostrophes, hyphens, spaces and accents.
 */
const NAME_HINT_DISALLOWED_CODE_POINTS = /^[^\p{Cc}\p{Cf}\p{Cs}\p{Co}]+$/u;

const nameHintSchema = z
  .string()
  .trim()
  .min(1)
  .max(NAME_HINT_MAX_LENGTH)
  .regex(
    NAME_HINT_DISALLOWED_CODE_POINTS,
    'A name may not contain control or formatting characters.',
  );

/** A player named the way the reader named them, resolved server-side. */
export const analyticsParticipantReferenceSchema = z.object({ name: nameHintSchema }).strict();

/** A competition named the way the reader named them, resolved server-side. */
export const analyticsCompetitionReferenceSchema = z.object({ name: nameHintSchema }).strict();

/**
 * A season has no name of its own: it is a competition together with a label,
 * which is also how `seasonId` is composed for the published API.
 */
export const analyticsSeasonReferenceSchema = z
  .object({
    competitionName: nameHintSchema,
    seasonLabel: nameHintSchema,
  })
  .strict();

// ---------------------------------------------------------------------------
// Scope and reference
// ---------------------------------------------------------------------------

/**
 * The leaderboard endpoint ranks a season or a competition, never a career.
 * Extracting those two from the published aggregate scope keeps the two
 * vocabularies from drifting apart instead of restating them as a second enum.
 */
const leaderboardScopeSchema = participantAggregateScopeSchema.extract(['season', 'competition']);

const SCOPE_REFERENCE_FIELDS = ['season', 'competition'] as const;

const scopeReferenceShape = {
  season: analyticsSeasonReferenceSchema.optional(),
  competition: analyticsCompetitionReferenceSchema.optional(),
};

interface ScopedQueryDefinition {
  scope: ParticipantAggregateScope;
  season?: AnalyticsSeasonReference | undefined;
  competition?: AnalyticsCompetitionReference | undefined;
}

/**
 * Ties `scope` to the reference it names: a season scope carries a season
 * reference, a competition scope carries a competition reference, and a career
 * scope carries neither.
 *
 * A nested discriminated union on `scope` would express this in the shape
 * itself, and would be preferable, but Zod 3's `discriminatedUnion` reads the
 * discriminator out of an option's `shape`, so an option may only be a plain
 * object: neither a nested discriminated union nor a `.superRefine()`-ed object
 * has a `shape` to read. Expressing the rule in the shape would therefore have
 * forced `scope` to become a nested object on the wire, which is a worse thing
 * to ask a translation step to emit than a flat `scope` string.
 *
 * The rule is applied once over the whole union instead. Each reference stays
 * optional in the shape, but this check rejects both a reference the scope
 * requires and is missing, and a reference the scope does not take, so a
 * definition can never carry a reference that would go unused.
 */
function checkScopeReference(definition: ScopedQueryDefinition, context: z.RefinementCtx): void {
  const requiredReference = definition.scope === 'career' ? null : definition.scope;

  for (const reference of SCOPE_REFERENCE_FIELDS) {
    const present = definition[reference] !== undefined;

    if (reference === requiredReference && !present) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [reference],
        message: `A ${definition.scope}-scoped question requires a ${reference} reference.`,
      });
      continue;
    }

    if (reference !== requiredReference && present) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [reference],
        message: `A ${definition.scope}-scoped question must not carry a ${reference} reference.`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Query definitions
// ---------------------------------------------------------------------------

/** Ranks players within one season or competition, as the published leaderboard does. */
export const leaderboardQueryDefinitionSchema = z
  .object({
    kind: z.literal('leaderboard'),
    metric: leaderboardMetricSchema,
    scope: leaderboardScopeSchema,
    ...scopeReferenceShape,
    // The published leaderboard's own bound. A definition names a number of
    // rows to rank; it may not ask for an unbounded ranking.
    limit: z.number().int().min(1).max(50).default(10),
  })
  .strict();

/** One player's published season, competition-wide or career figures. */
export const participantStatisticsQueryDefinitionSchema = z
  .object({
    kind: z.literal('participant_statistics'),
    participant: analyticsParticipantReferenceSchema,
    scope: participantAggregateScopeSchema,
    ...scopeReferenceShape,
  })
  .strict();

/**
 * Two players' published figures at the same scope. Exactly two, because this
 * answers a comparison rather than standing in for an unbounded list of
 * participant look-ups.
 */
export const participantComparisonQueryDefinitionSchema = z
  .object({
    kind: z.literal('participant_comparison'),
    participants: z.tuple([
      analyticsParticipantReferenceSchema,
      analyticsParticipantReferenceSchema,
    ]),
    scope: participantAggregateScopeSchema,
    ...scopeReferenceShape,
  })
  .strict();

/**
 * A question the published statistics do not answer. The reasons name the
 * dimensions the platform does not hold, rather than reporting a generic
 * failure, so a reader can be told why.
 */
export const unsupportedQueryReasonSchema = z.enum([
  'bowler_type',
  'batting_hand',
  'match_phase',
  'venue',
  'super_over',
  'outside_cricket_statistics',
  'ambiguous',
  'other',
]);

export const unsupportedQueryDefinitionSchema = z
  .object({
    kind: z.literal('unsupported'),
    reason: unsupportedQueryReasonSchema,
  })
  .strict();

export const analyticsQueryDefinitionSchema = z
  .discriminatedUnion('kind', [
    leaderboardQueryDefinitionSchema,
    participantStatisticsQueryDefinitionSchema,
    participantComparisonQueryDefinitionSchema,
    unsupportedQueryDefinitionSchema,
  ])
  .superRefine((definition, context) => {
    if (definition.kind === 'unsupported') {
      return;
    }

    checkScopeReference(definition, context);
  });

// ---------------------------------------------------------------------------
// Derived types
// ---------------------------------------------------------------------------

export type AnalyticsQueryKind = (typeof ANALYTICS_QUERY_KINDS)[number];

export type AnalyticsParticipantReference = z.infer<typeof analyticsParticipantReferenceSchema>;
export type AnalyticsCompetitionReference = z.infer<typeof analyticsCompetitionReferenceSchema>;
export type AnalyticsSeasonReference = z.infer<typeof analyticsSeasonReferenceSchema>;

export type LeaderboardQueryDefinition = z.infer<typeof leaderboardQueryDefinitionSchema>;
export type ParticipantStatisticsQueryDefinition = z.infer<
  typeof participantStatisticsQueryDefinitionSchema
>;
export type ParticipantComparisonQueryDefinition = z.infer<
  typeof participantComparisonQueryDefinitionSchema
>;
export type UnsupportedQueryReason = z.infer<typeof unsupportedQueryReasonSchema>;
export type UnsupportedQueryDefinition = z.infer<typeof unsupportedQueryDefinitionSchema>;
export type AnalyticsQueryDefinition = z.infer<typeof analyticsQueryDefinitionSchema>;

// ---------------------------------------------------------------------------
// Translation prompt description
// ---------------------------------------------------------------------------

/**
 * What each unsupported reason means. The record is keyed by the reason type,
 * so a reason added to the enum without an explanation fails to compile.
 */
const UNSUPPORTED_QUERY_REASON_GUIDANCE: Record<UnsupportedQueryReason, string> = {
  bowler_type: 'the question turns on a bowling type or style, which is not recorded',
  batting_hand: 'the question turns on which hand a player bats with, which is not recorded',
  match_phase:
    'the question names a phase of an innings, such as the death overs, which is not published as a scope',
  venue: 'the question turns on a ground or city, which is not published as a statistic scope',
  super_over: 'the question is about super-over figures, which are excluded from published figures',
  outside_cricket_statistics: 'the question is not about published cricket statistics at all',
  ambiguous: 'the question does not say which player, competition or season it means',
  other: 'the question cannot be answered from the published statistics for any other reason',
};

function promptList(entries: readonly string[]): string {
  return entries.map((entry) => `    - ${entry}`).join('\n');
}

const quotedScopes = participantAggregateScopeSchema.options
  .map((scope) => `"${scope}"`)
  .join(', ');

/**
 * The description of this contract given to a translation step, so that the
 * wording a model is shown and the schema it has to satisfy cannot drift apart.
 * The metric, scope and reason lists are built from the schemas themselves.
 */
export const ANALYTICS_QUERY_PROMPT_DESCRIPTION = `Analytics query definition, version ${QUERY_DEFINITION_VERSION}.

Translate the reader's cricket question into exactly one query definition. Reply with only the JSON
definition: no prose, no explanation and no code fence. The JSON must match one of the kinds below
exactly. A definition carrying any property that is not listed for its kind is rejected, so never add
a property to explain yourself.

Every definition has a "kind" property naming what is being asked for. There are four kinds.

1. "leaderboard" ranks players within one season or one competition.
  - "metric": exactly one of
${promptList(leaderboardMetricSchema.options)}
    The "most_" and "highest_" metrics rank from the largest value down; the "best_" metrics rank
    from the smallest value up.
  - "scope": "season" or "competition".
  - "season": required when "scope" is "season", and not allowed otherwise.
  - "competition": required when "scope" is "competition", and not allowed otherwise.
  - "limit": optional whole number from 1 to 50. It defaults to 10 when left out.

2. "participant_statistics" gives one player's own published figures.
  - "participant": a player reference.
  - "scope": one of ${quotedScopes}.
    Use "career" for a player's whole career, "competition" for their figures across one
    competition, and "season" for one season of one competition.
  - "season" and "competition": as for a leaderboard. A "career" scope carries neither.

3. "participant_comparison" puts two players' published figures side by side.
  - "participants": an array of exactly two player references. Never one, and never three.
  - "scope", "season" and "competition": exactly as for "participant_statistics".

4. "unsupported" says the question cannot be answered from the published statistics.
  - "reason": exactly one of
${promptList(
  unsupportedQueryReasonSchema.options.map(
    (reason) => `${reason} — ${UNSUPPORTED_QUERY_REASON_GUIDANCE[reason]}`,
  ),
)}

References name things the way the reader named them, and the server resolves each name itself:
  - a player reference is { "name": "Quinton de Kock" };
  - a competition reference is { "name": "Indian Premier League" };
  - a season reference is { "competitionName": "Indian Premier League", "seasonLabel": "2026" },
    because a season is a competition together with a label and has no name of its own.

A name must be between 1 and ${NAME_HINT_MAX_LENGTH} characters once surrounding spaces are
removed, and must not contain control or formatting characters. Copy the name the reader wrote,
accents, apostrophes and hyphens included. Never invent or substitute a player, competition or
season the reader did not name, and never put an identifier, a number or a description where a
name belongs.

Answer with "unsupported" rather than guess. If the question needs something the published
statistics do not hold, or if it does not say which player, competition or season it means, return
the "unsupported" kind with the closest reason. A wrong definition is worse than a named refusal,
so never approximate the question, widen its scope, or change the metric to one you can express.`;
