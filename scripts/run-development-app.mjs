import { spawnSync } from 'node:child_process';

const workspaces = {
  frontend: '@sport-analytics/frontend',
  backend: '@sport-analytics/backend',
};

const argumentsToForward = process.argv.slice(2);
const requestedApp = argumentsToForward[0]?.startsWith('-')
  ? 'frontend'
  : (argumentsToForward.shift() ?? 'frontend');

if (!(requestedApp in workspaces)) {
  console.error(`Unknown development app "${requestedApp}". Use "frontend" or "backend".`);
  process.exitCode = 1;
} else {
  const npmCli = process.env.npm_execpath;

  if (!npmCli) {
    console.error('npm_execpath is unavailable. Start this command through npm.');
    process.exitCode = 1;
  } else {
    const result = spawnSync(
      process.execPath,
      [
        npmCli,
        'run',
        'dev',
        `--workspace=${workspaces[requestedApp]}`,
        '--',
        ...argumentsToForward,
      ],
      { stdio: 'inherit' },
    );

    if (result.error) {
      console.error(`Could not start the ${requestedApp} development app: ${result.error.message}`);
      process.exitCode = 1;
    } else {
      process.exitCode = result.status ?? 1;
    }
  }
}
