import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { retrieveUserTestingFeedback } from '../../scripts/retrieve-user-testing-feedback.mjs';

async function withTemporaryDirectories(callback) {
  const root = await mkdtemp(join(tmpdir(), 'sport-analytics-user-testing-retrieval-'));
  const sourceDirectory = join(root, 'source');
  const destinationDirectory = join(root, 'input');
  await mkdir(sourceDirectory);

  try {
    await callback({ sourceDirectory, destinationDirectory });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('recursively copies and normalises valid JSON feedback files', async () => {
  await withTemporaryDirectories(async ({ sourceDirectory, destinationDirectory }) => {
    const nestedDirectory = join(sourceDirectory, 'nested');
    await mkdir(nestedDirectory);
    await writeFile(join(sourceDirectory, 'response-001.json'), '{"participant":"P01"}', 'utf8');
    await writeFile(join(nestedDirectory, 'response-002.json'), '{"participant":"P02"}', 'utf8');
    await writeFile(join(nestedDirectory, 'notes.txt'), 'not feedback', 'utf8');

    const count = await retrieveUserTestingFeedback(sourceDirectory, destinationDirectory);

    assert.equal(count, 2);
    assert.equal(
      await readFile(join(destinationDirectory, 'response-001.json'), 'utf8'),
      '{\n  "participant": "P01"\n}\n',
    );
    assert.equal(
      await readFile(join(destinationDirectory, 'response-002.json'), 'utf8'),
      '{\n  "participant": "P02"\n}\n',
    );
  });
});

test('rejects a missing local feedback directory', async () => {
  await assert.rejects(
    retrieveUserTestingFeedback(join(tmpdir(), 'sport-analytics-missing-feedback-directory')),
    /source directory does not exist/,
  );
});

test('rejects invalid JSON feedback files', async () => {
  await withTemporaryDirectories(async ({ sourceDirectory, destinationDirectory }) => {
    await writeFile(join(sourceDirectory, 'invalid.json'), '{', 'utf8');

    await assert.rejects(
      retrieveUserTestingFeedback(sourceDirectory, destinationDirectory),
      /contains invalid JSON/,
    );
  });
});

test('accepts an empty local feedback directory', async () => {
  await withTemporaryDirectories(async ({ sourceDirectory, destinationDirectory }) => {
    const count = await retrieveUserTestingFeedback(sourceDirectory, destinationDirectory);

    assert.equal(count, 0);
  });
});
