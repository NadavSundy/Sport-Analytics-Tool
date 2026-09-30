import { z } from 'zod';

const optionalNonEmptyString = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().min(1).optional(),
);
const optionalAzureContainerName = optionalNonEmptyString.pipe(
  z
    .string()
    .regex(
      /^(?!.*--)[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/,
      'Azure storage container name must be 3-63 lowercase letters, numbers or single hyphens',
    )
    .optional(),
);

/**
 * The bound on how long one PostgreSQL statement may run before the server
 * cancels it.
 *
 * The API pool holds ten connections, so an unbounded statement is not a slow
 * request but an exhausted pool. A participant aggregate planned before
 * `ANALYZE` reached its tables took minutes
 * (`docs/development/performance-baseline.md`,
 * `evidence/validation/issue-592-first-read-plans/`), which is the failure this
 * bound exists to convert into a fast, retryable error.
 *
 * The default is roughly 2.7 times the slowest response the platform has been
 * measured producing: 5,588 ms for a deployed participant aggregate P95
 * (`evidence/sprints/sprint-3/issue-599-performance-revalidation.md` §10.2).
 * That request issues more than one statement, so the bound cannot cancel any
 * measured statement. It is also three times the 5,000 ms maximum already
 * stated for a single request, so it can never fire before the request budget
 * is spent.
 *
 * The floor keeps the bound above ordinary work: one warm round trip to the
 * hosted database is about 183 ms and a request makes several. It also keeps
 * the bound from being disabled by accident, because `pg` omits a falsy
 * `statement_timeout` from the connection handshake and the session then
 * inherits the server default of no timeout at all. The ceiling is above the
 * pathological case this protects against, so the protection cannot be
 * configured away.
 */
const databaseStatementTimeoutMsSchema = z.coerce
  .number()
  .int()
  .min(1_000)
  .max(120_000)
  .default(15_000);

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().max(65_535).default(3000),
    DATABASE_STATEMENT_TIMEOUT_MS: databaseStatementTimeoutMsSchema,
    CORS_ORIGINS: z.string().default('http://localhost:5173'),
    SUPABASE_URL: z.string().trim().url('Supabase URL must be a valid URL'),
    SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1, 'Supabase publishable key is required'),
    SUPABASE_SECRET_KEY: optionalNonEmptyString,
    OBJECT_STORAGE_PROVIDER: z.enum(['azure', 'filesystem']).optional(),
    OBJECT_STORAGE_FILESYSTEM_ROOT: optionalNonEmptyString,
    DEPLOYMENT_ENVIRONMENT: z
      .string()
      .trim()
      .regex(/^[a-z0-9][a-z0-9-]{0,31}$/)
      .default('local'),
    AZURE_STORAGE_ACCOUNT_NAME: optionalNonEmptyString.pipe(
      z
        .string()
        .regex(
          /^[a-z0-9]{3,24}$/,
          'Azure storage account name must be 3-24 lowercase letters or numbers',
        )
        .optional(),
    ),
    AZURE_STORAGE_CONTAINER_NAME: optionalAzureContainerName,
    AZURE_STORAGE_INGESTION_CONTAINER_NAME: optionalAzureContainerName,
    AZURE_STORAGE_RELEASE_CONTAINER_NAME: optionalAzureContainerName,
  })
  .superRefine((environment, context) => {
    if (environment.NODE_ENV === 'production') {
      if (!environment.OBJECT_STORAGE_PROVIDER) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['OBJECT_STORAGE_PROVIDER'],
          message: 'Object storage provider is required in production',
        });
      } else if (environment.OBJECT_STORAGE_PROVIDER !== 'azure') {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['OBJECT_STORAGE_PROVIDER'],
          message: 'Production object storage provider must be azure',
        });
      }
    }

    if (
      environment.OBJECT_STORAGE_PROVIDER === 'filesystem' &&
      !environment.OBJECT_STORAGE_FILESYSTEM_ROOT
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['OBJECT_STORAGE_FILESYSTEM_ROOT'],
        message: 'Filesystem object storage root is required for the filesystem provider',
      });
    }

    if (environment.OBJECT_STORAGE_PROVIDER === 'azure') {
      if (!environment.AZURE_STORAGE_ACCOUNT_NAME) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['AZURE_STORAGE_ACCOUNT_NAME'],
          message: 'Azure storage account name is required for the Azure provider',
        });
      }

      if (!environment.AZURE_STORAGE_CONTAINER_NAME) {
        if (!environment.AZURE_STORAGE_INGESTION_CONTAINER_NAME) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['AZURE_STORAGE_CONTAINER_NAME'],
            message: 'Azure storage container name is required for the Azure provider',
          });
        }
      }
      if (!environment.AZURE_STORAGE_RELEASE_CONTAINER_NAME) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['AZURE_STORAGE_RELEASE_CONTAINER_NAME'],
          message: 'Azure release storage container name is required for the Azure provider',
        });
      }
    }

    if (environment.NODE_ENV === 'production' && environment.DEPLOYMENT_ENVIRONMENT === 'local') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DEPLOYMENT_ENVIRONMENT'],
        message: 'Production requires a non-local deployment environment',
      });
    }
  });

export type Environment = z.infer<typeof environmentSchema>;

/**
 * Resolves the statement bound on its own, through the same schema the whole
 * environment uses.
 *
 * The application pool is a lazy singleton reached as a default argument from
 * every repository, so it is built wherever the first query happens rather than
 * where the environment is loaded. Parsing the whole environment there would
 * require the Supabase variables to be set in contexts that only ever needed a
 * database connection. Sharing the one schema constant instead keeps the
 * declared type, default and bounds identical on both paths.
 */
export function loadDatabaseStatementTimeoutMs(source: NodeJS.ProcessEnv = process.env): number {
  const result = databaseStatementTimeoutMsSchema.safeParse(source.DATABASE_STATEMENT_TIMEOUT_MS);

  if (!result.success) {
    const details = result.error.issues.map((issue) => issue.message).join('; ');

    throw new Error(`Invalid environment configuration: DATABASE_STATEMENT_TIMEOUT_MS: ${details}`);
  }

  return result.data;
}

export function loadEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
  const result = environmentSchema.safeParse(source);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`)
      .join('; ');

    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return result.data;
}
