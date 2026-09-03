import { once } from 'node:events';

import { loadWorkerEnvironment } from './config';
import { DeliveryPump } from './delivery-pump';
import { closeHealthServer, HealthMonitor, startHealthServer } from './health';
import { createLogger } from './logger';
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
  const pump = new DeliveryPump(
    dependencies.deliveryReceiver,
    createProbeJobHandler(dependencies.checks, logger, environment.WORKER_PROBE_DELAY_MS),
    logger,
  );

  await monitor.start();
  const server = await startHealthServer(
    environment.WORKER_PORT,
    monitor,
    pump.metrics,
    environment.workerId,
  );
  pump.start();
  logger.info('Asynchronous worker is running.', {
    workerId: environment.workerId,
    port: environment.WORKER_PORT,
    concurrency: environment.WORKER_CONCURRENCY,
  });

  let stopping: Promise<void> | undefined;
  const stop = (signal: NodeJS.Signals): Promise<void> => {
    stopping ??= (async () => {
      logger.info('Worker shutdown requested.', { signal });
      monitor.markShuttingDown();
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
