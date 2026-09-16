import { z } from 'zod';

import { apiDateTimeSchema, apiIdentifierSchema } from './api';

export const DIRECT_SUBMISSION_SCHEMA_VERSION = '1.0' as const;
export const MAX_SUBMISSION_UPLOAD_BYTES = 1_000_000;

const databaseIdentifierSchema = apiIdentifierSchema
  .regex(/^[1-9]\d*$/, 'Expected a positive database identifier.')
  .max(19)
  // Zod runs every check on a string rather than stopping at the first failure,
  // so this refinement sees values the regex has already rejected. BigInt throws
  // on those, which escapes safeParse and surfaces as an unexplained server
  // error rather than a validation failure.
  .refine(
    (value) => {
      if (!/^\d+$/.test(value)) {
        return true;
      }

      return BigInt(value) <= 9_223_372_036_854_775_807n;
    },
    {
      message: 'Database identifier is outside the supported range.',
    },
  );

const smallNonNegativeIntegerSchema = z.number().int().min(0).max(32_767);

export const submissionEventIdSchema = z
  .string()
  .uuid('Event identifiers must be UUIDs so retries and accidental duplicates can be detected.');

/**
 * Dismissal kinds that cannot involve a fielder, and kinds that always do.
 *
 * These are not an enumeration of the vocabulary, which is held in the
 * dismissal_kind lookup table. They constrain only the kinds whose relationship
 * to fielders is fixed. A kind absent from both lists is unconstrained here and
 * is resolved against the table server-side.
 *
 * Verified against the full Cricsheet corpus of 3,193,996 deliveries: no
 * dismissal of a kind below names a fielder, and no caught or stumped dismissal
 * omits one.
 */
const KINDS_WITHOUT_FIELDERS = new Set([
  'bowled',
  'lbw',
  'hit wicket',
  'timed out',
  'retired hurt',
  'retired out',
  'retired not out',
]);

const KINDS_REQUIRING_A_FIELDER = new Set(['caught', 'stumped']);

export const submissionWicketSchema = z
  .object({
    // The dismissal vocabulary is held in the dismissal_kind lookup table rather
    // than enumerated here. The set is open: two kinds present in the full corpus
    // were absent from the earlier subset, and the migration records that
    // extending an enumeration would require a migration. The contract therefore
    // constrains the shape and the service resolves the value against the table,
    // so a new kind needs a row and no code change.
    kind: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-z][a-z ]*$/, 'A dismissal kind is lower-case words separated by spaces.'),
    playerOutId: databaseIdentifierSchema,
    fielders: z
      .array(
        z
          .object({
            participantId: databaseIdentifierSchema.optional(),
            substitute: z.boolean().default(false),
          })
          .strict()
          .refine((fielder) => fielder.participantId !== undefined || fielder.substitute, {
            message: 'A fielder must identify a participant or be marked as a substitute.',
          }),
      )
      .max(11)
      .default([]),
  })
  .strict()
  .superRefine((wicket, context) => {
    if (KINDS_WITHOUT_FIELDERS.has(wicket.kind) && wicket.fielders.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fielders'],
        message: `A dismissal of kind "${wicket.kind}" cannot involve a fielder.`,
      });
    }

    if (KINDS_REQUIRING_A_FIELDER.has(wicket.kind) && wicket.fielders.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fielders'],
        message: `A dismissal of kind "${wicket.kind}" must name at least one fielder, who may be an unidentified substitute.`,
      });
    }
  });

/**
 * A delivery's extras breakdown. Each type is a non-negative count of runs that
 * fits the delivery table's smallint columns, and no other key is accepted.
 * Exported so that other ingestion paths validate extras against the same rules.
 */
export const submissionExtrasSchema = z
  .object({
    wides: smallNonNegativeIntegerSchema.optional(),
    noBalls: smallNonNegativeIntegerSchema.optional(),
    byes: smallNonNegativeIntegerSchema.optional(),
    legByes: smallNonNegativeIntegerSchema.optional(),
    penalty: smallNonNegativeIntegerSchema.optional(),
  })
  .strict();

const submissionEventBaseSchema = z
  .object({
    eventId: submissionEventIdSchema,
    inningsId: databaseIdentifierSchema,
    sequenceNumber: z.number().int().positive().max(2_147_483_647),
    overNumber: smallNonNegativeIntegerSchema,
    positionInOver: smallNonNegativeIntegerSchema,
    // The printed ball number is display only: it is never unique and never used
    // to join, because it counts legal deliveries and so repeats within an over.
    // The identifying columns are overNumber and positionInOver. Constrained to
    // the printed form so that a submitted label cannot be arbitrary text, but
    // the platform does not currently verify that it agrees with the position it
    // describes.
    ballNumber: z
      .string()
      .regex(
        /^\d{1,3}\.\d{1,2}$/,
        'A printed ball number takes the form <over>.<ball>, for example 5.1.',
      ),
    strikerId: databaseIdentifierSchema,
    nonStrikerId: databaseIdentifierSchema,
    bowlerId: databaseIdentifierSchema,
    runs: z
      .object({
        offBat: smallNonNegativeIntegerSchema,
        extras: smallNonNegativeIntegerSchema,
        total: smallNonNegativeIntegerSchema,
        nonBoundary: z.boolean().default(false),
      })
      .strict(),
    extras: submissionExtrasSchema.default({}),
    wickets: z.array(submissionWicketSchema).max(2).default([]),
  })
  .strict();

function validateEvent(
  event: Omit<z.infer<typeof submissionEventBaseSchema>, 'eventId' | 'sequenceNumber'>,
  context: z.RefinementCtx,
): void {
  if (event.strikerId === event.nonStrikerId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['nonStrikerId'],
      message: 'The striker and non-striker must be different participants.',
    });
  }

  if (event.runs.total !== event.runs.offBat + event.runs.extras) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['runs', 'total'],
      message: 'Total runs must equal off-bat runs plus extras.',
    });
  }

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
}

export const submissionEventSchema = submissionEventBaseSchema.superRefine(validateEvent);

export const submissionRequestSchema = z
  .object({
    fixtureId: databaseIdentifierSchema,
    schemaVersion: z.literal(DIRECT_SUBMISSION_SCHEMA_VERSION),
    events: z.array(submissionEventSchema).min(1).max(1_000),
  })
  .strict()
  .superRefine((submission, context) => {
    const eventIds = new Set<string>();
    const sequenceKeys = new Set<string>();
    const positions = new Set<string>();
    const lastSequenceByInnings = new Map<string, number>();

    for (const [eventIndex, event] of submission.events.entries()) {
      if (eventIds.has(event.eventId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['events', eventIndex, 'eventId'],
          message: 'Event identifiers must be unique within a submission.',
        });
      }
      eventIds.add(event.eventId);

      const sequenceKey = `${event.inningsId}:${event.sequenceNumber}`;
      if (sequenceKeys.has(sequenceKey)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['events', eventIndex, 'sequenceNumber'],
          message: 'Sequence numbers must be unique within an innings.',
        });
      }
      sequenceKeys.add(sequenceKey);

      const previousSequence = lastSequenceByInnings.get(event.inningsId);
      if (previousSequence !== undefined && event.sequenceNumber <= previousSequence) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['events', eventIndex, 'sequenceNumber'],
          message: 'Events for each innings must appear in ascending sequence order.',
        });
      }
      lastSequenceByInnings.set(event.inningsId, event.sequenceNumber);

      const positionKey = `${event.inningsId}:${event.overNumber}:${event.positionInOver}`;
      if (positions.has(positionKey)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['events', eventIndex, 'positionInOver'],
          message: 'Delivery positions must be unique within an innings.',
        });
      }
      positions.add(positionKey);
    }
  });

// A correction identifies the existing source event in the path. Its occurrence
// sequence is inherited from the live revision, so a correction cannot reorder
// an innings while changing its cricket content.
export const correctionEventSchema = submissionEventBaseSchema
  .omit({
    eventId: true,
    sequenceNumber: true,
  })
  .superRefine(validateEvent);

export const correctionRequestSchema = z
  .object({
    fixtureId: databaseIdentifierSchema,
    schemaVersion: z.literal(DIRECT_SUBMISSION_SCHEMA_VERSION),
    reason: z.string().trim().min(1).max(1_000),
    event: correctionEventSchema,
  })
  .strict();

export const submissionSchema = z.object({
  submissionId: apiIdentifierSchema,
  fixtureId: apiIdentifierSchema,
  submitterId: apiIdentifierSchema,
  status: z.literal('accepted'),
  receivedAt: apiDateTimeSchema,
  schemaVersion: z.literal(DIRECT_SUBMISSION_SCHEMA_VERSION),
  eventCount: z.number().int().positive(),
  checksum: z
    .string()
    .regex(/^[0-9a-f]{64}$/)
    .optional(),
  sourceFile: z
    .object({
      fileName: z.string().min(1).max(255),
      mediaType: z.enum(['application/json', 'text/csv']),
      sizeBytes: z.number().int().positive().max(MAX_SUBMISSION_UPLOAD_BYTES),
    })
    .strict()
    .optional(),
});

export const submissionResponseSchema = z.object({
  data: submissionSchema,
});

export const correctionSchema = z.object({
  eventId: submissionEventIdSchema,
  fixtureId: apiIdentifierSchema,
  revision: z.number().int().positive(),
  refreshedScopes: z.array(
    z
      .object({
        scope: z.enum(['fixture', 'season', 'competition', 'career']),
        participantId: apiIdentifierSchema.nullable(),
        competitionId: apiIdentifierSchema.nullable(),
        season: z.string().min(1).nullable(),
      })
      .strict(),
  ),
});

export const correctionResponseSchema = z.object({
  data: correctionSchema,
});

export const correctionHistoryEntrySchema = z
  .object({
    correctionId: apiIdentifierSchema,
    previousDeliveryId: apiIdentifierSchema,
    replacementDeliveryId: apiIdentifierSchema,
    previousRevision: z.number().int().positive(),
    resultingRevision: z.number().int().positive(),
    requester: z
      .object({
        accountId: apiIdentifierSchema,
        displayName: z.string().nullable(),
      })
      .strict(),
    correctedAt: apiDateTimeSchema,
    reason: z.string().min(1),
    source: z
      .object({
        submissionId: apiIdentifierSchema,
        submissionEventOrdinal: z.number().int().nonnegative().nullable(),
        batchItemId: apiIdentifierSchema.nullable(),
      })
      .strict(),
    previousState: submissionEventSchema,
    resultingState: submissionEventSchema,
    review: z
      .object({
        reviewer: z
          .object({
            accountId: apiIdentifierSchema,
            displayName: z.string().nullable(),
          })
          .strict(),
        decision: z.enum(['approved', 'rejected']),
        reviewedAt: apiDateTimeSchema,
        reason: z.string().min(1),
      })
      .strict()
      .nullable(),
  })
  .strict();

export const correctionHistorySchema = z
  .object({
    eventId: submissionEventIdSchema,
    fixtureId: apiIdentifierSchema,
    corrections: z.array(correctionHistoryEntrySchema),
  })
  .strict();

export const correctionHistoryResponseSchema = z.object({ data: correctionHistorySchema }).strict();

export type SubmissionRequest = z.infer<typeof submissionRequestSchema>;
export type SubmissionEvent = z.infer<typeof submissionEventSchema>;
export type SubmissionResponse = z.infer<typeof submissionResponseSchema>;
export type SubmissionSourceFile = NonNullable<z.infer<typeof submissionSchema>['sourceFile']>;
export type CorrectionRequest = z.infer<typeof correctionRequestSchema>;
export type CorrectionResponse = z.infer<typeof correctionResponseSchema>;
export type CorrectionHistoryResponse = z.infer<typeof correctionHistoryResponseSchema>;
