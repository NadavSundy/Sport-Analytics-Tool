import { mkdir, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const graphBaseUrl = 'https://graph.microsoft.com/v1.0';
const witsSharePointHostname = 'witscloud-my.sharepoint.com';
const witsUserTestingSitePath = '/personal/2803899_students_wits_ac_za';
const responsesFolderPath = 'Sport Analytics/User Testing/responses';
const safeJsonFilename = /^[A-Za-z0-9][A-Za-z0-9._-]*\.json$/i;

const requiredEnvironmentNames = [
  'MICROSOFT_TENANT_ID',
  'MICROSOFT_CLIENT_ID',
  'MICROSOFT_CLIENT_SECRET',
];

/**
 * @param {NodeJS.ProcessEnv} environment
 * @returns {{ tenantId: string; clientId: string; clientSecret: string }}
 */
export function readGraphConfig(environment = process.env) {
  const tenantId = environment.MICROSOFT_TENANT_ID;
  const clientId = environment.MICROSOFT_CLIENT_ID;
  const clientSecret = environment.MICROSOFT_CLIENT_SECRET;
  const missing = requiredEnvironmentNames.filter((name) => !environment[name]);

  if (missing.length > 0 || !tenantId || !clientId || !clientSecret) {
    throw new Error(
      `Required Microsoft Graph environment variable(s) not configured: ${missing.join(', ')}`,
    );
  }

  return { tenantId, clientId, clientSecret };
}

function graphHeaders(accessToken) {
  return { Authorization: `Bearer ${accessToken}` };
}

function graphError(action, response) {
  if (response.status === 404) return new Error(`Microsoft Graph ${action} was not found.`);
  return new Error(`Microsoft Graph ${action} failed with HTTP ${response.status}.`);
}

function safeGraphPageUrl(nextPage) {
  const url = new URL(nextPage);
  if (url.protocol !== 'https:' || url.hostname !== 'graph.microsoft.com') {
    throw new Error('Microsoft Graph feedback listing returned an unsafe next page.');
  }
  return url.toString();
}

async function getAccessToken(config, fetchImplementation) {
  const form = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'client_credentials',
    scope: 'https://graph.microsoft.com/.default',
  });
  const response = await fetchImplementation(
    `https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    },
  );
  if (!response.ok) {
    throw new Error(`Microsoft Graph authentication failed with HTTP ${response.status}.`);
  }

  const token = await response.json();
  if (!token || typeof token.access_token !== 'string' || token.access_token.length === 0) {
    throw new Error('Microsoft Graph authentication returned an invalid access token response.');
  }
  return token.access_token;
}

async function resolveSiteDrive(accessToken, fetchImplementation) {
  const encodedSitePath = witsUserTestingSitePath
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');
  const siteResponse = await fetchImplementation(
    `${graphBaseUrl}/sites/${witsSharePointHostname}:/${encodedSitePath}?$select=id`,
    { headers: graphHeaders(accessToken) },
  );
  if (!siteResponse.ok) throw graphError('feedback source site', siteResponse);

  const site = await siteResponse.json();
  if (!site || typeof site.id !== 'string') {
    throw new Error('Microsoft Graph feedback source site returned an invalid response.');
  }

  const driveResponse = await fetchImplementation(
    `${graphBaseUrl}/sites/${encodeURIComponent(site.id)}/drive?$select=id`,
    { headers: graphHeaders(accessToken) },
  );
  if (!driveResponse.ok) throw graphError('feedback source drive', driveResponse);

  const drive = await driveResponse.json();
  if (!drive || typeof drive.id !== 'string') {
    throw new Error('Microsoft Graph feedback source drive returned an invalid response.');
  }
  return drive.id;
}

async function listFeedbackFiles(driveId, accessToken, fetchImplementation) {
  const encodedDriveId = encodeURIComponent(driveId);
  const encodedFolderPath = responsesFolderPath.split('/').map(encodeURIComponent).join('/');
  /** @type {string | null} */
  let nextPage = `${graphBaseUrl}/drives/${encodedDriveId}/root:/${encodedFolderPath}:/children?$select=id,name,file`;
  const files = [];

  while (nextPage) {
    const response = await fetchImplementation(nextPage, {
      headers: graphHeaders(accessToken),
    });
    if (!response.ok) throw graphError('feedback responses folder', response);

    const page = await response.json();
    if (!page || !Array.isArray(page.value)) {
      throw new Error('Microsoft Graph feedback responses folder returned an invalid response.');
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

function validateJsonResponse(value) {
  try {
    JSON.parse(value);
  } catch {
    throw new Error('A retrieved user-testing feedback file contains invalid JSON.');
  }
}

/**
 * Retrieves restricted Power Automate JSON through Microsoft Graph without logging credentials,
 * identifiers, filenames, or response content.
 *
 * @param {string} destinationDirectory
 * @param {{ environment?: NodeJS.ProcessEnv; fetchImplementation?: typeof fetch }} [options]
 */
export async function retrieveUserTestingFeedback(
  destinationDirectory = 'testing/user-feedback/input',
  options = {},
) {
  const config = readGraphConfig(options.environment);
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const accessToken = await getAccessToken(config, fetchImplementation);
  const driveId = await resolveSiteDrive(accessToken, fetchImplementation);
  const files = await listFeedbackFiles(driveId, accessToken, fetchImplementation);
  const destination = resolve(destinationDirectory);

  await mkdir(destination, { recursive: true });
  const writtenNames = new Set();

  for (const file of files.sort((left, right) => left.name.localeCompare(right.name))) {
    const filename = basename(file.name);
    if (!safeJsonFilename.test(filename) || writtenNames.has(filename)) {
      throw new Error(
        'Microsoft Graph feedback source contains an unsafe or duplicate JSON filename.',
      );
    }
    writtenNames.add(filename);

    const response = await fetchImplementation(
      `${graphBaseUrl}/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(file.id)}/content`,
      { headers: graphHeaders(accessToken) },
    );
    if (!response.ok) throw graphError('feedback response download', response);

    const json = await response.text();
    validateJsonResponse(json);
    await writeFile(resolve(destination, filename), json, 'utf8');
  }

  return files.length;
}

async function main() {
  const destinationDirectory = process.argv[2] ?? 'testing/user-feedback/input';
  const count = await retrieveUserTestingFeedback(destinationDirectory);
  console.log(`Retrieved ${count} user-testing feedback JSON file(s).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`User-testing feedback retrieval failed: ${error.message}`);
    process.exitCode = 1;
  });
}
