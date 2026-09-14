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

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().max(65_535).default(3000),
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
