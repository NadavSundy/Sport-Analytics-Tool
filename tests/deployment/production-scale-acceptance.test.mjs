import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import { runProductionScaleAcceptance } from '../../scripts/production-scale-deployment-acceptance.mjs';

const apiBaseUrl = 'https://api.example.test/api/v1';
const frontendUrl = 'https://web.example.test';
const version = '2026.09.21-issue-565';
const artifact = '{"events":[]}\n';
const checksum = createHash('sha256').update(artifact).digest('hex');
const release = {
  checksum,
  eventCount: 3207110,
  version,
};

test('runs the deployed release acceptance path, samples reads while the worker runs, and verifies immutable retrieval', async () => {
  const requests = [];
  let jobReads = 0;
  const result = await runProductionScaleAcceptance(
    {
      apiBaseUrl,
      frontendUrl,
      pollIntervalMs: 1,
      releaseVersion: version,
      token: 'administrator-token',
    },
    {
      fetchRequest: async (url, options = {}) => {
        const requestUrl = String(url);
        requests.push({ method: options.method ?? 'GET', url: requestUrl });
        if (requestUrl === `${apiBaseUrl}/health`) {
          return Response.json(
            { service: 'sport-analytics-api', status: 'ok' },
            {
              headers: { 'access-control-allow-origin': frontendUrl },
              status: 200,
            },
          );
        }
        if (requestUrl === frontendUrl || requestUrl === `${frontendUrl}/fixtures`) {
          return new Response("<title>Stat'sTheGame</title>");
        }
        if (requestUrl === `${apiBaseUrl}/competitions?limit=1`) {
          return Response.json({ data: [{ competitionId: 7 }] });
        }
        if (requestUrl === `${apiBaseUrl}/auth/me`) {
          assert.equal(options.headers.authorization, 'Bearer administrator-token');
          return Response.json({ user: { role: 'admin' } });
        }
        if (requestUrl === `${apiBaseUrl}/admin/dataset-releases` && options.method === 'POST') {
          return Response.json(
            { data: { jobId: '11111111-1111-4111-8111-111111111111', status: 'pending' } },
            { status: 202 },
          );
        }
        if (requestUrl.includes('/admin/dataset-release-jobs/')) {
          jobReads += 1;
          return Response.json({
            data: {
              jobId: '11111111-1111-4111-8111-111111111111',
              release: jobReads === 1 ? null : release,
              status: jobReads === 1 ? 'generating' : 'completed',
            },
          });
        }
        if (requestUrl === `${apiBaseUrl}/fixtures?limit=1`) {
          return Response.json({ data: [{ fixtureId: 23 }] });
        }
        if (requestUrl === `${apiBaseUrl}/fixtures/23/statistics`) {
          return Response.json({ data: { fixtureId: 23, statistics: [] } });
        }
        if (requestUrl === `${apiBaseUrl}/dataset-releases/${version}`) {
          return Response.json({ data: release });
        }
        if (requestUrl === `${apiBaseUrl}/dataset-releases/${version}/artifact.json`) {
          return new Response(artifact, { status: 200 });
        }
        throw new Error(`Unexpected request: ${options.method ?? 'GET'} ${requestUrl}`);
      },
      now: (() => {
        let time = 0;
        return () => (time += 5);
      })(),
      wait: async () => {},
    },
  );

  assert.equal(result.release.checksum, checksum);
  assert.equal(result.release.eventCount, 3207110);
  assert.equal(result.readSamples.length, 2);
  assert.ok(result.readSamples[0].durationMs > 0);
  assert.equal(result.readSamples[1].endpoint, '/fixtures/23/statistics');
  assert.ok(requests.some((request) => request.url === `${apiBaseUrl}/auth/me`));
  assert.ok(requests.some((request) => request.url === `${apiBaseUrl}/fixtures?limit=1`));
  assert.ok(requests.some((request) => request.url === `${apiBaseUrl}/fixtures/23/statistics`));
  assert.ok(requests.some((request) => request.url === `${frontendUrl}/fixtures`));
});

test('rejects a completed release when its downloaded artifact does not match the published checksum', async () => {
  await assert.rejects(
    runProductionScaleAcceptance(
      {
        allowExistingRelease: true,
        apiBaseUrl,
        frontendUrl,
        pollIntervalMs: 1,
        releaseVersion: version,
        token: 'administrator-token',
      },
      {
        fetchRequest: async (url, options = {}) => {
          const requestUrl = String(url);
          if (requestUrl === `${apiBaseUrl}/health`) {
            return Response.json(
              { service: 'sport-analytics-api', status: 'ok' },
              { headers: { 'access-control-allow-origin': frontendUrl }, status: 200 },
            );
          }
          if (requestUrl === frontendUrl || requestUrl === `${frontendUrl}/fixtures`) {
            return new Response("<title>Stat'sTheGame</title>");
          }
          if (requestUrl === `${apiBaseUrl}/competitions?limit=1`)
            return Response.json({ data: [] });
          if (requestUrl === `${apiBaseUrl}/fixtures?limit=1`) {
            return Response.json({ data: [{ fixtureId: 23 }] });
          }
          if (requestUrl === `${apiBaseUrl}/auth/me`)
            return Response.json({ user: { role: 'admin' } });
          if (requestUrl === `${apiBaseUrl}/admin/dataset-releases`) {
            return Response.json({ data: release });
          }
          if (requestUrl === `${apiBaseUrl}/dataset-releases/${version}`) {
            return Response.json({ data: release });
          }
          if (requestUrl === `${apiBaseUrl}/dataset-releases/${version}/artifact.json`) {
            return new Response('wrong bytes', { status: 200 });
          }
          throw new Error(`Unexpected request: ${options.method ?? 'GET'} ${requestUrl}`);
        },
      },
    ),
    /does not match the published SHA-256 checksum/,
  );
});
