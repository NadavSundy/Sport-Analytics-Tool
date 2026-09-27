import { appendFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const defaults = {
  start: '2026-09-27 16:00 SAST (UTC+2)',
  tester: 'Dean Feldman',
  environment: 'Deployed Sprint 3 environment',
  frontend: 'https://sport-analytics-tool-web.pages.dev',
  api: 'https://statsthegame-dev-api.calmground-aa50efe2.southafricanorth.azurecontainerapps.io/api/v1',
};

const steps = [
  ['A', 'New-fixture ingestion', true],
  ['B', 'Multi-season back-catalogue evidence', false],
  ['C', 'Partial/rejected batch recovery', true],
  ['D', 'Correction history and stable logical identity', true],
  ['E', 'Selective recomputation observability', false],
  ['F', 'Aggregate provenance', false],
  ['G', 'Consumer key, quota and rate limit', true],
  ['H', 'Versioned dataset release', true],
  ['I', 'Representative-scale acceptance', true],
  ['J', 'No direct database intervention', false],
];

function timestamp() {
  return new Date().toISOString();
}

async function main() {
  const recordPath = process.argv[2] ?? 'evidence/validation/issue-598/session-log.md';
  const rl = createInterface({ input, output });
  try {
    console.log('Issue #598 deployed acceptance guide');
    console.log(`Defaults: ${defaults.tester}; ${defaults.environment}; ${defaults.start}`);
    console.log('Never enter passwords, tokens, cookies, API keys, or connection strings here.');
    await appendFile(recordPath, `\n## Guided session — ${timestamp()}\n\n`, 'utf8');

    for (const [id, title, changesDeployedState] of steps) {
      console.log(`\n${id}. ${title}`);
      if (changesDeployedState) {
        const approved = await rl.question(
          'This step may change deployed data. Perform it in the browser only after confirmation. Continue? [y/N] ',
        );
        if (approved.trim().toLowerCase() !== 'y') {
          await appendFile(
            recordPath,
            `- ${id}: NOT RUN — mutation confirmation withheld.\n`,
            'utf8',
          );
          continue;
        }
      }
      const expected = await rl.question('Expected result: ');
      const actual = await rl.question('Actual result (no secrets): ');
      const evidence = await rl.question('Safe screenshot/log filename or N/A: ');
      const result = await rl.question('Result [PASS/FAIL/SKIP]: ');
      await appendFile(
        recordPath,
        `- ${id}: ${result.trim().toUpperCase() || 'PENDING'}\n  - Expected: ${expected}\n  - Actual: ${actual}\n  - Evidence: ${evidence}\n  - Recorded: ${timestamp()}\n`,
        'utf8',
      );
      if (result.trim().toUpperCase() === 'FAIL') {
        console.log(
          'Stop this scenario. Preserve safe evidence and link or draft the owning issue; do not change production code under #598.',
        );
      }
    }
  } finally {
    rl.close();
  }
}

await main();
