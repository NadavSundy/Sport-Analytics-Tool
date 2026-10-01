import {
  leaderboardQueryDefinitionSchema,
  participantComparisonQueryDefinitionSchema,
  participantStatisticsQueryDefinitionSchema,
  unsupportedQueryDefinitionSchema,
} from '@sport-analytics/contracts';

/**
 * The issue #811 query-definition contract as a JSON Schema, for constraining the
 * provider's response.
 *
 * It is written here rather than generated. A generator emits the keywords the
 * provider documents as unsupported in a constrained schema — `minLength`,
 * `maxLength`, `pattern`, `minimum`, `maximum` and array bounds beyond
 * `minItems: 0|1` — and a schema carrying one of those is rejected before the
 * request runs. Stripping them afterwards would move that failure from build
 * time to run time, and `zod/v4`'s own converter cannot read the contract's
 * schemas at all, because the contract is written against Zod 3's classic API.
 *
 * Everything that could drift is read off the contract instead of restated: each
 * branch's `kind` literal, every enum's members, and therefore every scope,
 * metric and unsupported reason. A test holds the property names and the
 * required sets against the contract's own shapes.
 *
 * This schema constrains **shape** only. The contract's bounds and cross-field
 * rules cannot be expressed here and are not optional:
 *
 *   - a name is 1 to 100 characters and carries no control characters;
 *   - `limit` is between 1 and 50;
 *   - `participants` holds exactly two references; and
 *   - a scope carries the reference it names, and a career scope carries none.
 *
 * `llm.client.ts` therefore parses every response with
 * `analyticsQueryDefinitionSchema` as well. A definition that satisfies this
 * schema is not yet trusted.
 */

/** A name the reader wrote, resolved to an identifier server-side. */
const nameReference = {
  type: 'object',
  properties: { name: { type: 'string' } },
  required: ['name'],
  additionalProperties: false,
} as const;

/** A season is a competition and a label, per the contract. */
const seasonReference = {
  type: 'object',
  properties: {
    competitionName: { type: 'string' },
    seasonLabel: { type: 'string' },
  },
  required: ['competitionName', 'seasonLabel'],
  additionalProperties: false,
} as const;

const scopeReferenceProperties = {
  season: seasonReference,
  competition: nameReference,
};

export const ANALYTICS_QUERY_JSON_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  anyOf: [
    {
      type: 'object',
      properties: {
        kind: { const: leaderboardQueryDefinitionSchema.shape.kind.value },
        metric: { enum: [...leaderboardQueryDefinitionSchema.shape.metric.options] },
        scope: { enum: [...leaderboardQueryDefinitionSchema.shape.scope.options] },
        ...scopeReferenceProperties,
        // Bounded 1 to 50 by the contract; a numeric range cannot be declared here.
        limit: { type: 'integer' },
      },
      required: ['kind', 'metric', 'scope'],
      additionalProperties: false,
    },
    {
      type: 'object',
      properties: {
        kind: { const: participantStatisticsQueryDefinitionSchema.shape.kind.value },
        participant: nameReference,
        scope: { enum: [...participantStatisticsQueryDefinitionSchema.shape.scope.options] },
        ...scopeReferenceProperties,
      },
      required: ['kind', 'participant', 'scope'],
      additionalProperties: false,
    },
    {
      type: 'object',
      properties: {
        kind: { const: participantComparisonQueryDefinitionSchema.shape.kind.value },
        // Exactly two by the contract; an array length cannot be declared here.
        participants: { type: 'array', items: nameReference },
        scope: { enum: [...participantComparisonQueryDefinitionSchema.shape.scope.options] },
        ...scopeReferenceProperties,
      },
      required: ['kind', 'participants', 'scope'],
      additionalProperties: false,
    },
    {
      type: 'object',
      properties: {
        kind: { const: unsupportedQueryDefinitionSchema.shape.kind.value },
        reason: { enum: [...unsupportedQueryDefinitionSchema.shape.reason.options] },
      },
      required: ['kind', 'reason'],
      additionalProperties: false,
    },
  ],
};
