import { z } from 'zod';

import { eventCoordinateSchema, validateDisplayBallLabel } from './event-coordinates';

/** The first published package format for season and back-catalogue uploads. */
export const SEASON_UPLOAD_CONTRACT_VERSION = '1.0' as const;
export const FIXTURE_PROPOSAL_CONTRACT_VERSION = '1.1' as const;

const readableNameSchema = z.string().trim().min(1).max(200);
const localDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected an ISO date (YYYY-MM-DD).');

/**
 * An externally owned, namespaced identity. It deliberately cannot be an
 * application database key: the entity type and provider namespace are always
 * present, for example `cricsheet:fixture:1412526`.
 */
export const sourceIdentifierSchema = z
  .string()
  .regex(
    /^[a-z][a-z0-9_-]{0,63}:[a-z][a-z0-9_-]{0,63}:[^\s:][^\s]*$/,
    'A source identifier must be namespace:entityType:value, for example cricsheet:fixture:1412526.',
  )
  .max(512);

function sourceIdentifierFor(entityType: string) {
  return sourceIdentifierSchema.refine(
    (value) => value.split(':', 3)[1] === entityType,
    `Expected a source identifier for a ${entityType}.`,
  );
}

function hasDurableSourceOnlyResolver(entityType: string, sourceId: string): boolean {
  const [namespace, sourceEntityType, value] = sourceId.split(':', 3);

  if (sourceEntityType !== entityType) {
    return false;
  }

  if (namespace === 'cricsheet') {
    return entityType === 'fixture' || entityType === 'participant';
  }

  return (
    namespace === 'app' &&
    (entityType === 'fixture' || entityType === 'innings' || entityType === 'participant') &&
    /^[1-9]\d*$/.test(value ?? '')
  );
}

function sourceOnlyResolutionMessage(entityType: string): string {
  return entityType === 'competition' || entityType === 'season' || entityType === 'team'
    ? `A ${entityType} sourceId cannot resolve without readable context because no durable source mapping exists. Supply context instead.`
    : `A ${entityType} sourceId without context must use a supported durable mapping: cricsheet for fixtures or participants, or app with a positive canonical identifier.`;
}

function referenceSchema<T extends z.ZodTypeAny>(entityType: string, context: T) {
  return z
    .object({
      sourceId: sourceIdentifierFor(entityType).optional(),
      context: context.optional(),
    })
    .strict()
    .superRefine((reference, issueContext) => {
      if (!reference.sourceId && !reference.context) {
        issueContext.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'A reference needs a sourceId or sufficient readable context for later resolution.',
        });
      }

      if (
        reference.sourceId &&
        !reference.context &&
        !hasDurableSourceOnlyResolver(entityType, reference.sourceId)
      ) {
        issueContext.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['sourceId'],
          message: sourceOnlyResolutionMessage(entityType),
        });
      }
    });
}

export const teamReferenceSchema = referenceSchema(
  'team',
  z.object({ name: readableNameSchema }).strict(),
);

export const participantReferenceSchema = referenceSchema(
  'participant',
  z.object({ name: readableNameSchema, team: teamReferenceSchema.optional() }).strict(),
);

export const competitionReferenceSchema = referenceSchema(
  'competition',
  z.object({ name: readableNameSchema, country: readableNameSchema.optional() }).strict(),
);

export const seasonReferenceSchema = referenceSchema(
  'season',
  z.object({ name: readableNameSchema, startDate: localDateSchema.optional() }).strict(),
);

const fixtureContextSchema = z
  .object({
    date: localDateSchema,
    teams: z.array(teamReferenceSchema).length(2),
    venue: readableNameSchema.optional(),
  })
  .strict();

export const fixtureProposalSchema = z
  .object({
    endDate: localDateSchema,
    matchType: readableNameSchema,
    teamType: readableNameSchema,
    gender: readableNameSchema,
    ballsPerOver: z.number().int().min(1).max(36),
    outcome: z.enum(['won', 'tie', 'draw', 'no result']),
    /**
     * The team that won, by name, and one of the fixture's two. Required when
     * the outcome is `won` and refused otherwise, which is the rule the
     * `fixture` table has always enforced:
     *
     *     CONSTRAINT fixture_winner_ck CHECK ((outcome = 'won') = (winner_id IS NOT NULL))
     *
     * Without it a proposal could say a fixture was won without saying by whom,
     * and nothing below the contract could honour that: the canonical fixture
     * INSERT has no winner to write, so the constraint refused the row and the
     * reviewer's **Create canonical fixture from proposal** returned a 500. The
     * outcome and the winner travel together everywhere else in this codebase —
     * corpus ingestion derives `won` from the presence of a winner — and they
     * travel together here too.
     *
     * It is a name rather than an identifier for the same reason the fixture's
     * two teams are names: a v1.1 package carries no canonical identifiers, and
     * the name is resolved against the two teams the proposal itself names, so
     * no team can be introduced or inferred by way of this field.
     */
    winner: readableNameSchema.optional(),
    sourceVersion: readableNameSchema,
    sourceRevision: z.number().int().nonnegative(),
  })
  .strict()
  .superRefine((proposal, context) => {
    if (proposal.outcome === 'won' && proposal.winner === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['winner'],
        message: 'Name the winning team when the outcome is won.',
      });
    }
    if (proposal.outcome !== 'won' && proposal.winner !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['winner'],
        message: 'A winner may only be named when the outcome is won.',
      });
    }
  });

const inningsContextSchema = z
  .object({
    ordinal: z.number().int().nonnegative().max(7),
    battingTeam: teamReferenceSchema,
  })
  .strict();

const powerplayBallSchema = z
  .number()
  .nonnegative()
  .max(999.99)
  .refine(
    (value) => Math.abs(value - Math.round(value * 100) / 100) < 1e-9,
    'A powerplay boundary must use at most two decimal places.',
  );

export const inningsPowerplaySchema = z
  .object({
    from: powerplayBallSchema,
    to: powerplayBallSchema,
    type: readableNameSchema,
  })
  .strict()
  .refine((powerplay) => powerplay.from <= powerplay.to, {
    path: ['to'],
    message: 'A powerplay end boundary must not precede its start boundary.',
  });

export const inningsPowerplaysSchema = z
  .array(inningsPowerplaySchema)
  .max(16)
  .superRefine((powerplays, context) => {
    const ordered = [...powerplays].sort(
      (left, right) => left.from - right.from || left.to - right.to,
    );
    for (let index = 1; index < ordered.length; index += 1) {
      if (ordered[index]!.from <= ordered[index - 1]!.to) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Powerplay ranges within an innings must not overlap.',
        });
        break;
      }
    }
  });

const runsSchema = z
  .object({
    offBat: z.number().int().min(0).max(32_767),
    extras: z.number().int().min(0).max(32_767),
    total: z.number().int().min(0).max(32_767),
    nonBoundary: z.boolean().optional(),
  })
  .strict()
  .superRefine((runs, context) => {
    if (runs.total !== runs.offBat + runs.extras) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['total'],
        message: 'Total runs must equal off-bat runs plus extras.',
      });
    }
  });

const extrasSchema = z
  .object({
    wides: z.number().int().min(0).max(32_767).optional(),
    noBalls: z.number().int().min(0).max(32_767).optional(),
    byes: z.number().int().min(0).max(32_767).optional(),
    legByes: z.number().int().min(0).max(32_767).optional(),
    penalty: z.number().int().min(0).max(32_767).optional(),
  })
  .strict()
  .default({});

export const seasonUploadFielderSchema = z
  .object({
    participant: participantReferenceSchema.optional(),
    substitute: z.boolean().default(false),
  })
  .strict()
  .refine((fielder) => fielder.participant !== undefined || fielder.substitute, {
    message: 'A fielder must identify a participant or be marked as a substitute.',
  });

export const seasonUploadWicketSchema = z
  .object({
    kind: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-z][a-z ]*$/, 'A dismissal kind is lower-case words separated by spaces.'),
    playerOut: participantReferenceSchema,
    fielders: z.array(seasonUploadFielderSchema).max(11).default([]),
  })
  .strict();

export const seasonUploadEventSchema = z
  .object({
    // This value is the retry/deduplication identity. It is not a displayed
    // ball number and remains unchanged when a correction is submitted.
    eventId: sourceIdentifierFor('delivery'),
    occurrenceSequence: z.number().int().positive().max(2_147_483_647),
    // These zero-based coordinates are the canonical delivery position. The
    // printed label is display-only and never substitutes for either value.
    overNumber: eventCoordinateSchema,
    positionInOver: eventCoordinateSchema,
    ballLabel: z.string().max(32).optional(),
    operation: z.enum(['upsert', 'correction']).default('upsert'),
    correctsEventId: sourceIdentifierFor('delivery').optional(),
    striker: participantReferenceSchema,
    nonStriker: participantReferenceSchema,
    bowler: participantReferenceSchema,
    runs: runsSchema,
    extras: extrasSchema,
    wickets: z.array(seasonUploadWicketSchema).max(2).default([]),
  })
  .strict()
  .superRefine((event, context) => {
    validateDisplayBallLabel(event.ballLabel, event.overNumber, 'ballLabel', context);

    const extrasTotal = Object.values(event.extras).reduce<number>(
      (total, value) => total + (value ?? 0),
      0,
    );

    if (event.runs.extras !== extrasTotal) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['runs', 'extras'],
        message: 'Run extras must equal the supplied extras breakdown.',
      });
    }

    if (event.striker.sourceId && event.striker.sourceId === event.nonStriker.sourceId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['nonStriker'],
        message: 'The striker and non-striker must be different participants.',
      });
    }

    if (event.operation === 'correction' && !event.correctsEventId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['correctsEventId'],
        message: 'A correction must identify the stable delivery event it corrects.',
      });
    }

    if (event.operation === 'upsert' && event.correctsEventId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['correctsEventId'],
        message: 'Only a correction may name a corrected delivery event.',
      });
    }
  });

const inningsSchema = z
  .object({
    sourceId: sourceIdentifierFor('innings').optional(),
    context: inningsContextSchema.optional(),
    powerplays: inningsPowerplaysSchema.optional(),
    events: z.array(seasonUploadEventSchema).min(1),
  })
  .strict()
  .superRefine((innings, context) => {
    if (!innings.sourceId && !innings.context) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'An innings needs a sourceId or readable innings context.',
      });
    }

    if (
      innings.sourceId &&
      !innings.context &&
      !hasDurableSourceOnlyResolver('innings', innings.sourceId)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sourceId'],
        message: sourceOnlyResolutionMessage('innings'),
      });
    }

    const eventIds = new Set<string>();
    const occurrenceSequences = new Set<number>();
    for (const [index, event] of innings.events.entries()) {
      if (eventIds.has(event.eventId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['events', index, 'eventId'],
          message: 'Delivery event identities must be unique within an innings.',
        });
      }
      eventIds.add(event.eventId);

      if (occurrenceSequences.has(event.occurrenceSequence)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['events', index, 'occurrenceSequence'],
          message: 'Occurrence sequences must be unique within an innings.',
        });
      }
      occurrenceSequences.add(event.occurrenceSequence);
    }
  });

const fixtureSchema = z
  .object({
    sourceId: sourceIdentifierFor('fixture').optional(),
    context: fixtureContextSchema.optional(),
    proposal: fixtureProposalSchema.optional(),

    season: seasonReferenceSchema.optional(),
    innings: z.array(inningsSchema).min(1).max(8),
  })
  .strict()
  .superRefine((fixture, context) => {
    if (!fixture.sourceId && !fixture.context) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A fixture needs a sourceId or readable fixture context.',
      });
    }

    if (
      fixture.sourceId &&
      !fixture.context &&
      !hasDurableSourceOnlyResolver('fixture', fixture.sourceId)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sourceId'],
        message: sourceOnlyResolutionMessage('fixture'),
      });
    }
  });

/** Canonical one-file JSON package for a fixture, season, or back catalogue. */
export const seasonUploadPackageSchema = z
  .object({
    contractVersion: z.union([
      z.literal(SEASON_UPLOAD_CONTRACT_VERSION),
      z.literal(FIXTURE_PROPOSAL_CONTRACT_VERSION),
    ]),
    packageId: sourceIdentifierFor('package'),
    competition: competitionReferenceSchema,
    season: seasonReferenceSchema,
    fixtures: z.array(fixtureSchema).min(1),
  })
  .strict()
  .superRefine((uploadPackage, issueContext) => {
    if (uploadPackage.contractVersion !== FIXTURE_PROPOSAL_CONTRACT_VERSION) return;
    for (const [index, fixture] of uploadPackage.fixtures.entries()) {
      if (!fixture.proposal) {
        issueContext.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['fixtures', index, 'proposal'],
          message: 'Version 1.1 requires a complete fixture proposal for reviewer creation.',
        });
      }
      if (!fixture.sourceId) {
        issueContext.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['fixtures', index, 'sourceId'],
          message: 'Version 1.1 fixture proposals require a stable fixture source identifier.',
        });
      }
      if (fixture.proposal && fixture.context && fixture.proposal.endDate < fixture.context.date) {
        issueContext.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['fixtures', index, 'proposal', 'endDate'],
          message: 'A fixture proposal end date cannot precede its fixture date.',
        });
      }
    }
  });

/**
 * A manifest is used when a package is split across JSON, CSV, or NDJSON files.
 * Each referenced file is independently checksummed and its row/record order is
 * only an arrival aid; `occurrenceSequence` remains the delivery ordering value.
 */
export const seasonUploadManifestSchema = z
  .object({
    contractVersion: z.literal(SEASON_UPLOAD_CONTRACT_VERSION),
    packageId: sourceIdentifierFor('package'),
    files: z
      .array(
        z
          .object({
            path: z.string().regex(/^[^/\\][^\\]*$/, 'File paths must be relative package paths.'),
            mediaType: z.enum(['application/json', 'text/csv', 'application/x-ndjson']),
            sha256: z.string().regex(/^[a-f0-9]{64}$/, 'Expected a lowercase SHA-256 checksum.'),
          })
          .strict(),
      )
      .min(2),
  })
  .strict()
  .superRefine((manifest, context) => {
    const paths = new Set<string>();
    for (const [index, file] of manifest.files.entries()) {
      if (paths.has(file.path)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['files', index, 'path'],
          message: 'A manifest file path may appear only once.',
        });
      }
      paths.add(file.path);
    }
  });

/** A staged result requiring a human choice instead of unsafe name matching. */
export const referenceResolutionRequirementSchema = z
  .object({
    code: z.enum(['AMBIGUOUS_REFERENCE', 'UNRESOLVED_REFERENCE']),
    referencePath: z.string().min(1),
    submittedReference: z.unknown(),
    candidates: z.array(
      z.object({ sourceId: sourceIdentifierSchema, label: readableNameSchema }).strict(),
    ),
    resolutionRequired: z.literal(true),
  })
  .strict();

export type SeasonUploadPackage = z.infer<typeof seasonUploadPackageSchema>;
export type SeasonUploadManifest = z.infer<typeof seasonUploadManifestSchema>;
export type SeasonUploadEvent = z.infer<typeof seasonUploadEventSchema>;
export type InningsPowerplay = z.infer<typeof inningsPowerplaySchema>;
export type FixtureProposal = z.infer<typeof fixtureProposalSchema>;
