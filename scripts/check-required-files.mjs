import { access } from 'node:fs/promises';

const requiredFiles = [
  'README.md',
  'package.json',
  'apps/frontend/package.json',
  'apps/backend/package.json',
  'apps/worker/package.json',
  'apps/frontend/README.md',
  'apps/backend/README.md',
  'apps/worker/README.md',
  'database/README.md',
  'docs/README.md',
  'tests/README.md',
  'infra/README.md',
  'scripts/README.md',
  'evidence/README.md',
  'packages/contracts/package.json',
  'packages/contracts/README.md',
  'docs/development/technology-stack.md',
  'docs/development/ci-cd.md',
  'database/README.md',
  'docs/index.md',
  'docs/git-methodology.md',
  'docs/project_methodology.md',
  'mkdocs.yml',
  '.gitea/workflows/ci.yml',
  '.gitea/workflows/deploy-worker.yml',
  'infra/azure/worker/main.bicep',
  'evidence/ai/README.md',
  'evidence/ai/ai-usage-register.csv',
  'evidence/ai/transcripts/README.md',
  'evidence/ai/transcripts/ben-swartz/README.md',
  'evidence/ai/transcripts/dean-feldman/README.md',
  'evidence/ai/transcripts/gabriel-raz/README.md',
  'evidence/ai/transcripts/liora-rosenberg/README.md',
  'evidence/ai/transcripts/nadav-sundy/README.md',
  'evidence/ai/transcripts/shayna-unterslak/README.md',
];

const missing = [];

for (const file of requiredFiles) {
  try {
    await access(file);
  } catch {
    missing.push(file);
  }
}

if (missing.length > 0) {
  console.error(
    `Missing required project files:\n${missing.map((file) => `- ${file}`).join('\n')}`,
  );
  process.exitCode = 1;
} else {
  console.log(`Repository structure check passed (${requiredFiles.length} required files).`);
}
