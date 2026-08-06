import { z } from 'zod';

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().max(65_535).default(3000),
    CORS_ORIGINS: z.string().default('http://localhost:5173'),
    FIREBASE_PROJECT_ID: z.string().trim().min(1, 'Firebase project ID is required'),
    FIREBASE_AUTH_EMULATOR_HOST: z
      .string()
      .regex(
        /^[a-zA-Z0-9.-]+:\d+$/,
        'Firebase Auth Emulator host must use host:port without a protocol',
      )
      .optional(),
  })
  .superRefine((environment, context) => {
    if (environment.NODE_ENV === 'production' && environment.FIREBASE_AUTH_EMULATOR_HOST) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['FIREBASE_AUTH_EMULATOR_HOST'],
        message: 'Firebase Auth Emulator must not be enabled in production',
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
