import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { generateUserTestingEvidence } from '../../scripts/generate-user-testing-evidence.mjs';
import { ingestFeedbackDirectory } from '../../scripts/user-feedback-ingestion.mjs';

function responseFixture(overrides = {}) {
  return {
    participant: 'P01',
    workflow: 'Fixture-only public workflow.',
    tasksAttempted: 'Fixture task.',
    completionStatus: 'Partial',
    observations: 'Contact fixture@example.test or +27 82 555 0101. token=fixture-secret.',
    positiveFindings: 'Fixture-only positive finding.',
    problems: 'Fixture-only usability problem.',
    severity: 'S2',
    suggestions: 'Fixture-only suggested improvement.',
    traceability: {
      giteaIssue: '#428',
      implementationCommit: 'c5a4346c',
      retestingEvidence: 'evidence/user-testing/sprint-2/retest.md',
    },
    ...overrides,
  };
}

async function withTemporaryDirectories(callback) {
  const root = await mkdtemp(join(tmpdir(), 'sport-analytics-user-feedback-'));
  const inputDirectory = join(root, 'input');
  const outputDirectory = join(root, 'output');

  await mkdir(inputDirectory);
  try {
    await callback({ inputDirectory, outputDirectory });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('ingests a Power Automate feedback object and redacts supported PII patterns', async () => {
  await withTemporaryDirectories(async ({ inputDirectory }) => {
    await writeFile(
      join(inputDirectory, 'response.json'),
      `${JSON.stringify(responseFixture(), null, 2)}\n`,
      'utf8',
    );

    const responses = await ingestFeedbackDirectory(inputDirectory);

    assert.equal(responses.length, 1);
    assert.equal(responses[0].participant, 'P01');
    assert.match(responses[0].observations, /\[redacted email\]/);
    assert.match(responses[0].observations, /\[redacted phone\]/);
    assert.match(responses[0].observations, /\[redacted credential\]/);
    assert.doesNotMatch(responses[0].observations, /fixture@example\.test|fixture-secret/);
  });
});

test('generates the required MkDocs evidence headings and traceability', async () => {
  await withTemporaryDirectories(async ({ inputDirectory, outputDirectory }) => {
    await writeFile(
      join(inputDirectory, 'response-store.json'),
      `${JSON.stringify({ schemaVersion: '1.0', responses: [responseFixture()] }, null, 2)}\n`,
      'utf8',
    );

    const generated = await generateUserTestingEvidence(inputDirectory, outputDirectory);
    const markdown = await readFile(generated[0], 'utf8');

    for (const heading of [
      '# Sprint 2 User Testing Evidence',
      '## Tested Workflow',
      '## Tasks Attempted',
      '## Completion Status',
      '## Observations',
      '## Participant Comments',
      '## Positive Findings',
      '## Usability Problems',
      '## Severity Classification',
      '## Suggested Improvements',
      '## Traceability',
    ]) {
      assert.match(markdown, new RegExp(heading));
    }

    assert.match(markdown, /Gitea issue:\*\* `#428`/);
    assert.match(markdown, /Implementation commit:\*\* `c5a4346c`/);
    assert.match(
      markdown,
      /Retesting evidence:\*\* `evidence\/user-testing\/sprint-2\/retest\.md`/,
    );
    assert.doesNotMatch(markdown, /fixture@example\.test|fixture-secret/);
  });
});

test('rejects malformed Power Automate responses before generation', async () => {
  await withTemporaryDirectories(async ({ inputDirectory }) => {
    await writeFile(join(inputDirectory, 'malformed.json'), '{', 'utf8');

    await assert.rejects(ingestFeedbackDirectory(inputDirectory), SyntaxError);
  });
});

test('rejects invalid Power Automate response fields before generation', async () => {
  await withTemporaryDirectories(async ({ inputDirectory }) => {
    await writeFile(
      join(inputDirectory, 'invalid.json'),
      `${JSON.stringify(responseFixture({ participant: 'Not anonymous' }), null, 2)}\n`,
      'utf8',
    );

    await assert.rejects(
      ingestFeedbackDirectory(inputDirectory),
      /participant: has an invalid format/,
    );
  });
});
