import { spawn } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmExecPath = process.env.npm_execpath;
const invariantsOnly = process.argv.includes('--invariants-only');

if (!npmExecPath) {
  throw new Error('Run this verifier through npm: npm run verify:intermediate-ingestion.');
}

const requiredEvidence = [
  'docs/api/batches.md',
  'docs/api/provenance.md',
  'docs/api/season-upload-contract.md',
  'docs/architecture/batch-ingestion-pipeline.md',
  'docs/database/batch-persistence.md',
  'docs/deployment/azure-worker.md',
  'docs/development/performance-baseline.md',
  'docs/design/information-architecture-and-wireframes.md',
  'docs/security/privacy-retention.md',
  'evidence/validation/issue-289-representative-scale-baseline.md',
  'evidence/validation/issue-290-local-measurement.md',
  'evidence/validation/issue-293-cache-performance.md',
  'evidence/validation/issue-363-provenance.md',
];

const automatedCommands = [
  ['Contracts: season upload, batch and provenance contracts', ['run', 'test:contracts']],
  ['Backend: batch, correction, provenance and API behavior', ['run', 'test:unit']],
  ['Backend API: authenticated batch/provenance/submission routes', ['run', 'test:api']],
  ['Worker: parser, retry, drain, outbox and batch dispatch behavior', ['run', 'test:worker']],
  ['Frontend: guided submission and reviewer usability', ['run', 'test:frontend']],
  [
    'Database: staging, idempotency, review, publication, correction and scale invariants',
    ['run', 'test:database'],
  ],
  [
    'Browser: submission, batch review and correction journeys',
    [
      'run',
      'test:e2e',
      '--',
      'tests/e2e/submissions.spec.ts',
      'tests/e2e/batch-review-workspace.spec.ts',
      'tests/e2e/corrections.spec.ts',
    ],
  ],
  ['OpenAPI contract', ['run', 'openapi:lint']],
];

async function runNpm(label, args) {
  console.log(`\n=== ${label} ===\n`);
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [npmExecPath, ...args], {
      cwd: repoRoot,
      env: process.env,
      stdio: 'inherit',
    });

    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${label} failed with ${code === null ? `signal ${signal ?? 'unknown'}` : `code ${code}`}.`,
        ),
      );
    });
  });
}

async function assertEvidenceExists() {
  console.log('\n=== Required Intermediate evidence references ===\n');
  for (const relativePath of requiredEvidence) {
    await access(path.join(repoRoot, relativePath));
    console.log(`✓ ${relativePath}`);
  }
}

async function assertNoUnsafeWorkerLogFields() {
  console.log('\n=== Worker log-safety verification ===\n');
  const workerFiles = [
    'apps/worker/src/batch-validation-job.ts',
    'apps/worker/src/delivery-pump.ts',
    'apps/worker/src/outbox-relay.ts',
    'apps/worker/src/probe-job.ts',
  ];
  const unsafeFieldPattern =
    /\b(payload|body|authorization|password|secret|token|storageKey|sourceUri)\s*:/i;

  for (const relativePath of workerFiles) {
    const text = await readFile(path.join(repoRoot, relativePath), 'utf8');
    const logCallBlocks = text.match(/logger\.(?:debug|info|warn|error)\([\s\S]{0,700}?\);/g) ?? [];
    for (const block of logCallBlocks) {
      if (unsafeFieldPattern.test(block)) {
        throw new Error(
          `Unsafe worker log field detected in ${relativePath}: ${block.slice(0, 180)}`,
        );
      }
    }
    console.log(`✓ ${relativePath}`);
  }
}

async function main() {
  console.log('Intermediate ingestion integrated verification');
  console.log('This is a verification harness only; it does not mutate product data.');

  await assertEvidenceExists();
  await assertNoUnsafeWorkerLogFields();

  if (invariantsOnly) {
    console.log('\n==============================================');
    console.log('INTERMEDIATE INGESTION INVARIANTS: PASS');
    console.log('==============================================');
    return;
  }

  for (const [label, args] of automatedCommands) {
    await runNpm(label, args);
  }

  console.log('\n==============================================');
  console.log('INTERMEDIATE INGESTION AUTOMATED VERIFICATION: PASS');
  console.log('==============================================');
  console.log('\nExternal close-out gates still require recorded evidence, not automation:');
  console.log('- formal representative-user evidence from #417 and #418;');
  console.log(
    '- a recorded representative season-scale ingestion throughput result against the approved target;',
  );
  console.log('- the final Issue #364 validation record updated with observed command results.');
}

main().catch((error) => {
  console.error('\n==============================================');
  console.error('INTERMEDIATE INGESTION AUTOMATED VERIFICATION: FAIL');
  console.error('==============================================');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
