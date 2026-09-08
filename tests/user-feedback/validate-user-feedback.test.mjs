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
    participant: 'P01',
    workflow: 'Fixture-only public data discovery.',
    tasksAttempted: 'Find a fixture and inspect available statistics.',
    completionStatus: 'Partial',
    observations: 'Fixture-only observation.',
    positiveFindings: 'Fixture-only positive finding.',
    problems: 'Fixture-only usability problem.',
    severity: 'S2',
    suggestions: 'Fixture-only suggested improvement.',
    ...overrides,
  };
}

test('the committed response store is valid and contains no fabricated responses', () => {
  const result = validateUserFeedbackStore(emptyStore, schema);

  assert.deepEqual(result, { valid: true, errors: [] });
  assert.deepEqual(emptyStore.responses, []);
});

test('accepts the required Power Automate feedback shape', () => {
  const result = validateUserFeedbackStore(
    { schemaVersion: '1.0', responses: [responseFixture()] },
    schema,
  );

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('rejects malformed responses and PII-shaped fields', () => {
  const result = validateUserFeedbackStore(
    {
      schemaVersion: '1.0',
      responses: [
        responseFixture({
          participant: 'Taylor Example',
          email: 'fixture@example.test',
          severity: 'high',
        }),
      ],
    },
    schema,
  );

  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /participant: has an invalid format/);
  assert.match(result.errors.join('\n'), /email: is not permitted/);
  assert.match(result.errors.join('\n'), /severity: must be one of: S1, S2, S3, S4/);
});

test('requires every Power Automate feedback field', () => {
  const response = responseFixture();
  delete response.suggestions;

  const result = validateUserFeedbackStore({ schemaVersion: '1.0', responses: [response] }, schema);

  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /suggestions: is required/);
});
