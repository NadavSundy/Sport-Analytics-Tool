import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as chromeLauncher from 'chrome-launcher';
import { chromium } from 'playwright';
import sourceMap from 'source-map';

const args = process.argv.slice(2);
const value = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
export const routeSlug = (route) => {
  if (!route?.startsWith('/') || route.includes('..') || route.includes('\\'))
    throw new Error('Use a safe absolute route path.');
  return route === '/' ? 'home' : route.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9-]+/g, '-');
};
const { SourceMapConsumer } = sourceMap;
async function profileRoute({
  route = '/',
  baseUrl = 'http://localhost:5173',
  output = 'artifacts/cpu-profiles',
  duration = 5000,
} = {}) {
  const slug = routeSlug(route);
  await mkdir(output, { recursive: true });
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new'] });
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${chrome.port}`);
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.__cpuTimeline = { fcp: null, lcp: null, element: null, longTasks: [] };
      new PerformanceObserver((e) => {
        for (const x of e.getEntries())
          if (x.name === 'first-contentful-paint') window.__cpuTimeline.fcp = x.startTime;
      }).observe({ type: 'paint', buffered: true });
      new PerformanceObserver((e) => {
        const x = e.getEntries().at(-1);
        if (x) {
          window.__cpuTimeline.lcp = x.startTime;
          window.__cpuTimeline.element = x.element?.outerHTML?.slice(0, 200) ?? null;
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((e) => {
        for (const x of e.getEntries())
          window.__cpuTimeline.longTasks.push({ startTime: x.startTime, duration: x.duration });
      }).observe({ type: 'longtask', buffered: true });
    });
    const session = await context.newCDPSession(page);
    await session.send('Profiler.enable');
    await session.send('Profiler.start');
    const url = new URL(route, baseUrl).toString();
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(duration);
    const { profile } = await session.send('Profiler.stop');
    const timeline = await page.evaluate(() => window.__cpuTimeline);
    const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
    const totals = new Map();
    let elapsed = 0;
    for (let i = 1; i < profile.samples.length; i++) {
      elapsed += profile.timeDeltas[i] / 1000;
      const f = nodes.get(profile.samples[i])?.callFrame;
      if (!f) continue;
      const key = `${f.functionName || '(anonymous)'}\t${f.url}\t${f.lineNumber + 1}\t${f.columnNumber}\t${elapsed <= (timeline.lcp ?? Infinity)}`;
      totals.set(key, (totals.get(key) ?? 0) + profile.timeDeltas[i]);
    }
    const summary = await Promise.all(
      [...totals].map(async ([key, us]) => {
        const [functionName, url, line, column, beforeLcp] = key.split('\t');
        const frame = {
          functionName,
          url,
          line: Number(line),
          column: Number(column),
          beforeLcp: beforeLcp === 'true',
          milliseconds: us / 1000,
        };
        if (!url.startsWith(baseUrl)) return frame;
        try {
          const mapPath = path.join(
            'apps/frontend/dist',
            new URL(url).pathname.replace(/^\//, '') + '.map',
          );
          const consumer = await new SourceMapConsumer(JSON.parse(await readFile(mapPath, 'utf8')));
          const original = consumer.originalPositionFor({ line: frame.line, column: frame.column });
          consumer.destroy?.();
          return original.source
            ? {
                ...frame,
                source: original.source,
                sourceLine: original.line,
                sourceName: original.name,
              }
            : frame;
        } catch {
          return frame;
        }
      }),
    );
    summary.sort((a, b) => b.milliseconds - a.milliseconds);
    const top = summary.slice(0, 50);
    const report = {
      route,
      baseUrl,
      url,
      capturedAt: new Date().toISOString(),
      duration,
      timeline,
      samples: profile.samples.length,
      totalSampledCpuMs: top.reduce((n, x) => n + x.milliseconds, 0),
      sourceMapsAvailable: top.some((x) => x.source),
      summary: top,
    };
    await writeFile(path.join(output, `${slug}.json`), JSON.stringify(report, null, 2));
    await writeFile(
      path.join(output, `${slug}.md`),
      `# ${route}\n\nFCP: ${timeline.fcp ?? 'unavailable'}ms  \nLCP: ${timeline.lcp ?? 'unavailable'}ms\n\n| Function / module | Sampled CPU | Before LCP |\n| --- | ---: | --- |\n${top
        .slice(0, 20)
        .map(
          (x) =>
            `| ${x.source ?? x.url}:${x.sourceLine ?? x.line} ${x.sourceName ?? x.functionName} | ${x.milliseconds.toFixed(1)}ms | ${x.beforeLcp ? 'yes' : 'no'} |`,
        )
        .join('\n')}\n`,
    );
    console.table(top.slice(0, 20));
    return report;
  } finally {
    await browser.close();
    try {
      await chrome.kill();
    } catch {}
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await profileRoute({
    route: value('--route', '/'),
    baseUrl: value('--base-url', process.env.PROFILE_BASE_URL ?? 'http://localhost:5173'),
    output: value('--output-dir', process.env.PROFILE_OUTPUT_DIR ?? 'artifacts/cpu-profiles'),
    duration: Number(value('--duration', process.env.PROFILE_DURATION_MS ?? '5000')),
  });
