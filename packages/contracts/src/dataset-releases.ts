import { z } from 'zod';

import { apiDateTimeSchema, apiIdentifierSchema, createResourceResponseSchema } from './api';

export const DATASET_RELEASE_FORMAT_VERSION = '1.0' as const;

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
    formatVersion: z.literal(DATASET_RELEASE_FORMAT_VERSION),
    scope: z.literal('published-accepted-deliveries'),
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

export type CreateDatasetRelease = z.infer<typeof createDatasetReleaseSchema>;
export type DatasetRelease = z.infer<typeof datasetReleaseSchema>;
