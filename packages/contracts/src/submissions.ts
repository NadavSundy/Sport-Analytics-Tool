import { z } from 'zod';

import { apiDateTimeSchema, apiIdentifierSchema } from './api';

export const DIRECT_SUBMISSION_SCHEMA_VERSION = '1.0' as const;

const databaseIdentifierSchema = apiIdentifierSchema
  .regex(/^[1-9]\d*$/, 'Expected a positive database identifier.')
  .max(19)
  .refine((value) => BigInt(value) <= 9_223_372_036_854_775_807n, {
    message: 'Database identifier is outside the supported range.',
  });

const smallNonNegativeIntegerSchema = z.number().int().min(0).max(32_767);

export const submissionEventIdSchema = z
  .string()
  .uuid('Event identifiers must be UUIDs so retries and accidental duplicates can be detected.');

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
  .strict();

export const submissionEventSchema = z
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
    extras: z
      .object({
        wides: smallNonNegativeIntegerSchema.optional(),
        noBalls: smallNonNegativeIntegerSchema.optional(),
        byes: smallNonNegativeIntegerSchema.optional(),
        legByes: smallNonNegativeIntegerSchema.optional(),
        penalty: smallNonNegativeIntegerSchema.optional(),
      })
      .strict()
      .default({}),
    wickets: z.array(submissionWicketSchema).max(2).default([]),
  })
  .strict()
  .superRefine((event, context) => {
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
  });

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

export const submissionSchema = z.object({
  submissionId: apiIdentifierSchema,
  fixtureId: apiIdentifierSchema,
  submitterId: apiIdentifierSchema,
  status: z.literal('accepted'),
  receivedAt: apiDateTimeSchema,
  schemaVersion: z.literal(DIRECT_SUBMISSION_SCHEMA_VERSION),
  eventCount: z.number().int().positive(),
});

export const submissionResponseSchema = z.object({
  data: submissionSchema,
});

export type SubmissionRequest = z.infer<typeof submissionRequestSchema>;
export type SubmissionEvent = z.infer<typeof submissionEventSchema>;
export type SubmissionResponse = z.infer<typeof submissionResponseSchema>;
