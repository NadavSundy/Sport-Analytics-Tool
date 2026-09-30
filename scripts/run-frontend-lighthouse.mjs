import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import { chromium } from 'playwright';
import { selectableLighthouseRoutes } from './lighthouse-routes.mjs';
import {
  applyLighthouseStorageState,
  lighthouseStorageStateEnvironment,
} from './lighthouse-auth-state.mjs';
import {
  lighthouseRepresentativePreflight,
  resolveLighthouseRepresentatives,
  resolveLighthouseRoutePath,
} from './lighthouse-representatives.mjs';
import { aggregateLighthouseResults, evaluateLighthouseGate } from './lighthouse-results.mjs';
import { isUnexpectedAuthRedirect } from './lighthouse-smoke.mjs';
import { selectLighthouseProfiles } from './lighthouse-profiles.mjs';
import { withLighthouseTimeout } from './lighthouse-run-control.mjs';

const baseUrl = process.env.LIGHTHOUSE_BASE_URL ?? 'http://127.0.0.1:4173';
const outputDirectory = process.env.LIGHTHOUSE_OUTPUT_DIR ?? 'artifacts/lighthouse';
const requestedRoutes = selectableLighthouseRoutes(process.env.LIGHTHOUSE_ROUTES);
const representatives = await resolveLighthouseRepresentatives();
const runCount = Number.parseInt(process.env.LIGHTHOUSE_RUNS ?? '1', 10);
const gateMode = process.env.LIGHTHOUSE_GATE_MODE ?? 'strict';
const runTimeoutMs = Number.parseInt(process.env.LIGHTHOUSE_RUN_TIMEOUT_MS ?? '120000', 10);
if (!Number.isInteger(runCount) || runCount < 1)
  throw new Error('LIGHTHOUSE_RUNS must be a positive integer.');
if (!Number.isInteger(runTimeoutMs) || runTimeoutMs < 1)
  throw new Error('LIGHTHOUSE_RUN_TIMEOUT_MS must be a positive integer.');

const profiles = selectLighthouseProfiles(process.env.LIGHTHOUSE_PROFILES);

await mkdir(outputDirectory, { recursive: true });

console.table([
  ...Object.entries(lighthouseStorageStateEnvironment).map(([role, variable]) => ({
    dependency: `${role} state`,
    status: process.env[variable] ? 'ready' : 'missing',
  })),
  ...lighthouseRepresentativePreflight(representatives).map(({ representative, source }) => ({
    dependency: representative,
    status: source,
  })),
]);

const results = [];
const smokeResults = [];
const chrome = await chromeLauncher.launch({
  chromeFlags: ['--headless=new', '--no-first-run', '--no-default-browser-check'],
});
console.info(`Chrome ready: pid=${chrome.pid}; port=${chrome.port}.`);
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${chrome.port}`);
console.info('Playwright CDP connected.');

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
    const requiredSessionRole =
      route.access === 'authenticated' ? (route.sessionRole ?? route.role) : null;
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
        const redirected = isUnexpectedAuthRedirect(route.path, new URL(page.url()).pathname);
        const loads =
          !redirected && fatalErrors.length === 0 && (await page.locator('main').count()) > 0;
        smokeResults.push({
          route: resolvedPath,
          role: requiredSessionRole ?? 'public',
          representative: route.kind === 'parameterised' ? 'resolved' : 'n/a',
          loads,
          redirected,
          fatalError: fatalErrors[0] ?? 'none',
        });
        if (!loads) {
          throw new Error(
            `Route smoke failed for ${resolvedPath}: redirected=${redirected}; main=${(await page.locator('main').count()) > 0}; fatal=${fatalErrors[0] ?? 'none'}.`,
          );
        }
      } finally {
        await page.close();
      }
      smokedRoutes.add(url);
    }
    for (const profile of profiles) {
      for (let runIndex = 1; runIndex <= runCount; runIndex += 1) {
        const label = `${resolvedPath} ${profile.name} run ${runIndex}`;
        console.info(`Lighthouse run started: ${label}.`);
        const report = await withLighthouseTimeout(
          lighthouse(
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
          ),
          runTimeoutMs,
          label,
        );

        if (!report?.lhr) throw new Error(`Lighthouse did not produce a report for ${url}.`);
        console.info(`Lighthouse run completed: ${label}; writing report.`);

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
          run: runIndex,
        };
        results.push(row);
        const fileName = `${resolvedPath.replaceAll('/', '_').replaceAll('?', '_').replaceAll('&', '_').replaceAll('=', '-').replace(/^_$/, 'home')}-${profile.name}-run-${runIndex}.json`;
        await writeFile(path.join(outputDirectory, fileName), JSON.stringify(lhr, null, 2));
        console.info(`Report written: ${path.join(outputDirectory, fileName)}.`);
      }
    }
  }
} finally {
  console.info('Lighthouse cleanup started.');
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
  console.info('Lighthouse cleanup completed.');
}

const summary = aggregateLighthouseResults(results).map((result) => ({
  ...result,
  ...evaluateLighthouseGate(result, { mode: gateMode }),
}));
await writeFile(
  path.join(outputDirectory, 'summary.json'),
  JSON.stringify({ gateMode, runs: runCount, summary, smokeResults }, null, 2),
);
await writeFile(
  path.join(outputDirectory, 'summary.md'),
  [
    '| Route | Profile | Individual runs | Median Performance | LCP | TBT | CLS | Gate |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | --- |',
    ...summary.map(
      (row) =>
        `| ${row.route} | ${row.profile} | ${row.individualRuns.join(', ')} | ${row.performance} | ${Math.round(row.lcpMs)}ms | ${Math.round(row.tbtMs)}ms | ${row.cls.toFixed(3)} | ${row.gate} |`,
    ),
    '',
  ].join('\n'),
);
console.table(summary);
console.table(smokeResults);
console.log(
  `Public audited: ${summary.filter((row) => !row.route.startsWith('/account') && !row.route.startsWith('/submissions') && !row.route.startsWith('/admin') && !row.route.startsWith('/reviews')).length}`,
);
console.log(
  `Protected audited: ${summary.filter((row) => row.route.startsWith('/account') || row.route.startsWith('/submissions') || row.route.startsWith('/admin') || row.route.startsWith('/reviews')).length}`,
);
console.log(`Regression failures: ${summary.filter((row) => !row.passes).length}`);
console.log(
  `Strict >=90 failures: ${summary.filter((row) => !evaluateLighthouseGate(row, { mode: 'strict' }).passes).length}`,
);
if (summary.some((result) => !result.passes)) process.exitCode = 1;
