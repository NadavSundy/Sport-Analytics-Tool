import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const bank = readFileSync('docs/testing/final-system-verification.md', 'utf8');
const nav = readFileSync('mkdocs.yml', 'utf8');
const evidenceIndex = readFileSync('docs/process/validation-and-user-testing.md', 'utf8');
const template = readFileSync(
  'evidence/validation/final-system-verification/execution-record-template.md',
  'utf8',
);

test('final verification bank is explicit non-user technical verification', () => {
  assert.match(bank, /authoritative \*\*final non-user technical verification bank\*\*/i);
  assert.match(bank, /separate from formal user testing/i);
  assert.match(bank, /NOT RUN/);
  assert.match(bank, /PASS/);
  assert.match(bank, /FAIL/);
  assert.match(bank, /BLOCKED/);
  assert.match(bank, /N\/A/);
});

test('final verification bank covers every execution issue', () => {
  for (let issue = 871; issue <= 877; issue += 1) {
    assert.match(bank, new RegExp(`#${issue}\\b`));
  }
});

test('final verification bank maps every existing user-task family without replacing user testing', () => {
  for (const family of ['AUTH', 'PUB', 'SUB', 'BAT', 'COR', 'REV', 'ADM', 'DATA', 'API']) {
    assert.match(bank, new RegExp(`\\\`${family}-\\*\\\``));
  }

  assert.match(bank, /do \*\*not\*\* create participant evidence/i);
});

test('final verification bank covers technical-only system areas', () => {
  for (const family of [
    'STAT-TECH-',
    'DB-TECH-',
    'WRK-TECH-',
    'PERF-TECH-',
    'A11Y-TECH-',
    'RESP-TECH-',
    'AUTO-TECH-',
    'COV-TECH-',
    'CI-TECH-',
    'DEP-TECH-',
  ]) {
    assert.ok(bank.includes(family), `missing ${family} cases`);
  }
});

test('bank uses actual repository verification commands', () => {
  for (const command of [
    'npm run test:frontend',
    'npm run test:api',
    'npm run test:api-contract',
    'npm run test:worker',
    'npm run test:database',
    'npm run test:contracts',
    'npm run test:e2e',
    'npm run test:deployment',
    'npm run test:coverage',
    'npm run check',
    'npm run hygiene',
    'npm run ci:local',
    'npm run verify:intermediate-ingestion',
    'npm run verify:production-scale-deployment',
    'npm run openapi:lint',
    'python -m mkdocs build --strict',
  ]) {
    assert.ok(bank.includes(command), `missing verification command: ${command}`);
  }
});

test('MkDocs and validation index expose final system verification', () => {
  assert.match(nav, /Final System Verification:\s+testing\/final-system-verification\.md/);
  assert.match(
    evidenceIndex,
    /\[Final system verification bank\]\(\.\.\/testing\/final-system-verification\.md\)/i,
  );
});

test('execution evidence template keeps secrets out and preserves failures/retests', () => {
  assert.match(template, /Do not record passwords/i);
  assert.match(template, /Linked bug \/ blocker/);
  assert.match(template, /Retest/);
  assert.match(template, /preserve the original failure/i);
});
