import request from 'supertest';
import { describe, expect, test } from 'vitest';

import { BatchConflictError } from '../../src/modules/batches/batch.service';
import { CONSUMER_API_KEY, contractApp } from './contract-app';
import {
  BATCH_REFERENCE,
  apiConsumer,
  batchDecisionReceipt,
  batchReceipt,
  batchReport,
  batchStatus,
  correctionPayload,
  correctionReceipt,
  datasetRelease,
  provenanceSubmissionDetail,
  submissionPayload,
  submissionReceipt,
} from './contract-samples';
import { createOpenApiContract } from './openapi-contract';

/**
 * Responses, parameters, headers and operations that the implementation already
 * had but docs/api/openapi.yaml did not describe correctly until issue #609.
 * Each exchange is checked against the corrected contract.
 */

const contract = createOpenApiContract();

const token = 'Bearer contract-token';
const MALFORMED_REFERENCE = 'not-a-uuid';
const INVALID_JSON = '{"unterminated": ';
const OVER_ONE_MEGABYTE = 'x'.repeat(1_100_000);
const OVER_SIXTEEN_KILOBYTES = 'x'.repeat(17 * 1024);

/** Sends a raw JSON-typed body, which the contract then treats as an invalid request. */
function sendRaw(test: request.Test, body: string) {
  return test.set('Content-Type', 'application/json').send(body);
}

describe('undocumented JSON body errors', () => {
  const operations = [
    { method: 'post', path: '/api/v1/submitter-access-requests', account: {} },
    {
      method: 'post',
      path: '/api/v1/submitter-scope-requests',
      account: { role: 'submitter', approvalState: 'approved' },
    },
    { method: 'post', path: '/api/v1/admin/api-consumers', account: { role: 'admin' } },
    { method: 'delete', path: '/api/v1/account', account: {} },
    { method: 'patch', path: '/api/v1/admin/users/2/role', account: { role: 'admin' } },
    { method: 'patch', path: '/api/v1/admin/users/2/submitter-access', account: { role: 'admin' } },
    {
      method: 'post',
      path: '/api/v1/admin/users/2/submitter-access/rejection',
      account: { role: 'admin' },
    },
  ] as const;

  test.each(operations)(
    '$method $path returns the documented 400 for malformed JSON',
    async (operation) => {
      const app = contractApp({ account: operation.account as never });
      const response = await sendRaw(
        request(app)[operation.method](operation.path).set('Authorization', token),
        INVALID_JSON,
      ).expect(400);

      expect(response.body.error.code).toBe('INVALID_JSON');
      contract.expectResponse(response, { requestBody: INVALID_JSON, requestIsInvalid: true });
    },
  );

  test.each([
    ...operations,
    { method: 'post', path: '/api/v1/admin/dataset-releases', account: { role: 'admin' } },
    {
      method: 'put',
      path: `/api/v1/submissions/events/${correctionReceipt.data.eventId}`,
      account: {},
    },
  ] as const)('$method $path returns the documented 413 over 1 MB', async (operation) => {
    const app = contractApp({ account: operation.account as never });
    const response = await sendRaw(
      request(app)[operation.method](operation.path).set('Authorization', token),
      OVER_ONE_MEGABYTE,
    ).expect(413);

    contract.expectResponse(response, { requestBody: OVER_ONE_MEGABYTE, requestIsInvalid: true });
  });
});

describe('undocumented access and identifier errors', () => {
  test.each(['/api/v1/submitter-access-requests', '/api/v1/submitter-scope-requests'])(
    'POST %s returns the documented 403 for a disabled account',
    async (path) => {
      const body = { competitionId: '5' };
      const response = await request(contractApp({ account: { disabled: true } }))
        .post(path)
        .set('Authorization', token)
        .send(body)
        .expect(403);

      contract.expectResponse(response, { requestBody: body });
    },
  );

  test('API key rotation and revocation return the documented 422 for a non-numeric identifier', async () => {
    const app = contractApp({ account: { role: 'admin' } });

    contract.expectResponse(
      await request(app)
        .post('/api/v1/admin/api-consumers/abc/keys/rotate')
        .set('Authorization', token)
        .expect(422),
      { requestIsInvalid: true },
    );
    contract.expectResponse(
      await request(app)
        .delete('/api/v1/admin/api-consumers/7/keys/abc')
        .set('Authorization', token)
        .expect(422),
      { requestIsInvalid: true },
    );
  });

  test('API key rotation returns the documented replacement key', async () => {
    const app = contractApp({
      account: { role: 'admin' },
      apiConsumers: { rotate: async () => ({ ...apiConsumer, apiKey: CONSUMER_API_KEY }) },
    });

    const response = await request(app)
      .post('/api/v1/admin/api-consumers/7/keys/rotate')
      .set('Authorization', token)
      .expect(200);

    contract.expectResponse(response);
    expect(response.body.data.apiKey).toBe(CONSUMER_API_KEY);
  });

  test('provenance participant statistics return the documented 400 for an invalid limit', async () => {
    const response = await request(contractApp({ account: { role: 'admin' } }))
      .get('/api/v1/provenance/participants/101/statistics/stat_career?limit=0')
      .set('Authorization', token)
      .expect(400);

    contract.expectResponse(response, { requestIsInvalid: true });
  });

  test('a provenance submission detail matches the standalone detail schema', async () => {
    const app = contractApp({
      account: { role: 'admin' },
      provenance: { getSubmission: async () => provenanceSubmissionDetail as never },
    });

    contract.expectResponse(
      await request(app)
        .get('/api/v1/provenance/submissions/30')
        .set('Authorization', token)
        .expect(200),
    );
  });

  test('a dataset release detail carries a UUID release identifier', async () => {
    const app = contractApp({ datasetReleases: { getRelease: async () => datasetRelease } });

    contract.expectResponse(
      await request(app).get('/api/v1/dataset-releases/2026.09.1').expect(200),
    );
  });
});

describe('consumer filters, errors and limit headers', () => {
  const competitionPage = { data: [], pagination: { nextCursor: null } };
  // The fixture list always reports totalPages (public-read.service.ts).
  const fixturePage = { data: [], pagination: { nextCursor: null, totalPages: 0 } };

  function consumerApp(rateLimitPerMinute: number, quotaAllowed: boolean) {
    return contractApp({
      publicRead: {
        listCompetitions: async () => competitionPage,
        listFixtures: async () => fixturePage,
      },
      apiConsumerRepository: {
        findActiveConsumer: async () => ({ consumerId: '7', rateLimitPerMinute, dailyQuota: 100 }),
        consumeDailyQuota: async () => ({ allowed: quotaAllowed, used: quotaAllowed ? 1 : 100 }),
      },
    });
  }

  test('the consumer lists accept the documented filters and return quota headers', async () => {
    const app = consumerApp(60, true);

    const fixtures = await request(app)
      .get('/api/v1/consumer/fixtures')
      .query({
        competitionId: '1',
        seasonId: 'season_example',
        competitorId: '2',
        gender: 'female',
        startDateFrom: '2026-01-01',
        startDateTo: '2026-08-09',
        limit: '25',
      })
      .set('X-API-Key', CONSUMER_API_KEY)
      .expect(200);
    contract.expectResponse(fixtures);

    const competitions = await request(app)
      .get('/api/v1/consumer/competitions?name=World')
      .set('X-API-Key', CONSUMER_API_KEY)
      .expect(200);
    contract.expectResponse(competitions);
  });

  test.each(['/api/v1/consumer/competitions', '/api/v1/consumer/fixtures'])(
    'GET %s returns the documented 400 for an invalid limit',
    async (path) => {
      const response = await request(consumerApp(60, true))
        .get(`${path}?limit=0`)
        .set('X-API-Key', CONSUMER_API_KEY)
        .expect(400);

      contract.expectResponse(response, { requestIsInvalid: true });
    },
  );

  test('the per-minute limit returns 429 with RateLimit-* and Retry-After but no quota headers', async () => {
    const app = consumerApp(1, true);
    await request(app)
      .get('/api/v1/consumer/competitions')
      .set('X-API-Key', CONSUMER_API_KEY)
      .expect(200);

    const response = await request(app)
      .get('/api/v1/consumer/competitions')
      .set('X-API-Key', CONSUMER_API_KEY)
      .expect(429);

    contract.expectResponse(response);
    expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(response.headers).toMatchObject({
      'ratelimit-limit': '1',
      'ratelimit-remaining': '0',
      'ratelimit-reset': expect.any(String),
      'retry-after': expect.any(String),
    });
    expect(response.headers['x-quota-limit']).toBeUndefined();
  });

  test('the daily quota returns 429 with RateLimit-* and quota headers but no Retry-After', async () => {
    const response = await request(consumerApp(60, false))
      .get('/api/v1/consumer/fixtures')
      .set('X-API-Key', CONSUMER_API_KEY)
      .expect(429);

    contract.expectResponse(response);
    expect(response.body.error.code).toBe('QUOTA_EXCEEDED');
    expect(response.headers).toMatchObject({
      'ratelimit-limit': '60',
      'ratelimit-remaining': expect.any(String),
      'ratelimit-reset': expect.any(String),
      'x-quota-limit': '100',
      'x-quota-remaining': '0',
      'x-quota-reset': expect.any(String),
    });
    expect(response.headers['retry-after']).toBeUndefined();
  });
});

describe('submission rate limits', () => {
  async function exhaust(send: () => request.Test, successStatus: number, limit: number) {
    const first = await send();
    expect(first.status).toBe(successStatus);
    for (let attempt = 2; attempt <= limit; attempt += 1) await send();
    return { first, limited: await send().expect(429) };
  }

  test('POST /batches returns Location and RateLimit-* on 202, and 429 after six uploads', async () => {
    const app = contractApp({
      account: { role: 'submitter', approvalState: 'approved', competitionIds: ['5'] },
      batches: { receive: async () => batchReceipt as never },
    });
    const send = () =>
      request(app)
        .post('/api/v1/batches')
        .set('Authorization', token)
        .set('Idempotency-Key', 'season-2026-01')
        .set('X-Competition-Id', '5')
        .set('X-Batch-Package-Version', '1.1')
        .set('X-File-Name', 'season.ndjson')
        .set('Content-Type', 'application/x-ndjson')
        .send('{"manifest":true}\n');

    const { first, limited } = await exhaust(send, 202, 6);

    contract.expectResponse(first);
    expect(first.headers.location).toBe(batchReceipt.data.statusUrl);
    contract.expectResponse(limited);
  });

  test('PUT /submissions/events/{eventId} returns RateLimit-* on 200, and 429 after 30 corrections', async () => {
    const app = contractApp({
      account: { role: 'submitter', approvalState: 'approved', competitionIds: ['5'] },
      submissions: { correct: async () => correctionReceipt as never },
    });
    const send = () =>
      request(app)
        .put(`/api/v1/submissions/events/${correctionReceipt.data.eventId}`)
        .set('Authorization', token)
        .send(correctionPayload);

    const { first, limited } = await exhaust(send, 200, 30);

    contract.expectResponse(first, { requestBody: correctionPayload });
    contract.expectResponse(limited, { requestBody: correctionPayload });
  });

  test('POST /submissions returns RateLimit-* on 201, and 429 after 30 submissions', async () => {
    // Called as an administrator, which the implementation currently requires.
    const app = contractApp({
      account: { role: 'admin' },
      submissions: { submit: async () => submissionReceipt as never },
    });
    const send = () =>
      request(app).post('/api/v1/submissions').set('Authorization', token).send(submissionPayload);

    const { first, limited } = await exhaust(send, 201, 30);

    contract.expectResponse(first, { requestBody: submissionPayload });
    contract.expectResponse(limited, { requestBody: submissionPayload });
  });

  test('POST /submissions/uploads returns RateLimit-* on 201, and 429 after 30 uploads', async () => {
    const app = contractApp({
      account: { role: 'admin' },
      submissions: { submit: async () => submissionReceipt as never },
    });
    const send = () =>
      request(app)
        .post('/api/v1/submissions/uploads')
        .set('Authorization', token)
        .attach('file', Buffer.from(JSON.stringify(submissionPayload)), {
          filename: 'match-events.json',
          contentType: 'application/json',
        });

    const { first, limited } = await exhaust(send, 201, 30);

    contract.expectResponse(first);
    contract.expectResponse(limited);
  });
});

describe('batch errors, reports and canonical fixture decisions', () => {
  const administrator = {
    role: 'admin',
    approvalState: 'approved',
    competitionIds: ['1'],
  } as const;

  function batchApp(account: object = administrator, overrides: object = {}) {
    return contractApp({
      account: account as never,
      batches: {
        getStatus: async () => ({ data: batchStatus }) as never,
        getReport: async () => batchReport as never,
        createCanonicalFixture: async () => batchDecisionReceipt as never,
        ...overrides,
      },
    });
  }

  test('batch lists return the documented 400 for invalid queries', async () => {
    const app = batchApp();

    contract.expectResponse(
      await request(app)
        .get('/api/v1/admin/batches?limit=0')
        .set('Authorization', token)
        .expect(400),
      { requestIsInvalid: true },
    );
    contract.expectResponse(
      await request(app)
        .get('/api/v1/batches?status=unknown')
        .set('Authorization', token)
        .expect(400),
      { requestIsInvalid: true },
    );
  });

  test('batch status and reports return the documented 404 for a malformed reference', async () => {
    const app = batchApp();

    for (const path of [
      `/api/v1/batches/${MALFORMED_REFERENCE}`,
      `/api/v1/batches/${MALFORMED_REFERENCE}/report`,
      `/api/v1/batches/${MALFORMED_REFERENCE}/report/download`,
    ]) {
      contract.expectResponse(
        await request(app).get(path).set('Authorization', token).expect(404),
        {
          requestIsInvalid: true,
        },
      );
    }
  });

  test('a batch report with the first delivery of an over matches the contract, and 400 for an invalid limit', async () => {
    const app = batchApp();

    const report = await request(app)
      .get(`/api/v1/batches/${BATCH_REFERENCE}/report`)
      .set('Authorization', token)
      .expect(200);
    contract.expectResponse(report);
    expect(report.body.data.items[0].context.positionInOver).toBe(0);

    contract.expectResponse(
      await request(app)
        .get(`/api/v1/batches/${BATCH_REFERENCE}/report?limit=0`)
        .set('Authorization', token)
        .expect(400),
      { requestIsInvalid: true },
    );
  });

  test.each(['review', 'conflicts/resolve', 'reference-mappings', 'canonical-fixtures'])(
    'POST /batches/{batchReference}/%s returns the documented 400, 404 and 413',
    async (action) => {
      const app = batchApp();
      const path = `/api/v1/batches/${BATCH_REFERENCE}/${action}`;

      contract.expectResponse(
        await sendRaw(request(app).post(path).set('Authorization', token), INVALID_JSON).expect(
          400,
        ),
        { requestBody: INVALID_JSON, requestIsInvalid: true },
      );
      contract.expectResponse(
        await sendRaw(
          request(app).post(path).set('Authorization', token),
          OVER_SIXTEEN_KILOBYTES,
        ).expect(413),
        { requestBody: OVER_SIXTEEN_KILOBYTES, requestIsInvalid: true },
      );
      contract.expectResponse(
        await request(app)
          .post(`/api/v1/batches/${MALFORMED_REFERENCE}/${action}`)
          .set('Authorization', token)
          .send({})
          .expect(404),
        { requestIsInvalid: true },
      );
    },
  );

  test('POST /batches/{batchReference}/canonical-fixtures matches every documented response', async () => {
    const decision = { itemOrdinal: 0, referencePath: 'fixtures.0', decisionKey: 'create-fixture' };
    const path = `/api/v1/batches/${BATCH_REFERENCE}/canonical-fixtures`;

    contract.expectResponse(
      await request(batchApp()).post(path).set('Authorization', token).send(decision).expect(202),
      { requestBody: decision },
    );
    contract.expectResponse(await request(batchApp()).post(path).send(decision).expect(401), {
      requestBody: decision,
    });
    contract.expectResponse(
      await request(
        batchApp({ role: 'submitter', approvalState: 'approved', competitionIds: ['1'] }),
      )
        .post(path)
        .set('Authorization', token)
        .send(decision)
        .expect(403),
      { requestBody: decision },
    );
    contract.expectResponse(
      await request(
        batchApp(administrator, {
          createCanonicalFixture: async () => {
            throw new BatchConflictError('A complete version 1.1 fixture proposal is required.');
          },
        }),
      )
        .post(path)
        .set('Authorization', token)
        .send(decision)
        .expect(409),
      { requestBody: decision },
    );
    const invalid = { itemOrdinal: -1, referencePath: '', decisionKey: '' };
    contract.expectResponse(
      await request(batchApp()).post(path).set('Authorization', token).send(invalid).expect(422),
      { requestBody: invalid, requestIsInvalid: true },
    );
  });
});
