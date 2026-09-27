import { PermanentJobError, type ReceivedJob } from './delivery-pump';

type JobHandler = (message: ReceivedJob, signal: AbortSignal) => Promise<void>;

/** Dispatch versioned worker commands without allowing one handler to consume another contract. */
export function createJobHandler(handlers: {
  probe: JobHandler;
  batchValidation: JobHandler;
  batchPublication: JobHandler;
  datasetRelease: JobHandler;
}): JobHandler {
  return async (message, signal) => {
    const body = message.body;
    if (!body || typeof body !== 'object') {
      throw new PermanentJobError(
        'UnsupportedJobContract',
        'Worker command must be a JSON object.',
      );
    }

    const command = body as { type?: unknown; version?: unknown };

    if (command.type === 'worker.probe' && command.version === 1) {
      await handlers.probe(message, signal);
      return;
    }

    if (command.type === 'batch.validate' && command.version === 1) {
      await handlers.batchValidation(message, signal);
      return;
    }

    if (command.type === 'batch.publish' && command.version === 1) {
      await handlers.batchPublication(message, signal);
      return;
    }

    if (command.type === 'dataset-release.generate' && command.version === 1) {
      await handlers.datasetRelease(message, signal);
      return;
    }

    throw new PermanentJobError(
      'UnsupportedJobContract',
      'Worker does not support this command type or version.',
    );
  };
}
