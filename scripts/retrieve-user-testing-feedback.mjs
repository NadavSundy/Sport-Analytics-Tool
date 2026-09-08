import { mkdir, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const requiredEnvironmentNames = [
  'USER_TESTING_FEEDBACK_ONEDRIVE_DRIVE_ID',
  'USER_TESTING_FEEDBACK_ONEDRIVE_FOLDER_ID',
  'USER_TESTING_FEEDBACK_ONEDRIVE_ACCESS_TOKEN',
];

const safeJsonFilename = /^[A-Za-z0-9][A-Za-z0-9._-]*\.json$/i;

/**
 * @param {NodeJS.ProcessEnv} environment
 * @returns {{ driveId: string; folderId: string; accessToken: string }}
 */
export function readFeedbackSourceConfig(environment = process.env) {
  const driveId = environment.USER_TESTING_FEEDBACK_ONEDRIVE_DRIVE_ID;
  const folderId = environment.USER_TESTING_FEEDBACK_ONEDRIVE_FOLDER_ID;
  const accessToken = environment.USER_TESTING_FEEDBACK_ONEDRIVE_ACCESS_TOKEN;
  const missing = requiredEnvironmentNames.filter((name) => !environment[name]);
  if (missing.length > 0 || !driveId || !folderId || !accessToken) {
    throw new Error(
      `Required feedback-source environment variable(s) not configured: ${missing.join(', ')}`,
    );
  }

  return {
    driveId,
    folderId,
    accessToken,
  };
}

function graphHeaders(accessToken) {
  return { Authorization: `Bearer ${accessToken}` };
}

function sourceError(action, response) {
  return new Error(`OneDrive user-testing feedback ${action} failed with HTTP ${response.status}.`);
}

function safeGraphPageUrl(nextPage) {
  const url = new URL(nextPage);
  if (url.protocol !== 'https:' || url.hostname !== 'graph.microsoft.com') {
    throw new Error('OneDrive user-testing feedback listing returned an unsafe next page.');
  }
  return url.toString();
}

async function listFeedbackFiles(config, fetchImplementation) {
  const encodedDriveId = encodeURIComponent(config.driveId);
  const encodedFolderId = encodeURIComponent(config.folderId);
  /** @type {string | null} */
  let nextPage = `https://graph.microsoft.com/v1.0/drives/${encodedDriveId}/items/${encodedFolderId}/children?$select=id,name,file`;
  const files = [];

  while (nextPage) {
    const response = await fetchImplementation(nextPage, {
      headers: graphHeaders(config.accessToken),
    });
    if (!response.ok) throw sourceError('listing', response);

    const page = await response.json();
    if (!page || !Array.isArray(page.value)) {
      throw new Error('OneDrive user-testing feedback listing returned an invalid response.');
    }

    files.push(...page.value);
    nextPage =
      typeof page['@odata.nextLink'] === 'string'
        ? safeGraphPageUrl(page['@odata.nextLink'])
        : null;
  }

  return files.filter(
    (file) =>
      file &&
      typeof file.id === 'string' &&
      typeof file.name === 'string' &&
      file.file &&
      safeJsonFilename.test(file.name),
  );
}

/**
 * Retrieves the restricted Power Automate JSON exports without logging source identifiers or tokens.
 *
 * @param {string} destinationDirectory
 * @param {{ environment?: NodeJS.ProcessEnv; fetchImplementation?: typeof fetch }} [options]
 */
export async function retrieveUserTestingFeedback(destinationDirectory, options = {}) {
  const config = readFeedbackSourceConfig(options.environment);
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const files = await listFeedbackFiles(config, fetchImplementation);
  const destination = resolve(destinationDirectory);

  await mkdir(destination, { recursive: true });
  const writtenNames = new Set();

  for (const file of files.sort((left, right) => left.name.localeCompare(right.name))) {
    const filename = basename(file.name);
    if (!safeJsonFilename.test(filename) || writtenNames.has(filename)) {
      throw new Error(
        'OneDrive user-testing feedback contains an unsafe or duplicate JSON filename.',
      );
    }
    writtenNames.add(filename);

    const encodedDriveId = encodeURIComponent(config.driveId);
    const encodedFileId = encodeURIComponent(file.id);
    const response = await fetchImplementation(
      `https://graph.microsoft.com/v1.0/drives/${encodedDriveId}/items/${encodedFileId}/content`,
      { headers: graphHeaders(config.accessToken) },
    );
    if (!response.ok) throw sourceError('download', response);

    await writeFile(resolve(destination, filename), await response.text(), 'utf8');
  }

  return files.length;
}

async function main() {
  const destinationDirectory = process.argv[2];
  if (!destinationDirectory)
    throw new Error('Supply a local directory for retrieved user-testing feedback.');

  const count = await retrieveUserTestingFeedback(destinationDirectory);
  console.log(`Retrieved ${count} user-testing feedback JSON file(s).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`User-testing feedback retrieval failed: ${error.message}`);
    process.exitCode = 1;
  });
}
