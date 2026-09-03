import { z } from 'zod';

import { PermanentJobError, type ReceivedJob } from './delivery-pump';
import type { Logger } from './logger';

const probeJobSchema = z.object({
  type: z.literal('worker.probe'),
  version: z.literal(1),
  commandId: z.string().uuid(),
  traceId: z.string().trim().min(1).max(128).optional(),
});

interface ProbeDependencies {
  database(): Promise<void>;
  objectStorage(): Promise<void>;
}

/**
 * Deployment-only command. It proves queue, database and private-storage access without changing
 * domain data. Issue #278 adds the versioned batch validation handler behind this same boundary.
 */
export function createProbeJobHandler(
  dependencies: ProbeDependencies,
  logger: Logger,
  delayMs = 0,
) {
  return async (message: ReceivedJob, signal: AbortSignal): Promise<void> => {
    const result = probeJobSchema.safeParse(message.body);
    if (!result.success) {
      throw new PermanentJobError(
        'UnsupportedJobContract',
        'The worker supports only the worker.probe version 1 deployment command.',
      );
    }
    if (signal.aborted) throw new Error('Worker shutdown interrupted the probe job.');

    if (delayMs > 0) {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(resolve, delayMs);
        signal.addEventListener(
          'abort',
          () => {
            clearTimeout(timeout);
            reject(new Error('Worker shutdown interrupted the probe job.'));
          },
          { once: true },
        );
      });
    }

    await Promise.all([dependencies.database(), dependencies.objectStorage()]);
    if (signal.aborted) throw new Error('Worker shutdown interrupted the probe job.');
    logger.info('Deployment probe job verified worker dependencies.', {
      messageId: message.messageId,
      commandId: result.data.commandId,
      traceId: result.data.traceId,
    });
  };
}
