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
const issue873Evidence = readFileSync(
  'evidence/validation/final-system-verification/issue-873-statistics-data-releases.md',
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
  assert.match(
    nav,
    /Final System Verification(?: Bank)?:\s+testing\/final-system-verification\.md/,
  );
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

test('issue 873 records final statistics and reproducibility verification explicitly', () => {
  assert.match(issue873Evidence, /Candidate commit\/tag\s*\|\s*`d963e138d`/);
  for (const verificationId of [
    'STAT-TECH-01',
    'STAT-TECH-02',
    'STAT-TECH-03',
    'STAT-TECH-04',
    'STAT-TECH-05',
    'STAT-TECH-06',
    'STAT-TECH-07',
    'ADM-TECH-02',
    'DATA-TECH-01',
    'DATA-TECH-02',
    'DATA-TECH-03',
    'DATA-TECH-04',
  ]) {
    assert.match(issue873Evidence, new RegExp(`\\|\\s+${verificationId}\\s+\\|\\s+PASS\\s+\\|`));
  }
  assert.match(issue873Evidence, /278 tests passed; 1 file skipped; 2 tests skipped/);
  assert.match(issue873Evidence, /269 tests passed/);
  assert.match(issue873Evidence, /No new correctness failure was observed/i);
});

test('issue 871 frontend and role verification has a complete retained execution record', () => {
  const record = readFileSync(
    'evidence/validation/final-system-verification/issue-871-frontend-auth-roles.md',
    'utf8',
  );

  for (const verificationId of [
    'AUTH-TECH-01',
    'AUTH-TECH-02',
    'AUTH-TECH-03',
    'AUTH-TECH-04',
    'AUTH-TECH-05',
    'AUTH-TECH-06',
    'AUTH-TECH-07',
    'PUB-TECH-01',
    'PUB-TECH-02',
    'PUB-TECH-03',
    'PUB-TECH-04',
    'PUB-TECH-05',
    'PUB-TECH-06',
    'PUB-TECH-07',
  ]) {
    assert.match(
      record,
      new RegExp(`\\|\\s+${verificationId}\\s+\\|\\s+(?:PASS|FAIL|BLOCKED|N\\/A)\\s+\\|`),
    );
    assert.match(
      bank,
      new RegExp(
        String.raw`### ${verificationId}(?:(?!### )[\s\S])*?\*\*Status:\*\* \x60?(?:PASS|FAIL|BLOCKED|N\/A)\x60?`,
      ),
    );
  }

  assert.match(
    record,
    /no passwords, bearer tokens, OAuth credentials, API keys or service secrets/i,
  );
  assert.match(record, /test:e2e --/);
});

test('issue 875 database and worker verification has a retained execution record', () => {
  const record = readFileSync(
    'evidence/validation/final-system-verification/issue-875-database-worker.md',
    'utf8',
  );

  for (const verificationId of [
    'DB-TECH-01',
    'DB-TECH-02',
    'DB-TECH-03',
    'DB-TECH-04',
    'DB-TECH-05',
    'DB-TECH-06',
    'WRK-TECH-01',
    'WRK-TECH-02',
    'WRK-TECH-03',
    'WRK-TECH-04',
    'WRK-TECH-05',
  ]) {
    assert.match(
      record,
      new RegExp(`\\|\\s+${verificationId}\\s+\\|\\s+(?:PASS|FAIL|BLOCKED|N\\/A)\\s+\\|`),
    );
  }

  assert.match(record, /does not treat local automated evidence as deployed verification/i);
  assert.match(
    record,
    /No passwords, bearer tokens, OAuth credentials, API keys or service secrets/i,
  );
  assert.match(record, /#875 is COMPLETE \/ PASS/i);
  assert.match(record, /non-blocking observability limitation/i);

  for (const verificationId of ['DB-TECH-06', 'WRK-TECH-04', 'WRK-TECH-05']) {
    assert.match(record, new RegExp(`\\|\\s+${verificationId}\\s+\\|\\s+PASS\\s+\\|`));
  }

  for (const classification of [
    'BatchValidationRetryBudgetExhausted',
    'UnsupportedJobContract',
    'AttemptBudgetExhausted',
    'MaxDeliveryCountExceeded',
    'JobNotRunnable',
  ]) {
    assert.match(record, new RegExp(classification));
  }
});
