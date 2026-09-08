import { execFile as execFileCallback } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { ingestFeedbackDirectory } from './user-feedback-ingestion.mjs';

const defaultInputDirectory = 'testing/user-feedback/input';
const defaultRemote = 'wits-onedrive';
const defaultSource = 'Sport Analytics/User Testing/responses';
const execFile = promisify(execFileCallback);

function rcloneSettings(environment) {
  return {
    remote: environment.RCLONE_REMOTE?.trim() || defaultRemote,
    source: environment.RCLONE_SOURCE?.trim() || defaultSource,
  };
}

function isMissingRclone(error) {
  return error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT';
}

async function listRemoteJsonFiles(execute, remotePath) {
  let result;
  try {
    result = await execute('rclone', ['lsjson', remotePath, '--files-only', '--include', '*.json']);
  } catch (error) {
    if (isMissingRclone(error))
      throw new Error('rclone is not installed or is not available on PATH.');
    throw new Error('OneDrive retrieval failed while listing JSON feedback files.');
  }

  try {
    const files = JSON.parse(result.stdout);
    if (!Array.isArray(files) || files.length === 0) {
      throw new Error('No JSON user-testing feedback files were retrieved from OneDrive.');
    }
    return files.length;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('No JSON')) throw error;
    throw new Error('OneDrive retrieval returned an invalid JSON file listing.');
  }
}

/**
 * Retrieves anonymised Power Automate JSON responses from the configured Wits OneDrive rclone
 * remote, then validates them through the existing ingestion boundary before evidence generation.
 *
 * @param {{ destinationDirectory?: string, environment?: NodeJS.ProcessEnv, execute?: typeof execFile }} [options]
 */
export async function retrieveUserTestingFeedback(options = {}) {
  const destination = resolve(options.destinationDirectory ?? defaultInputDirectory);
  const environment = options.environment ?? process.env;
  const execute = options.execute ?? execFile;
  const settings = rcloneSettings(environment);
  const remotePath = `${settings.remote}:${settings.source}`;
  const count = await listRemoteJsonFiles(execute, remotePath);

  await mkdir(destination, { recursive: true });
  try {
    await execute('rclone', ['copy', remotePath, destination, '--include', '*.json']);
  } catch (error) {
    if (isMissingRclone(error))
      throw new Error('rclone is not installed or is not available on PATH.');
    throw new Error('OneDrive retrieval failed while copying JSON feedback files.');
  }

  await ingestFeedbackDirectory(destination);
  return count;
}

async function main() {
  const count = await retrieveUserTestingFeedback();
  console.log(`Retrieved and validated ${count} user-testing feedback JSON file(s).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`User-testing feedback retrieval failed: ${error.message}`);
    process.exitCode = 1;
  });
}
