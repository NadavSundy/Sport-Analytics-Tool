import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import { lighthouseStorageStateEnvironment } from './lighthouse-auth-state.mjs';

const role =
  process.argv
    .slice(2)
    .find((argument) => argument.startsWith('--role='))
    ?.slice(7) ?? process.argv[process.argv.indexOf('--role') + 1];
if (!role || !lighthouseStorageStateEnvironment[role]) {
  throw new Error('Usage: npm run lighthouse:auth -- --role viewer|submitter|admin');
}

const baseUrl = process.env.LIGHTHOUSE_BASE_URL ?? 'http://127.0.0.1:4173';
const outputPath = path.resolve(
  process.env.LIGHTHOUSE_AUTH_OUTPUT_DIR ?? 'artifacts/lighthouse/auth',
  `${role}-storage-state.json`,
);
const protectedPath = {
  viewer: '/account/overview',
  submitter: '/submissions/batches',
  admin: '/admin',
}[role];
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();
let confirmedRole = null;

page.on('response', async (response) => {
  if (!response.url().endsWith('/auth/me') || !response.ok()) return;
  try {
    const body = await response.json();
    if (typeof body?.user?.role === 'string') confirmedRole = body.user.role;
  } catch {
    // A failed parse must not be treated as authentication confirmation.
  }
});

console.log(
  `Complete normal Google OAuth in the opened browser as a ${role}. This helper never reads or prints tokens.`,
);
await page.goto(new URL('/sign-in', baseUrl).toString(), { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(250);
await page.waitForFunction(() => location.pathname !== '/sign-in', undefined, { timeout: 600_000 });
await page.goto(new URL(protectedPath, baseUrl).toString(), { waitUntil: 'networkidle' });
await page.waitForFunction(() => true, undefined, { timeout: 500 });
const roleDeadline = Date.now() + 30_000;
while (!confirmedRole && Date.now() < roleDeadline) await page.waitForTimeout(250);
if (confirmedRole !== role) {
  await browser.close();
  throw new Error(
    `The authenticated profile did not confirm the requested ${role} role (received ${confirmedRole ?? 'no role'}). No storage state was saved.`,
  );
}
if (page.url().includes('/sign-in')) {
  await browser.close();
  throw new Error(`The ${role} state was redirected to sign-in. No storage state was saved.`);
}
await mkdir(path.dirname(outputPath), { recursive: true });
await context.storageState({ path: outputPath });
await browser.close();
console.log(`Saved ${role} storage state to ${outputPath}.`);
console.log(
  `PowerShell: $env:${lighthouseStorageStateEnvironment[role]} = (Resolve-Path '${outputPath}')`,
);
