import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  readFeedbackSourceConfig,
  retrieveUserTestingFeedback,
} from '../../scripts/retrieve-user-testing-feedback.mjs';

const sourceEnvironment = {
  USER_TESTING_FEEDBACK_ONEDRIVE_DRIVE_ID: 'drive-id',
  USER_TESTING_FEEDBACK_ONEDRIVE_FOLDER_ID: 'folder-id',
  USER_TESTING_FEEDBACK_ONEDRIVE_ACCESS_TOKEN: 'test-token',
};

test('fails safely when the OneDrive feedback source is not configured', () => {
  assert.throws(
    () => readFeedbackSourceConfig({}),
    /USER_TESTING_FEEDBACK_ONEDRIVE_DRIVE_ID.*USER_TESTING_FEEDBACK_ONEDRIVE_FOLDER_ID.*USER_TESTING_FEEDBACK_ONEDRIVE_ACCESS_TOKEN/,
  );
});

test('retrieves JSON feedback without logging source credentials', async () => {
  const destination = await mkdtemp(join(tmpdir(), 'sport-analytics-user-testing-retrieval-'));
  const requests = [];
  const fetchImplementation = async (url, options) => {
    requests.push({ url, options });
    if (url.includes('/children?')) {
      return {
        ok: true,
        json: async () => ({
          value: [{ id: 'response-id', name: 'response-001.json', file: {} }],
        }),
      };
    }
    return { ok: true, text: async () => '{"participant":"P01"}' };
  };

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
    assert.equal(requests.length, 2);
    assert.equal(requests[0].options.headers.Authorization, 'Bearer test-token');
  } finally {
    await rm(destination, { recursive: true, force: true });
  }
});
