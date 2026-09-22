/**
 * Exercise the deployed dataset-release path without embedding any deployment
 * credentials in the repository. The administrator token is supplied at run
 * time and the resulting JSON is retained as Sprint 3 evidence.
 *
 * Usage:
 *   PRODUCTION_ACCEPTANCE_API_BASE_URL=https://api.example/api/v1 \
 *   PRODUCTION_ACCEPTANCE_FRONTEND_URL=https://web.example \
 *   PRODUCTION_ACCEPTANCE_ADMIN_TOKEN=... \
 *   PRODUCTION_ACCEPTANCE_RELEASE_VERSION=2026.09.21-issue-565 \
 *   node scripts/production-scale-deployment-acceptance.mjs --output evidence/sprints/sprint-3/issue-565-live-result.json
 */
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_POLL_INTERVAL_MS = 10_000;

function requiredString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${name} is required.`);
  return value.trim();
}

function positiveInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1)
    throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

function apiUrl(baseUrl, path) {
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

function releaseFromResponse(payload) {
  const release = payload?.data;
  if (!release || typeof release.version !== 'string' || typeof release.checksum !== 'string') {
    return null;
  }
  return release;
}

function jobFromResponse(payload) {
  const job = payload?.data;
  if (!job || typeof job.jobId !== 'string' || typeof job.status !== 'string') return null;
  return job;
}

function fixtureIdFromResponse(payload) {
  const fixtureId = payload?.data?.[0]?.fixtureId;
  if (typeof fixtureId !== 'string' && typeof fixtureId !== 'number') return null;
  return String(fixtureId);
}

async function expectResponse(fetchRequest, url, options, label) {
  const response = await fetchRequest(url, options);
  if (!response.ok) throw new Error(`${label} failed with HTTP ${response.status}.`);
  return response;
}

async function readJson(response, label) {
  try {
    return await response.json();
  } catch {
    throw new Error(`${label} returned invalid JSON.`);
  }
}

function sampleDuration(now, started) {
  const duration = now() - started;
  return Number.isFinite(duration) && duration >= 0 ? duration : 0;
}

export async function runProductionScaleAcceptance(input, dependencies = {}) {
  const apiBaseUrl = requiredString(input.apiBaseUrl, 'apiBaseUrl').replace(/\/$/, '');
  const frontendUrl = requiredString(input.frontendUrl, 'frontendUrl').replace(/\/$/, '');
  const releaseVersion = requiredString(input.releaseVersion, 'releaseVersion');
  const token = requiredString(input.token, 'token');
  const pollIntervalMs = positiveInteger(
    input.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
    'pollIntervalMs',
  );
  const fetchRequest = dependencies.fetchRequest ?? globalThis.fetch;
  const wait =
    dependencies.wait ?? ((delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)));
  const now = dependencies.now ?? (() => performance.now());
  const authorization = { authorization: `Bearer ${token}` };

  const health = await expectResponse(
    fetchRequest,
    apiUrl(apiBaseUrl, '/health'),
    {
      headers: { origin: frontendUrl },
    },
    'backend health',
  );
  const healthPayload = await readJson(health, 'backend health');
  if (healthPayload.status !== 'ok' || healthPayload.service !== 'sport-analytics-api') {
    throw new Error(
      'Backend health response did not identify a healthy sport-analytics-api service.',
    );
  }
  if (health.headers.get('access-control-allow-origin') !== frontendUrl) {
    throw new Error(
      'Backend health response did not allow the deployed frontend origin through CORS.',
    );
  }

  const frontend = await expectResponse(fetchRequest, frontendUrl, {}, 'frontend availability');
  const frontendHtml = await frontend.text();
  if (!frontendHtml.includes("Stat'sTheGame")) {
    throw new Error("Frontend response did not contain the Stat'sTheGame application marker.");
  }
  const frontendRoute = await expectResponse(
    fetchRequest,
    apiUrl(frontendUrl, '/fixtures'),
    {},
    'frontend fixture route availability',
  );
  if (!(await frontendRoute.text()).includes("Stat'sTheGame")) {
    throw new Error("Frontend fixture route did not return the Stat'sTheGame application marker.");
  }

  await readJson(
    await expectResponse(
      fetchRequest,
      apiUrl(apiBaseUrl, '/competitions?limit=1'),
      {},
      'database read smoke',
    ),
    'database read smoke',
  );
  const fixtureList = await readJson(
    await expectResponse(
      fetchRequest,
      apiUrl(apiBaseUrl, '/fixtures?limit=1'),
      {},
      'representative fixture read',
    ),
    'representative fixture read',
  );
  const fixtureId = fixtureIdFromResponse(fixtureList);
  if (!fixtureId) {
    throw new Error('Representative fixture read did not return a fixture identifier.');
  }
  await readJson(
    await expectResponse(
      fetchRequest,
      apiUrl(apiBaseUrl, '/auth/me'),
      { headers: authorization },
      'authenticated API smoke',
    ),
    'authenticated API smoke',
  );

  const requested = await expectResponse(
    fetchRequest,
    apiUrl(apiBaseUrl, '/admin/dataset-releases'),
    {
      body: JSON.stringify({ version: releaseVersion }),
      headers: { ...authorization, 'content-type': 'application/json' },
      method: 'POST',
    },
    'dataset release request',
  );
  const requestPayload = await readJson(requested, 'dataset release request');
  let release = releaseFromResponse(requestPayload);
  let job = jobFromResponse(requestPayload);
  if (requested.status === 200 && !input.allowExistingRelease) {
    throw new Error(
      'Dataset release version already exists; choose a fresh releaseVersion for a full async run.',
    );
  }
  if (!release && (requested.status !== 202 || !job)) {
    throw new Error('Dataset release request did not return an asynchronous generation job.');
  }

  const readSamples = [];
  while (!release) {
    await wait(pollIntervalMs);
    const jobResponse = await expectResponse(
      fetchRequest,
      apiUrl(apiBaseUrl, `/admin/dataset-release-jobs/${encodeURIComponent(job.jobId)}`),
      { headers: authorization },
      'dataset release job poll',
    );
    job = jobFromResponse(await readJson(jobResponse, 'dataset release job poll'));
    if (!job) throw new Error('Dataset release job poll returned an invalid job.');
    if (job.status === 'failed') throw new Error('Dataset release job reported failure.');
    if (job.status === 'completed' && !job.release) {
      throw new Error('Dataset release job completed without release metadata.');
    }
    if (job.status === 'generating') {
      const started = now();
      await readJson(
        await expectResponse(
          fetchRequest,
          apiUrl(apiBaseUrl, '/fixtures?limit=1'),
          {},
          'public fixture read during generation',
        ),
        'public fixture read during generation',
      );
      readSamples.push({ durationMs: sampleDuration(now, started), endpoint: '/fixtures?limit=1' });
      const statisticsStarted = now();
      await readJson(
        await expectResponse(
          fetchRequest,
          apiUrl(apiBaseUrl, `/fixtures/${encodeURIComponent(fixtureId)}/statistics`),
          {},
          'public fixture statistics read during generation',
        ),
        'public fixture statistics read during generation',
      );
      readSamples.push({
        durationMs: sampleDuration(now, statisticsStarted),
        endpoint: `/fixtures/${fixtureId}/statistics`,
      });
    }
    release = job.release ?? null;
  }

  const metadata = releaseFromResponse(
    await readJson(
      await expectResponse(
        fetchRequest,
        apiUrl(apiBaseUrl, `/dataset-releases/${encodeURIComponent(releaseVersion)}`),
        {},
        'published release metadata retrieval',
      ),
      'published release metadata retrieval',
    ),
  );
  if (!metadata || metadata.version !== releaseVersion) {
    throw new Error('Published release metadata was unavailable or belonged to another version.');
  }
  const artifactResponse = await expectResponse(
    fetchRequest,
    apiUrl(apiBaseUrl, `/dataset-releases/${encodeURIComponent(releaseVersion)}/artifact.json`),
    {},
    'published release artifact retrieval',
  );
  const artifactChecksum = createHash('sha256')
    .update(Buffer.from(await artifactResponse.arrayBuffer()))
    .digest('hex');
  if (artifactChecksum !== metadata.checksum) {
    throw new Error(
      'Downloaded dataset-release artifact does not match the published SHA-256 checksum.',
    );
  }

  return {
    completedAt: new Date().toISOString(),
    health: healthPayload,
    readSamples,
    release: {
      checksum: metadata.checksum,
      eventCount: metadata.eventCount,
      version: metadata.version,
    },
  };
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main() {
  const output = argument('--output');
  const result = await runProductionScaleAcceptance({
    allowExistingRelease: process.env.PRODUCTION_ACCEPTANCE_ALLOW_EXISTING_RELEASE === 'true',
    apiBaseUrl: process.env.PRODUCTION_ACCEPTANCE_API_BASE_URL,
    frontendUrl: process.env.PRODUCTION_ACCEPTANCE_FRONTEND_URL,
    pollIntervalMs: process.env.PRODUCTION_ACCEPTANCE_POLL_INTERVAL_MS,
    releaseVersion: process.env.PRODUCTION_ACCEPTANCE_RELEASE_VERSION,
    token: process.env.PRODUCTION_ACCEPTANCE_ADMIN_TOKEN,
  });
  const rendered = `${JSON.stringify(result, null, 2)}\n`;
  if (output) {
    const target = resolve(output);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, rendered);
    console.log(`Wrote ${target}`);
  } else {
    console.log(rendered);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
