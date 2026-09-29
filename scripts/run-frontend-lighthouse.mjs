import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import { chromium } from 'playwright';
import { selectableLighthouseRoutes } from './lighthouse-routes.mjs';
import { applyLighthouseStorageState, lighthouseStorageStateEnvironment } from './lighthouse-auth-state.mjs';
import { lighthouseRepresentativePreflight, resolveLighthouseRepresentatives, resolveLighthouseRoutePath } from './lighthouse-representatives.mjs';

const baseUrl = process.env.LIGHTHOUSE_BASE_URL ?? 'http://127.0.0.1:4173';
const outputDirectory = process.env.LIGHTHOUSE_OUTPUT_DIR ?? 'artifacts/lighthouse';
const requestedRoutes = selectableLighthouseRoutes(process.env.LIGHTHOUSE_ROUTES);
const representatives = await resolveLighthouseRepresentatives();

const profiles = [
  {
    name: 'desktop',
    settings: { formFactor: 'desktop', screenEmulation: { disabled: true } },
  },
  {
    name: 'mobile',
    settings: { formFactor: 'mobile', screenEmulation: { mobile: true } },
  },
];

await mkdir(outputDirectory, { recursive: true });

console.table([
  ...Object.entries(lighthouseStorageStateEnvironment).map(([role, variable]) => ({ dependency: `${role} state`, status: process.env[variable] ? 'ready' : 'missing' })),
  ...lighthouseRepresentativePreflight(representatives).map(({ representative, source }) => ({ dependency: representative, status: source })),
]);

const results = [];
const smokeResults = [];
const chrome = await chromeLauncher.launch({
  chromeFlags: ['--headless=new', '--no-first-run', '--no-default-browser-check'],
});
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${chrome.port}`);

try {
  const context = browser.contexts()[0];
  let activeSessionRole = null;
  const smokedRoutes = new Set();
  for (const route of requestedRoutes) {
    const resolvedPath = resolveLighthouseRoutePath(route, representatives);
    if (!resolvedPath) {
      console.warn(`SKIP ${route.path}: requires ${route.setup}.`);
      continue;
    }
    const requiredSessionRole = route.access === 'authenticated' ? route.sessionRole ?? route.role : null;
    if (requiredSessionRole && requiredSessionRole !== activeSessionRole) {
      await applyLighthouseStorageState({ context, baseUrl, role: requiredSessionRole });
      activeSessionRole = requiredSessionRole;
    }
    const url = new URL(resolvedPath, baseUrl).toString();
    if (!smokedRoutes.has(url)) {
      const page = await context.newPage();
      const fatalErrors = [];
      page.on('pageerror', (error) => fatalErrors.push(error.message));
      try {
        await page.goto(url, { waitUntil: 'networkidle' });
        const redirected = new URL(page.url()).pathname === '/sign-in';
        const loads = !redirected && fatalErrors.length === 0 && (await page.locator('main').count()) > 0;
        smokeResults.push({ route: resolvedPath, role: requiredSessionRole ?? 'public', representative: route.kind === 'parameterised' ? 'resolved' : 'n/a', loads, redirected, fatalError: fatalErrors[0] ?? 'none' });
        if (!loads) throw new Error(`Route smoke failed for ${resolvedPath}.`);
      } finally {
        await page.close();
      }
      smokedRoutes.add(url);
    }
    for (const profile of profiles) {
      const report = await lighthouse(
        url,
        {
          port: chrome.port,
          output: 'json',
          onlyCategories: ['performance'],
          logLevel: 'error',
        },
        {
          extends: 'lighthouse:default',
          settings: profile.settings,
        },
      );

      if (!report?.lhr) throw new Error(`Lighthouse did not produce a report for ${url}.`);

      const lhr = report.lhr;
      const row = {
        route: resolvedPath,
        profile: profile.name,
        performance: Math.round((lhr.categories.performance?.score ?? 0) * 100),
        fcpMs: lhr.audits['first-contentful-paint']?.numericValue ?? null,
        lcpMs: lhr.audits['largest-contentful-paint']?.numericValue ?? null,
        cls: lhr.audits['cumulative-layout-shift']?.numericValue ?? null,
        tbtMs: lhr.audits['total-blocking-time']?.numericValue ?? null,
        speedIndexMs: lhr.audits['speed-index']?.numericValue ?? null,
      };
      results.push(row);
      const fileName = `${resolvedPath.replaceAll('/', '_').replaceAll('?', '_').replaceAll('&', '_').replaceAll('=', '-').replace(/^_$/, 'home')}-${profile.name}.json`;
      await writeFile(path.join(outputDirectory, fileName), JSON.stringify(lhr, null, 2));
    }
  }
} finally {
  await browser.close();
  try {
    await chrome.kill();
  } catch (error) {
    // Chrome can retain a handle to its temporary profile briefly on Windows.
    // The browser has already been terminated; do not let cleanup conceal the
    // route's Lighthouse outcome.
    if (!(error instanceof Error && 'code' in error && error.code === 'EPERM')) {
      throw error;
    }
  }
}

console.table(results);
console.table(smokeResults);
if (results.some((result) => result.performance < 90)) process.exitCode = 1;
