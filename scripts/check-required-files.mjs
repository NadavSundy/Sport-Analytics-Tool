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
  'evidence/ai/ai-usage-register.csv',
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
  console.error(`Missing required project files:\n${missing.map((file) => `- ${file}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`Repository structure check passed (${requiredFiles.length} required files).`);
}
