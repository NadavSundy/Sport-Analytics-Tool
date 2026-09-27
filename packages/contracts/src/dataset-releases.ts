import { z } from 'zod';

import { apiDateTimeSchema, apiIdentifierSchema, createResourceResponseSchema } from './api';

export const DATASET_RELEASE_FORMAT_VERSION = '1.1' as const;
export const DATASET_RELEASE_SCOPE = 'published-accepted-deliveries' as const;
export const DATASET_RELEASE_FIELDS = [
  { name: 'eventId', description: 'Stable logical delivery identity retained across corrections.' },
  { name: 'fixtureId', description: 'Fixture containing the delivery.' },
  { name: 'inningsId', description: 'Innings containing the delivery.' },
  { name: 'inningsOrdinal', description: 'Zero-based source innings order.' },
  { name: 'sequenceNumber', description: 'Stable delivery order within the innings.' },
  { name: 'overNumber', description: 'Zero-based cricket over number.' },
  { name: 'positionInOver', description: 'Zero-based source position within the over.' },
  { name: 'ballNumber', description: 'Display ball label; not an identity field.' },
  { name: 'strikerParticipantId', description: 'Stable striker participant identifier.' },
  { name: 'nonStrikerParticipantId', description: 'Stable non-striker participant identifier.' },
  { name: 'bowlerParticipantId', description: 'Stable bowler participant identifier.' },
  { name: 'runsOffBat', description: 'Runs credited to the striker.' },
  { name: 'runsExtras', description: 'Extra runs on the delivery.' },
  { name: 'runsTotal', description: 'Total runs on the delivery.' },
  { name: 'runsNonBoundary', description: 'Whether runs must not count as a boundary.' },
  { name: 'extras', description: 'Detailed wides; no-balls; byes; leg-byes and penalty runs.' },
  { name: 'wickets', description: 'Ordered dismissal details; including player out and fielders.' },
] as const;

export const datasetReleaseVersionSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/, 'Use a stable release version.');

export const createDatasetReleaseSchema = z
  .object({
    version: datasetReleaseVersionSchema,
  })
  .strict();

export const datasetReleaseFieldSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().min(1),
  })
  .strict();

export const datasetReleaseSchema = z
  .object({
    releaseId: apiIdentifierSchema,
    version: datasetReleaseVersionSchema,
    createdAt: apiDateTimeSchema,
    snapshotId: apiIdentifierSchema.nullable(),
    snapshotAsOf: apiDateTimeSchema.nullable(),
    formatVersion: z.enum(['1.0', DATASET_RELEASE_FORMAT_VERSION]),
    scope: z.literal(DATASET_RELEASE_SCOPE),
    eventCount: z.number().int().nonnegative(),
    checksum: z.string().regex(/^[a-f0-9]{64}$/),
    fields: z.array(datasetReleaseFieldSchema),
  })
  .strict();

export const datasetReleaseResponseSchema = createResourceResponseSchema(datasetReleaseSchema);
export const datasetReleaseCollectionResponseSchema = z
  .object({
    data: z.array(datasetReleaseSchema),
  })
  .strict();

export const datasetReleaseJobStatusSchema = z.enum([
  'pending',
  'generating',
  'completed',
  'failed',
]);

export const datasetReleaseJobSchema = z
  .object({
    jobId: apiIdentifierSchema,
    version: datasetReleaseVersionSchema,
    status: datasetReleaseJobStatusSchema,
    eventsProcessed: z.number().int().nonnegative(),
    bytesWritten: z.number().int().nonnegative(),
    pageNumber: z.number().int().nonnegative(),
    createdAt: apiDateTimeSchema,
    startedAt: apiDateTimeSchema.nullable(),
    completedAt: apiDateTimeSchema.nullable(),
    failureCode: z.string().min(1).nullable(),
    failureMessage: z.string().min(1).nullable(),
    release: datasetReleaseSchema.nullable(),
  })
  .strict();

export const datasetReleaseJobResponseSchema =
  createResourceResponseSchema(datasetReleaseJobSchema);

export type CreateDatasetRelease = z.infer<typeof createDatasetReleaseSchema>;
export type DatasetRelease = z.infer<typeof datasetReleaseSchema>;
export type DatasetReleaseJob = z.infer<typeof datasetReleaseJobSchema>;
