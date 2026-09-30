import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import * as chromeLauncher from 'chrome-launcher';
import { chromium } from 'playwright';
import sourceMap from 'source-map';

const baseUrl = process.env.PROFILE_BASE_URL ?? 'http://127.0.0.1:4173';
const outputDirectory = process.env.PROFILE_OUTPUT_DIR ?? 'artifacts/cpu-profile';
const durationMs = Number(process.env.PROFILE_DURATION_MS ?? 5_000);
const { SourceMapConsumer } = sourceMap;

await mkdir(outputDirectory, { recursive: true });

const chrome = await chromeLauncher.launch({
  chromeFlags: ['--headless=new', '--no-first-run', '--no-default-browser-check'],
});
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${chrome.port}`);
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const timeline = {
      navigationStart: performance.timeOrigin,
      heroInsertedAt: null,
      firstContentfulPaintAt: null,
      largestContentfulPaintAt: null,
      fontsReadyAt: null,
    };
    window.__issue797Timeline = timeline;
    void document.fonts?.ready.then(() => {
      timeline.fontsReadyAt = performance.now();
    });

    new PerformanceObserver((entries) => {
      for (const entry of entries.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          timeline.firstContentfulPaintAt = entry.startTime;
        }
      }
    }).observe({ type: 'paint', buffered: true });

    new PerformanceObserver((entries) => {
      const entry = entries.getEntries().at(-1);
      if (entry) {
        timeline.largestContentfulPaintAt = entry.startTime;
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    new MutationObserver(() => {
      if (timeline.heroInsertedAt === null && document.getElementById('home-title')) {
        timeline.heroInsertedAt = performance.now();
      }
    }).observe(document, { childList: true, subtree: true });
  });
  const session = await context.newCDPSession(page);
  await session.send('Profiler.enable');
  await session.send('Profiler.start');
  await page.goto(new URL('/', baseUrl).toString(), { waitUntil: 'load' });
  await page.waitForTimeout(durationMs);
  const { profile } = await session.send('Profiler.stop');
  const timeline = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0]?.toJSON();
    const resources = performance
      .getEntriesByType('resource')
      .map((entry) => entry.toJSON())
      .filter(
        (entry) =>
          entry.initiatorType === 'link' ||
          entry.initiatorType === 'script' ||
          entry.initiatorType === 'css' ||
          entry.name.includes('.woff2'),
      )
      .map(({ name, initiatorType, startTime, responseEnd, duration, transferSize }) => ({
        name,
        initiatorType,
        startTime,
        responseEnd,
        duration,
        transferSize,
      }));
    const heading = document.getElementById('home-title');
    return {
      ...window.__issue797Timeline,
      navigation,
      resources,
      headingVisible: heading
        ? getComputedStyle(heading).visibility !== 'hidden' &&
          getComputedStyle(heading).opacity !== '0'
        : false,
    };
  });

  const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
  const totals = new Map();
  for (let index = 1; index < profile.samples.length; index += 1) {
    const node = nodes.get(profile.samples[index]);
    if (!node) continue;
    const frame = node.callFrame;
    const key = `${frame.functionName || '(anonymous)'}\t${frame.url}\t${frame.lineNumber + 1}\t${frame.columnNumber}`;
    totals.set(key, (totals.get(key) ?? 0) + profile.timeDeltas[index]);
  }

  const summary = [...totals.entries()]
    .map(([key, microseconds]) => {
      const [functionName, url, line, column] = key.split('\t');
      return {
        functionName,
        url,
        line: Number(line),
        column: Number(column),
        milliseconds: microseconds / 1_000,
      };
    })
    .sort((left, right) => right.milliseconds - left.milliseconds)
    .slice(0, 50);

  for (const item of summary) {
    if (!item.url.startsWith(baseUrl)) continue;
    const mapPath = path.join(
      'apps/frontend/dist',
      new URL(item.url).pathname.replace(/^\//, '') + '.map',
    );
    try {
      const consumer = await new SourceMapConsumer(JSON.parse(await readFile(mapPath, 'utf8')));
      const original = consumer.originalPositionFor({ line: item.line, column: item.column });
      consumer.destroy?.();
      if (original.source) {
        item.source = original.source;
        item.sourceLine = original.line ?? undefined;
        item.sourceName = original.name ?? undefined;
      }
    } catch {
      // The ordinary production build omits maps; profiling builds provide them.
    }
  }

  await writeFile(path.join(outputDirectory, 'homepage.cpuprofile.json'), JSON.stringify(profile));
  await writeFile(
    path.join(outputDirectory, 'homepage-summary.json'),
    JSON.stringify({ durationMs, samples: profile.samples.length, summary }, null, 2),
  );
  await writeFile(
    path.join(outputDirectory, 'homepage-timeline.json'),
    JSON.stringify(timeline, null, 2),
  );
  console.table(summary.slice(0, 20));
} finally {
  await browser.close();
  try {
    await chrome.kill();
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'EPERM')) throw error;
  }
}
