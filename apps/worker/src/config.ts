import { hostname } from 'node:os';
import { resolve } from 'node:path';

import { z } from 'zod';

const optionalNonEmptyString = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().min(1).optional(),
);

const workerEnvironmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    WORKER_PORT: z.coerce.number().int().positive().max(65_535).default(3001),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    WORKER_ID: optionalNonEmptyString,
    WORKER_CONCURRENCY: z.coerce.number().int().positive().max(16).default(1),
    WORKER_HEALTH_INTERVAL_MS: z.coerce.number().int().min(1_000).max(300_000).default(15_000),
    WORKER_HEALTH_TIMEOUT_MS: z.coerce.number().int().min(250).max(30_000).default(5_000),
    WORKER_SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(300_000).default(25_000),
    SERVICE_BUS_LOCK_RENEWAL_MS: z.coerce
      .number()
      .int()
      .min(60_000)
      .max(1_800_000)
      .default(240_000),
    WORKER_PROBE_DELAY_MS: z.coerce.number().int().min(0).max(600_000).default(0),
    DATABASE_URL: z.string().trim().min(1, 'Database URL is required'),
    DATABASE_SSL_MODE: z.enum(['disable', 'verify-full']).default('verify-full'),
    DATABASE_CA_CERT_PATH: optionalNonEmptyString,
    SERVICE_BUS_FULLY_QUALIFIED_NAMESPACE: z
      .string()
      .trim()
      .regex(
        /^[a-z0-9-]+\.servicebus\.windows\.net$/,
        'Service Bus namespace must be a fully qualified Azure Service Bus hostname',
      ),
    SERVICE_BUS_QUEUE_NAME: z
      .string()
      .trim()
      .regex(/^[a-zA-Z0-9._/-]{1,260}$/, 'Service Bus queue name is invalid'),
    AZURE_STORAGE_ACCOUNT_NAME: z
      .string()
      .trim()
      .regex(/^[a-z0-9]{3,24}$/, 'Azure storage account name is invalid'),
    AZURE_STORAGE_CONTAINER_NAME: z
      .string()
      .trim()
      .regex(
        /^(?!.*--)[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/,
        'Azure storage container name is invalid',
      ),
    AZURE_CLIENT_ID: optionalNonEmptyString,
  })
  .superRefine((environment, context) => {
    if (environment.NODE_ENV === 'production' && environment.DATABASE_SSL_MODE !== 'verify-full') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DATABASE_SSL_MODE'],
        message: 'Production database connections must use verify-full TLS',
      });
    }
  });

type ParsedWorkerEnvironment = z.infer<typeof workerEnvironmentSchema>;
export type WorkerEnvironment = Omit<ParsedWorkerEnvironment, 'DATABASE_CA_CERT_PATH'> & {
  DATABASE_CA_CERT_PATH: string;
  workerId: string;
};

export function loadWorkerEnvironment(source: NodeJS.ProcessEnv = process.env): WorkerEnvironment {
  const result = workerEnvironmentSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid worker environment configuration: ${details}`);
  }

  return {
    ...result.data,
    workerId: result.data.WORKER_ID ?? `${hostname()}-${process.pid}`,
    DATABASE_CA_CERT_PATH:
      result.data.DATABASE_CA_CERT_PATH ?? resolve(__dirname, '../certs/supabase-ca.crt'),
  };
}
