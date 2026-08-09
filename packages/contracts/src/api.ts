import { z } from 'zod';

export const DEFAULT_PAGE_LIMIT = 50;
export const MAX_PAGE_LIMIT = 100;

// Database bigint identifiers cross the JSON boundary as strings.
// Consumers must treat the value as opaque and must not derive
// meaning from its representation.
export const apiIdentifierSchema = z.string().min(1);

export const cursorSchema = z.string().min(1);

export const apiDateSchema = z.string().date();

export const apiDateTimeSchema = z.string().datetime();

export const eventSequenceSchema = z.number().int().positive();

export const sortDirectionSchema = z.enum(['asc', 'desc']);

export const paginationQuerySchema = z.object({
  cursor: cursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
});

export const sortingQuerySchema = z.object({
  sort: z.string().min(1).optional(),
  direction: sortDirectionSchema.default('asc'),
});

export const listQuerySchema = paginationQuerySchema.merge(sortingQuerySchema);

export const paginationMetadataSchema = z.object({
  nextCursor: cursorSchema.nullable(),
});

export const apiErrorCodeSchema = z.string().regex(/^[A-Z][A-Z0-9_]*$/);

export const apiErrorDetailSchema = z.object({
  code: apiErrorCodeSchema,
  message: z.string().min(1),

  // Used for field-level validation failures.
  field: z.string().min(1).optional(),

  // Used when a validation failure belongs to a specific
  // submitted event.
  eventIndex: z.number().int().nonnegative().optional(),
});

export const apiErrorResponseSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string().min(1),
    details: z.array(apiErrorDetailSchema).optional(),
  }),
});

export function createResourceResponseSchema<TSchema extends z.ZodTypeAny>(schema: TSchema) {
  return z.object({
    data: schema,
  });
}

export function createCollectionResponseSchema<TSchema extends z.ZodTypeAny>(schema: TSchema) {
  return z.object({
    data: z.array(schema),
    pagination: paginationMetadataSchema,
  });
}

export type ApiIdentifier = z.infer<typeof apiIdentifierSchema>;

export type ApiDate = z.infer<typeof apiDateSchema>;

export type ApiDateTime = z.infer<typeof apiDateTimeSchema>;

export type EventSequence = z.infer<typeof eventSequenceSchema>;

export type SortDirection = z.infer<typeof sortDirectionSchema>;

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export type SortingQuery = z.infer<typeof sortingQuerySchema>;

export type ListQuery = z.infer<typeof listQuerySchema>;

export type PaginationMetadata = z.infer<typeof paginationMetadataSchema>;

export type ApiErrorDetail = z.infer<typeof apiErrorDetailSchema>;

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
