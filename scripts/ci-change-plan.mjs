import { appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DOC_ROOT_FILES = new Set([
  'README.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'MIGRATION_GUIDE.md',
  'CLAUDE.md',
  'FILE_TREE.txt',
]);

const FULL_ROOT_FILES = new Set([
  'package.json',
  'package-lock.json',
  'tsconfig.base.json',
  '.eslintrc.cjs',
  '.prettierrc.json',
  '.prettierignore',
  '.dependency-cruiser.cjs',
  '.syncpackrc.json',
  'knip.json',
]);

const DOC_CONFIG_FILES = new Set([
  'mkdocs.yml',
  'requirements-docs.txt',
  'redocly.yaml',
  '.redocly.lint-ignore.yaml',
]);

const EVIDENCE_LIGHTWEIGHT_EXTENSIONS = new Set([
  '.csv',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.pdf',
  '.docx',
  '.zip',
]);

function emptyPlan() {
  return {
    full: false,
    evidence: false,
    docs: false,
    frontend: false,
    backend: false,
    worker: false,
    contracts: false,
    database: false,
    e2e: false,
    e2eFull: false,
    intermediateIngestion: false,
    hygiene: false,
    deployment: false,
    openapi: false,
    coverage: false,
    deployFrontend: false,
    deployBackend: false,
    deployDocs: false,
    needsNpm: false,
  };
}

function markFull(plan) {
  plan.full = true;
  plan.docs = true;
  plan.frontend = true;
  plan.backend = true;
  plan.worker = true;
  plan.contracts = true;
  plan.database = true;
  plan.e2e = true;
  plan.e2eFull = true;
  plan.hygiene = true;
  plan.deployment = true;
  plan.openapi = true;
  plan.needsNpm = true;
}

function isDocumentationPath(file) {
  return (
    file.startsWith('docs/') ||
    DOC_ROOT_FILES.has(file) ||
    DOC_CONFIG_FILES.has(file) ||
    file.endsWith('/README.md') ||
    file.startsWith('.gitea/ISSUE_TEMPLATE/') ||
    file === '.gitea/PULL_REQUEST_TEMPLATE.md'
  );
}

function isEvidenceLightweight(file) {
  return file.startsWith('evidence/') && EVIDENCE_LIGHTWEIGHT_EXTENSIONS.has(path.extname(file));
}

function isIntermediateIngestionPath(file) {
  if (
    [
      'apps/backend/src/modules/batches/',
      'apps/backend/src/modules/object-storage/',
      'apps/backend/src/modules/provenance/',
      'apps/backend/src/modules/submissions/',
      'apps/worker/',
      'packages/batch-processing/',
      'apps/frontend/src/features/reviews/',
      'apps/frontend/src/features/submissions/',
    ].some((prefix) => file.startsWith(prefix))
  ) {
    return true;
  }

  if (
    new Set([
      'apps/backend/src/app.ts',
      'apps/backend/src/modules/statistics/recomputation-dependencies.ts',
      'packages/contracts/src/batches.ts',
      'packages/contracts/src/cricket-delivery-comparison.ts',
      'packages/contracts/src/cricket-validation.ts',
      'packages/contracts/src/provenance.ts',
      'packages/contracts/src/season-upload.ts',
      'packages/contracts/src/submissions.ts',
      'packages/contracts/src/tests/batches.test.ts',
      'packages/contracts/src/tests/provenance.test.ts',
      'packages/contracts/src/tests/season-upload.test.ts',
      'packages/contracts/src/tests/submissions.test.ts',
      'tests/e2e/batch-review-workspace.spec.ts',
      'tests/e2e/corrections.spec.ts',
      'tests/e2e/submissions.spec.ts',
    ]).has(file)
  ) {
    return true;
  }

  if (
    file.startsWith('apps/backend/tests/') &&
    /(?:^|\/)(?:batch|provenance|submission|stored-object)[^/]*\.(?:test|spec)\.ts$/.test(file)
  ) {
    return true;
  }

  return (
    file.startsWith('database/migrations/') &&
    /(?:batch|ingestion|submission|correction|provenance|publication|review|stored-object|reference-mapping|statistics-refresh|fixture-statistics-cache)/i.test(
      file,
    )
  );
}

function applyPath(plan, file) {
  if (!file) return;

  const intermediateIngestion = isIntermediateIngestionPath(file);
  if (intermediateIngestion) plan.intermediateIngestion = true;

  if (file.startsWith('evidence/')) {
    plan.evidence = true;
    if (!isEvidenceLightweight(file)) plan.needsNpm = true;
    return;
  }

  if (isDocumentationPath(file)) {
    plan.docs = true;
    plan.needsNpm = true;

    if (file.startsWith('docs/') || file === 'mkdocs.yml' || file === 'requirements-docs.txt') {
      plan.deployDocs = true;
    }

    if (
      file === 'redocly.yaml' ||
      file === '.redocly.lint-ignore.yaml' ||
      file === 'docs/api/openapi.yaml'
    ) {
      plan.openapi = true;
    }
    return;
  }

  if (FULL_ROOT_FILES.has(file)) {
    markFull(plan);
    if (file === 'package.json' || file === 'package-lock.json') {
      plan.deployFrontend = true;
      plan.deployBackend = true;
      plan.deployDocs = true;
    } else if (file === 'tsconfig.base.json') {
      plan.deployFrontend = true;
      plan.deployBackend = true;
    }
    return;
  }

  if (file === '.gitea/workflows/ci.yml') {
    markFull(plan);
    return;
  }

  if (file.startsWith('.gitea/workflows/')) {
    markFull(plan);
    return;
  }

  if (file === 'playwright.config.ts' || file.startsWith('tests/e2e/')) {
    plan.frontend = true;
    plan.e2e = true;
    if (!intermediateIngestion) plan.e2eFull = true;
    plan.needsNpm = true;
    return;
  }

  if (file.startsWith('tests/deployment/')) {
    plan.deployment = true;
    plan.needsNpm = true;
    return;
  }

  if (file.startsWith('packages/contracts/')) {
    plan.contracts = true;
    plan.deployFrontend = true;
    plan.deployBackend = true;
    plan.frontend = true;
    plan.backend = true;
    plan.e2e = true;
    if (!intermediateIngestion) plan.e2eFull = true;
    plan.hygiene = true;
    plan.openapi = true;
    plan.needsNpm = true;
    return;
  }

  if (file.startsWith('packages/batch-processing/')) {
    plan.backend = true;
    plan.worker = true;
    plan.database = true;
    plan.deployment = true;
    plan.deployBackend = true;
    plan.hygiene = true;
    plan.needsNpm = true;
    return;
  }

  if (file.startsWith('apps/frontend/')) {
    plan.frontend = true;
    plan.contracts = true;
    plan.hygiene = true;
    plan.needsNpm = true;

    const isFrontendTest = /(?:\.test\.[cm]?[jt]sx?|\/test\/)/.test(file);
    if (!isFrontendTest) {
      plan.e2e = true;
      if (!intermediateIngestion) plan.e2eFull = true;
      plan.deployFrontend = true;
    }
    return;
  }

  if (file.startsWith('apps/backend/')) {
    plan.backend = true;
    plan.contracts = true;
    plan.hygiene = true;
    plan.openapi = true;
    plan.needsNpm = true;

    // Backend source and database-suite changes exercise the persisted data path.
    // This is intentionally conservative: the optimisation avoids PostgreSQL for
    // frontend/docs/evidence changes without guessing which backend changes are DB-safe.
    if (file.startsWith('apps/backend/src/') || file.startsWith('apps/backend/tests/database/')) {
      plan.database = true;
    }

    const affectsBackendRuntime =
      file.startsWith('apps/backend/src/') ||
      file.startsWith('apps/backend/certs/') ||
      file === 'apps/backend/package.json' ||
      file === 'apps/backend/tsconfig.json';

    if (affectsBackendRuntime) {
      plan.deployBackend = true;
    }
    return;
  }

  if (file.startsWith('apps/worker/')) {
    plan.worker = true;
    plan.database = true;
    plan.deployment = true;
    plan.hygiene = true;
    plan.needsNpm = true;
    return;
  }

  if (file.startsWith('database/') || file === 'compose.test.yml') {
    plan.backend = true;
    plan.contracts = true;
    plan.database = true;
    plan.hygiene = true;
    plan.openapi = true;
    plan.needsNpm = true;
    return;
  }

  if (
    file === 'scripts/prepare-backend-deployment.mjs' ||
    file === 'scripts/smoke-check-backend-artifact.mjs' ||
    file === 'scripts/deploy-backend-azure.py'
  ) {
    plan.backend = true;
    plan.contracts = true;
    plan.deployment = true;
    plan.deployBackend = true;
    plan.hygiene = true;
    plan.needsNpm = true;
    return;
  }

  if (file === 'scripts/smoke-check-deployment.mjs') {
    plan.deployment = true;
    plan.deployFrontend = true;
    plan.deployBackend = true;
    plan.deployDocs = true;
    plan.needsNpm = true;
    return;
  }

  if (file === 'scripts/test-database-local.mjs') {
    plan.backend = true;
    plan.database = true;
    plan.hygiene = true;
    plan.needsNpm = true;
    return;
  }

  if (file === 'scripts/check-contracts-public-api.mjs') {
    plan.contracts = true;
    plan.frontend = true;
    plan.backend = true;
    plan.hygiene = true;
    plan.needsNpm = true;
    return;
  }

  if (file === 'scripts/check-required-files.mjs') {
    markFull(plan);
    return;
  }

  if (file.startsWith('scripts/')) {
    // Scripts can modify data, repository policy, imports or generated artifacts.
    // Default to full validation rather than silently under-testing an unknown script.
    markFull(plan);
    return;
  }

  if (file.startsWith('infra/ci/')) {
    // Local CI parity infrastructure can affect every validation lane.
    markFull(plan);
    return;
  }

  if (file.startsWith('infra/') || file.startsWith('database/')) {
    plan.backend = true;
    plan.database = true;
    plan.hygiene = true;
    plan.needsNpm = true;
    return;
  }

  if (file === '.gitignore' || file === '.gitattributes' || file === '.editorconfig') {
    markFull(plan);
    return;
  }

  // Unknown files deliberately select full CI. It is safer to spend runner time
  // than to accidentally weaken the required quality gate.
  markFull(plan);
}

export function classifyChangedFiles(files, { eventName = 'pull_request' } = {}) {
  const plan = emptyPlan();

  if (eventName === 'workflow_dispatch' || files.length === 0) {
    markFull(plan);
  } else {
    for (const file of files) {
      // A full-validation path must not stop deployment-impact discovery for
      // other files in the same commit. Continue classifying so a CI/config
      // change plus real application/docs changes still deploys those targets.
      applyPath(plan, file.replaceAll('\\', '/'));
    }
  }

  if (plan.intermediateIngestion) {
    // Intermediate ingestion changes use the existing merge-gated lanes as one
    // cross-layer acceptance gate. Do not duplicate these suites in a second
    // workflow: force the affected backend/worker/database/browser checks here.
    plan.contracts = true;
    plan.backend = true;
    plan.worker = true;
    plan.database = true;
    plan.e2e = true;
    plan.hygiene = true;
    plan.openapi = true;
    plan.needsNpm = true;
  }

  if (plan.frontend || plan.backend || plan.worker || plan.contracts) {
    plan.hygiene = true;
    plan.needsNpm = true;
  }

  // Coverage duplicates unit suites and currently enforces no repository-wide
  // threshold. Pull Requests remain the authoritative automated quality gate,
  // and main pushes are deployment-only after that gate. Generate coverage only
  // for an explicit full workflow dispatch until a threshold makes it merge-affecting.
  plan.coverage = eventName === 'workflow_dispatch';

  return plan;
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function resolveChangedFiles() {
  const eventName = process.env.CI_EVENT_NAME ?? process.env.GITHUB_EVENT_NAME ?? 'pull_request';
  if (eventName === 'workflow_dispatch') return [];

  const head = process.env.CI_HEAD_SHA || 'HEAD';
  const pullRequestBase = process.env.CI_PR_BASE_SHA;
  const pushBase = process.env.CI_PUSH_BEFORE_SHA;
  let base = eventName === 'pull_request' ? pullRequestBase : pushBase;

  if (!base || /^0+$/.test(base)) {
    try {
      base = git(['rev-parse', `${head}^`]);
    } catch {
      return [];
    }
  }

  try {
    const output = git(['diff', '--name-only', '--diff-filter=ACMRTUXB', `${base}...${head}`]);
    return output ? output.split(/\r?\n/).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeOutputs(plan) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (!outputFile) return;

  for (const [key, value] of Object.entries(plan)) {
    appendFileSync(outputFile, `${key}=${String(value)}\n`);
  }
}

function run() {
  const eventName = process.env.CI_EVENT_NAME ?? process.env.GITHUB_EVENT_NAME ?? 'pull_request';
  const files = resolveChangedFiles();
  const plan = classifyChangedFiles(files, { eventName });

  console.log(`CI event: ${eventName}`);
  if (files.length > 0) {
    console.log('Changed files:');
    for (const file of files) console.log(`  - ${file}`);
  } else {
    console.log('Changed-file comparison unavailable or manual full run requested.');
  }

  console.log('Validation plan:');
  for (const [key, value] of Object.entries(plan)) console.log(`  ${key}: ${value}`);

  writeOutputs(plan);
}

const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedDirectly) run();
