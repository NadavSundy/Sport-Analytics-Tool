import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { validateUserFeedbackStore } from '../../scripts/validate-user-feedback.mjs';

const repositoryRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const schema = JSON.parse(
  readFileSync(resolve(repositoryRoot, 'testing/user-feedback/schema.json'), 'utf8'),
);
const emptyStore = JSON.parse(
  readFileSync(resolve(repositoryRoot, 'testing/user-feedback/responses.json'), 'utf8'),
);

function responseFixture(overrides = {}) {
  return {
    participantId: 'P01',
    role: 'public',
    sessionDate: '2026-09-08',
    importSource: 'microsoft_forms_csv',
    tasks: [
      {
        taskId: 'PUB-01',
        outcome: 'success',
        observations: ['Fixture-only sanitised observation.'],
        findings: [],
      },
    ],
    ...overrides,
  };
}

function storeFixture(responseOverrides = {}) {
  return {
    schemaVersion: '1.0',
    responses: [responseFixture(responseOverrides)],
  };
}

test('the committed response store is valid and contains no fabricated responses', () => {
  const result = validateUserFeedbackStore(emptyStore, schema);

  assert.deepEqual(result, { valid: true, errors: [] });
  assert.deepEqual(emptyStore.responses, []);
});

test('accepts a sanitised Microsoft Forms response fixture', () => {
  const result = validateUserFeedbackStore(storeFixture(), schema);

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('rejects unapproved PII-shaped fields', () => {
  const result = validateUserFeedbackStore(
    storeFixture({
      email: 'participant@example.test',
    }),
    schema,
  );

  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /email: is not permitted/);
});

test('rejects non-anonymous participant identifiers and malformed dates', () => {
  const result = validateUserFeedbackStore(
    storeFixture({
      participantId: 'Taylor Example',
      sessionDate: '2026-02-30',
    }),
    schema,
  );

  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /participantId: has an invalid format/);
  assert.match(result.errors.join('\n'), /sessionDate: must be a real ISO-8601 calendar date/);
});

test('rejects findings that omit their formal protocol decision data', () => {
  const result = validateUserFeedbackStore(
    storeFixture({
      tasks: [
        {
          taskId: 'PUB-01',
          outcome: 'partial',
          observations: ['Fixture-only observation.'],
          findings: [
            {
              findingId: 'F01',
              summary: 'Fixture-only finding.',
              severity: 'S2',
            },
          ],
        },
      ],
    }),
    schema,
  );

  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /decision: is required/);
  assert.match(result.errors.join('\n'), /retestRequired: is required/);
});
