import 'dotenv/config';

import { createApp } from './app';
import { loadEnvironment } from './config/env';
import { closeDatabasePool } from './database';

const environment = loadEnvironment();
const app = createApp({ environment });

const server = app.listen(environment.PORT, () => {
  console.log(`Sport Analytics API listening on port ${environment.PORT}`);
});

let shuttingDown = false;

function closeHttpServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log(`${signal} received; shutting down`);

  try {
    await closeHttpServer();
  } catch {
    console.error('Failed to close HTTP server cleanly.');
    process.exitCode = 1;
  }

  try {
    await closeDatabasePool();
  } catch {
    console.error('Failed to close database pool cleanly.');
    process.exitCode = 1;
  }
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
