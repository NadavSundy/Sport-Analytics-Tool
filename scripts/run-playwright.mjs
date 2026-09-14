import { spawn } from 'node:child_process';
import net from 'node:net';

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Could not select a Playwright preview port.'));
        return;
      }

      server.close((error) => (error ? reject(error) : resolve(address.port)));
    });
  });
}

const npmExecPath = process.env.npm_execpath;
if (!npmExecPath) {
  throw new Error('npm_execpath is unavailable. Start this command through npm.');
}

const port = await findAvailablePort();
const child = spawn(
  process.execPath,
  [npmExecPath, 'exec', '--', 'playwright', 'test', ...process.argv.slice(2)],
  {
    env: { ...process.env, PLAYWRIGHT_PORT: String(port) },
    stdio: 'inherit',
  },
);

child.once('error', (error) => {
  throw error;
});
child.once('exit', (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
