import { createApp } from './app';
import { loadEnvironment } from './config/env';

const environment = loadEnvironment();
const app = createApp();

const server = app.listen(environment.PORT, () => {
  console.log(`Sport Analytics API listening on port ${environment.PORT}`);
});

function shutdown(signal: string) {
  console.log(`${signal} received; closing HTTP server`);
  server.close((error) => {
    if (error) {
      console.error('Failed to close HTTP server cleanly', error);
      process.exitCode = 1;
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
