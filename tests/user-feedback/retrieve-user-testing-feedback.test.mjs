import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  readGraphConfig,
  retrieveUserTestingFeedback,
} from '../../scripts/retrieve-user-testing-feedback.mjs';

const sourceEnvironment = {
  MICROSOFT_TENANT_ID: 'tenant-id',
  MICROSOFT_CLIENT_ID: 'client-id',
  MICROSOFT_CLIENT_SECRET: 'test-client-secret',
};

function successfulGraphFetch({ responseJson = '{"participant":"P01"}' } = {}) {
  const requests = [];
  const fetchImplementation = async (url, options) => {
    requests.push({ url, options });
    if (url.includes('/oauth2/v2.0/token')) {
      return { ok: true, json: async () => ({ access_token: 'test-access-token' }) };
    }
    if (url.includes('/sites/witscloud-my.sharepoint.com:')) {
      return { ok: true, json: async () => ({ id: 'site-id' }) };
    }
    if (url.includes('/sites/site-id/drive')) {
      return { ok: true, json: async () => ({ id: 'drive-id' }) };
    }
    if (url.includes('root:/Sport%20Analytics/User%20Testing/responses:/children')) {
      return {
        ok: true,
        json: async () => ({
          value: [
            { id: 'response-id', name: 'response-001.json', file: {} },
            { id: 'not-json-id', name: 'notes.txt', file: {} },
          ],
        }),
      };
    }
    return { ok: true, text: async () => responseJson };
  };

  return { fetchImplementation, requests };
}

test('fails safely when Microsoft Graph authentication is not configured', () => {
  assert.throws(
    () => readGraphConfig({}),
    /MICROSOFT_TENANT_ID.*MICROSOFT_CLIENT_ID.*MICROSOFT_CLIENT_SECRET/,
  );
});

test('retrieves only JSON feedback files through mocked Microsoft Graph responses', async () => {
  const destination = await mkdtemp(join(tmpdir(), 'sport-analytics-user-testing-retrieval-'));
  const { fetchImplementation, requests } = successfulGraphFetch();

  try {
    const count = await retrieveUserTestingFeedback(destination, {
      environment: sourceEnvironment,
      fetchImplementation,
    });

    assert.equal(count, 1);
    assert.equal(
      await readFile(join(destination, 'response-001.json'), 'utf8'),
      '{"participant":"P01"}',
    );
    assert.equal(requests.length, 5);
    assert.equal(requests[0].options.method, 'POST');
    assert.match(requests[0].options.body.toString(), /client_secret=test-client-secret/);
    assert.equal(requests[1].options.headers.Authorization, 'Bearer test-access-token');
    assert.ok(
      requests.slice(1).every(({ url }) => url.startsWith('https://graph.microsoft.com/v1.0/')),
      'retrieval must use Microsoft Graph rather than a SharePoint HTML page',
    );
  } finally {
    await rm(destination, { recursive: true, force: true });
  }
});

test('reports a Microsoft Graph authentication failure without exposing credentials', async () => {
  await assert.rejects(
    retrieveUserTestingFeedback('unused', {
      environment: sourceEnvironment,
      fetchImplementation: async () => ({ ok: false, status: 401 }),
    }),
    (error) => {
      assert.match(error.message, /authentication failed with HTTP 401/);
      assert.doesNotMatch(error.message, /test-client-secret/);
      return true;
    },
  );
});

test('reports a missing responses folder from Microsoft Graph', async () => {
  const { fetchImplementation } = successfulGraphFetch();
  let requestNumber = 0;
  const missingFolderFetch = async (url, options) => {
    requestNumber += 1;
    if (requestNumber === 4) return { ok: false, status: 404 };
    return fetchImplementation(url, options);
  };

  await assert.rejects(
    retrieveUserTestingFeedback('unused', {
      environment: sourceEnvironment,
      fetchImplementation: missingFolderFetch,
    }),
    /feedback responses folder was not found/,
  );
});

test('rejects invalid JSON without saving it locally', async () => {
  const destination = await mkdtemp(join(tmpdir(), 'sport-analytics-user-testing-retrieval-'));
  const { fetchImplementation } = successfulGraphFetch({ responseJson: '{' });

  try {
    await assert.rejects(
      retrieveUserTestingFeedback(destination, {
        environment: sourceEnvironment,
        fetchImplementation,
      }),
      /contains invalid JSON/,
    );
    await assert.rejects(access(join(destination, 'response-001.json')));
  } finally {
    await rm(destination, { recursive: true, force: true });
  }
});
