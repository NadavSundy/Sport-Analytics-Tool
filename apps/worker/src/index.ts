import { once } from 'node:events';

import { createBatchValidationJobHandler } from './batch-validation-job';
import { loadWorkerEnvironment } from './config';
import { DeliveryPump } from './delivery-pump';
import { closeHealthServer, HealthMonitor, startHealthServer } from './health';
import { createJobHandler } from './job-handler';
import { createLogger } from './logger';
import { OutboxRelay } from './outbox-relay';
import { createProbeJobHandler } from './probe-job';
import { createRuntimeDependencies } from './runtime-dependencies';

async function main(): Promise<void> {
  const environment = loadWorkerEnvironment();
  const logger = createLogger(environment.LOG_LEVEL);
  const dependencies = createRuntimeDependencies(environment);
  const monitor = new HealthMonitor(
    dependencies.checks,
    environment.WORKER_HEALTH_INTERVAL_MS,
    environment.WORKER_HEALTH_TIMEOUT_MS,
    logger,
  );
  const batchValidation = createBatchValidationJobHandler(
    dependencies.database,
    dependencies.objectStorage,
    logger,
    {
      workerId: environment.workerId,
      chunkSize: environment.BATCH_CHUNK_SIZE,
      leaseMs: environment.BATCH_LEASE_MS,
    },
  );
  const pump = new DeliveryPump(
    dependencies.deliveryReceiver,
    createJobHandler({
      probe: createProbeJobHandler(dependencies.checks, logger, environment.WORKER_PROBE_DELAY_MS),
      batchValidation: batchValidation.handler,
    }),
    logger,
  );
  const outbox = new OutboxRelay(dependencies.database, dependencies.outboxSender, logger, {
    workerId: environment.workerId,
    pollIntervalMs: environment.OUTBOX_POLL_INTERVAL_MS,
    claimTtlMs: environment.OUTBOX_CLAIM_TTL_MS,
    batchSize: environment.OUTBOX_BATCH_SIZE,
  });

  await monitor.start();
  const server = await startHealthServer(
    environment.WORKER_PORT,
    monitor,
    pump.metrics,
    environment.workerId,
    {
      batchValidation: batchValidation.metrics,
      outbox: outbox.metrics,
    },
  );
  pump.start();
  outbox.start();
  logger.info('Asynchronous worker is running.', {
    workerId: environment.workerId,
    port: environment.WORKER_PORT,
    concurrency: environment.WORKER_CONCURRENCY,
    batchChunkSize: environment.BATCH_CHUNK_SIZE,
  });

  let stopping: Promise<void> | undefined;
  const stop = (signal: NodeJS.Signals): Promise<void> => {
    stopping ??= (async () => {
      logger.info('Worker shutdown requested.', { signal });
      monitor.markShuttingDown();
      await outbox.stop();
      const drained = await pump.stop(environment.WORKER_SHUTDOWN_TIMEOUT_MS);
      await closeHealthServer(server);
      await monitor.stop();
      await dependencies.close();
      logger.info('Worker shutdown complete.', { drained });
    })();
    return stopping;
  };

  process.once('SIGTERM', () => void stop('SIGTERM'));
  process.once('SIGINT', () => void stop('SIGINT'));
  await once(server, 'close');
  await stopping;
}

void main().catch((error) => {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      service: 'sport-analytics-worker',
      message: 'Worker startup or shutdown failed.',
      errorName: error instanceof Error ? error.name : 'UnknownError',
    }),
  );
  process.exitCode = 1;
});
