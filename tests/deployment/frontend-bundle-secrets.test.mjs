import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { findLeakedSecrets } from '../../scripts/check-frontend-bundle-secrets.mjs';

function withFixtureDir(files, run) {
  const dir = mkdtempSync(join(tmpdir(), 'frontend-bundle-secrets-'));
  try {
    for (const [name, contents] of Object.entries(files)) {
      writeFileSync(join(dir, name), contents, 'utf8');
    }
    return run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('a clean production bundle containing only public VITE_ values reports no leaks', () => {
  const findings = withFixtureDir(
    {
      'index-abc123.js':
        'const e="https://project-ref.supabase.co",t="pk_publishable_example";export{e,t};',
    },
    (dir) => findLeakedSecrets(dir),
  );

  assert.deepEqual(findings, []);
});

test('a bundle containing a server-only Supabase key name is flagged', () => {
  const findings = withFixtureDir(
    {
      'index-abc123.js': 'const SUPABASE_SECRET_KEY = "sb_secret_should_never_ship_to_browser";',
    },
    (dir) => findLeakedSecrets(dir),
  );

  assert.equal(findings.length, 1);
  assert.match(findings[0].pattern, /SUPABASE_SECRET_KEY/);
  assert.match(findings[0].file, /index-abc123\.js$/);
});

test('a bundle containing a raw Postgres connection string is flagged', () => {
  const findings = withFixtureDir(
    {
      'index-def456.js': 'fetch("postgres://user:password@db.example.com:5432/postgres")',
    },
    (dir) => findLeakedSecrets(dir),
  );

  assert.equal(findings.length, 1);
  assert.match(findings[0].pattern, /postgres/i);
});

test('a bundle referencing unrelated backend-only environment variable names is flagged', () => {
  const findings = withFixtureDir(
    {
      'index-ghi789.js': 'console.log(process.env.AZURE_STORAGE_ACCOUNT_NAME)',
    },
    (dir) => findLeakedSecrets(dir),
  );

  assert.equal(findings.length, 1);
  assert.match(findings[0].pattern, /AZURE_STORAGE_ACCOUNT_NAME/);
});

test('only built JavaScript/CSS/HTML output is scanned, not arbitrary files', () => {
  const findings = withFixtureDir(
    {
      'README.txt': 'SUPABASE_SECRET_KEY appears here but this is not shipped bundle output',
    },
    (dir) => findLeakedSecrets(dir),
  );

  assert.deepEqual(findings, []);
});
