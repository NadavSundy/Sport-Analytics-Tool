import { access } from 'node:fs/promises';

const requiredFiles = [
  'README.md',
  'package.json',
  'apps/frontend/package.json',
  'apps/backend/package.json',
  'packages/contracts/package.json',
  'database/README.md',
  'docs/index.md',
  'docs/git-methodology.md',
  'docs/project_methodology.md',
  'mkdocs.yml',
  '.gitea/workflows/ci.yml',
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
