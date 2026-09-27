// Scans a built Vite output directory (default: apps/frontend/dist) for
// server-only configuration values that must never reach the browser bundle.
//
// Vite only ever inlines `import.meta.env.VITE_*` values, so this cannot
// happen through the normal build path. This check exists as a defence in
// depth against a future contributor deliberately or accidentally logging,
// hardcoding, or otherwise concatenating a backend secret into frontend
// source, which *would* survive the build unnoticed.
//
// Usage: node scripts/check-frontend-bundle-secrets.mjs [dist-dir]
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const SCANNED_EXTENSIONS = new Set(['.js', '.mjs', '.css', '.html', '.map']);

// Server-only backend configuration names (see apps/backend/src/config/env.ts
// and docs/deployment/azure-backend.md) that must never appear in a public
// frontend bundle, plus generic shapes of secrets that should never be
// embedded regardless of variable name.
const DISALLOWED_PATTERNS = [
  /SUPABASE_SECRET_KEY/,
  /SUPABASE_SERVICE_ROLE/i,
  /DATABASE_URL/,
  /AZURE_STORAGE_ACCOUNT_NAME/,
  /AZURE_STORAGE_CONTAINER_NAME/,
  /AZURE_STORAGE_INGESTION_CONTAINER_NAME/,
  /AZURE_STORAGE_RELEASE_CONTAINER_NAME/,
  /AZURE_FRONTEND_PUBLISH_PROFILE/,
  /AZURE_BACKEND_PUBLISH_PROFILE/,
  /CLOUDFLARE_API_TOKEN/,
  /CORS_ORIGINS/,
  /postgres(?:ql)?:\/\/[^\s"'`]*:[^\s"'`]*@/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

function listFilesRecursively(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...listFilesRecursively(fullPath));
    } else if (SCANNED_EXTENSIONS.has(extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Scans every built JS/CSS/HTML/map file under `dir` and returns a list of
 * `{ file, pattern }` findings for each disallowed pattern that appears.
 */
export function findLeakedSecrets(dir) {
  const stats = statSync(dir, { throwIfNoEntry: false });

  if (!stats) {
    throw new Error(`Frontend build output directory does not exist: ${dir}`);
  }

  if (!stats.isDirectory()) {
    throw new Error(`Expected a directory, received a file: ${dir}`);
  }

  const findings = [];

  for (const file of listFilesRecursively(dir)) {
    const contents = readFileSync(file, 'utf8');

    for (const pattern of DISALLOWED_PATTERNS) {
      if (pattern.test(contents)) {
        findings.push({ file, pattern: pattern.toString() });
      }
    }
  }

  return findings;
}

async function main() {
  const targetDir = process.argv[2] ?? 'apps/frontend/dist';

  let findings;
  try {
    findings = findLeakedSecrets(targetDir);
  } catch (error) {
    console.error(`::error::${error.message}`);
    process.exitCode = 1;
    return;
  }

  if (findings.length === 0) {
    console.log(`No server-only secrets found in ${targetDir}.`);
    return;
  }

  for (const finding of findings) {
    console.error(`::error::Possible secret leak matching ${finding.pattern} in ${finding.file}`);
  }

  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
