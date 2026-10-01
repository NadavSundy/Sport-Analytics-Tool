import { readFile } from 'node:fs/promises';

export const lighthouseStorageStateEnvironment = {
  viewer: 'LIGHTHOUSE_VIEWER_STORAGE_STATE',
  submitter: 'LIGHTHOUSE_SUBMITTER_STORAGE_STATE',
  admin: 'LIGHTHOUSE_ADMIN_STORAGE_STATE',
};

export async function applyLighthouseStorageState({ context, baseUrl, role }) {
  const environmentVariable = lighthouseStorageStateEnvironment[role];
  if (!environmentVariable)
    throw new Error(`No Lighthouse storage-state convention exists for role "${role}".`);
  const statePath = process.env[environmentVariable];
  if (!statePath) {
    throw new Error(
      `Protected Lighthouse route requires a legitimate ${role} session. Set ${environmentVariable} to a Playwright storage-state JSON file created through the normal Google OAuth flow.`,
    );
  }
  const state = JSON.parse(await readFile(statePath, 'utf8'));
  if (!Array.isArray(state.cookies) || !Array.isArray(state.origins)) {
    throw new Error(`${environmentVariable} does not contain a valid Playwright storage state.`);
  }
  await context.clearCookies();
  if (state.cookies.length > 0) await context.addCookies(state.cookies);
  const page = await context.newPage();
  try {
    await page.goto(new URL('/', baseUrl).toString(), { waitUntil: 'domcontentloaded' });
    const originState = state.origins.find((origin) => origin.origin === new URL(baseUrl).origin);
    await page.evaluate((localStorageState) => {
      window.localStorage.clear();
      for (const { name, value } of localStorageState ?? [])
        window.localStorage.setItem(name, value);
    }, originState?.localStorage);
    await page.reload({ waitUntil: 'domcontentloaded' });
  } finally {
    await page.close();
  }
}
