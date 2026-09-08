import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { retrieveUserTestingFeedback } from '../../scripts/retrieve-user-testing-feedback.mjs';

const validResponse = JSON.stringify({
  participant: 'P01',
  workflow: 'Public browsing',
  tasksAttempted: 'Open the fixtures page',
  completionStatus: 'Completed',
  observations: 'Navigation completed.',
  positiveFindings: 'Clear labels.',
  problems: 'None recorded.',
  severity: 'S4',
  suggestions: 'Keep the labels.',
});

async function withDestination(callback) {
  const destinationDirectory = await mkdtemp(
    join(tmpdir(), 'sport-analytics-user-testing-retrieval-'),
  );

  try {
    await callback(destinationDirectory);
  } finally {
    await rm(destinationDirectory, { recursive: true, force: true });
  }
}

test('retrieves and validates JSON feedback with rclone', async () => {
  await withDestination(async (destinationDirectory) => {
    const calls = [];
    const count = await retrieveUserTestingFeedback({
      destinationDirectory,
      environment: { RCLONE_REMOTE: 'test-remote', RCLONE_SOURCE: 'responses' },
      execute: async (_command, argumentsList) => {
        calls.push(argumentsList);
        if (argumentsList[0] === 'lsjson') return { stdout: '[{"Name":"response-001.json"}]' };
        await writeFile(join(destinationDirectory, 'response-001.json'), validResponse, 'utf8');
        return { stdout: '' };
      },
    });

    assert.equal(count, 1);
    assert.equal(calls[0]?.[1], 'test-remote:responses');
    assert.equal(calls[1]?.[0], 'copy');
    assert.match(
      await readFile(join(destinationDirectory, 'response-001.json'), 'utf8'),
      /"participant":"P01"/,
    );
  });
});

test('reports when rclone is unavailable', async () => {
  await assert.rejects(
    retrieveUserTestingFeedback({
      execute: async () => {
        const error = new Error('not found');
        error.code = 'ENOENT';
        throw error;
      },
    }),
    /rclone is not installed/,
  );
});

test('reports a failed remote copy', async () => {
  await withDestination(async (destinationDirectory) => {
    await assert.rejects(
      retrieveUserTestingFeedback({
        destinationDirectory,
        execute: async (_command, argumentsList) => {
          if (argumentsList[0] === 'lsjson') return { stdout: '[{"Name":"response-001.json"}]' };
          throw new Error('remote unavailable');
        },
      }),
      /failed while copying/,
    );
  });
});

test('rejects an empty remote response directory', async () => {
  await assert.rejects(
    retrieveUserTestingFeedback({ execute: async () => ({ stdout: '[]' }) }),
    /No JSON user-testing feedback files/,
  );
});

test('preserves schema validation after retrieval', async () => {
  await withDestination(async (destinationDirectory) => {
    await assert.rejects(
      retrieveUserTestingFeedback({
        destinationDirectory,
        execute: async (_command, argumentsList) => {
          if (argumentsList[0] === 'lsjson') return { stdout: '[{"Name":"invalid.json"}]' };
          await writeFile(join(destinationDirectory, 'invalid.json'), '{', 'utf8');
          return { stdout: '' };
        },
      }),
      /SyntaxError|JSON/,
    );
  });
});
