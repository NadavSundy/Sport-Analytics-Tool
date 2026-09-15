/**
 * Measure representative public API reads sequentially and write an auditable
 * Markdown result. The caller supplies IDs from the local synthetic corpus.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const targets = {
  'public fixture page': 500,
  'fixture event page': 750,
  'fixture statistics': 1500,
  'participant aggregate': 1500,
  'CSV event export': 1000,
};

function value(name, environmentName) {
  const index = process.argv.indexOf(name);
  return index === -1 ? process.env[environmentName] : process.argv[index + 1];
}

function positiveInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1)
    throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

function percentile(samples, fraction) {
  const ordered = [...samples].sort((left, right) => left - right);
  return ordered[Math.ceil(ordered.length * fraction) - 1];
}

async function request(url) {
  const started = process.hrtime.bigint();
  const response = await fetch(url, { headers: { accept: 'application/json,text/csv;q=0.9' } });
  await response.arrayBuffer();
  const elapsed = Number(process.hrtime.bigint() - started) / 1_000_000;
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return elapsed;
}

async function main() {
  const baseUrl = value('--base-url', 'PERF_BASE_URL')?.replace(/\/$/, '');
  const fixtureId = value('--fixture-id', 'PERF_FIXTURE_ID');
  const participantId = value('--participant-id', 'PERF_PARTICIPANT_ID');
  const output = resolve(
    value('--output', 'PERF_OUTPUT') ?? 'evidence/validation/issue-289-local-measurement.md',
  );
  const samples = positiveInteger(value('--samples', 'PERF_SAMPLES') ?? '10', '--samples');
  if (!baseUrl || !fixtureId || !participantId) {
    throw new Error(
      'Set --base-url, --fixture-id and --participant-id (or PERF_BASE_URL, PERF_FIXTURE_ID and PERF_PARTICIPANT_ID).',
    );
  }

  const operations = {
    'public fixture page': `${baseUrl}/api/v1/fixtures?limit=50`,
    'fixture event page': `${baseUrl}/api/v1/fixtures/${fixtureId}/events?limit=100`,
    'fixture statistics': `${baseUrl}/api/v1/fixtures/${fixtureId}/statistics`,
    'participant aggregate': `${baseUrl}/api/v1/participants/${participantId}/statistics`,
    'CSV event export': `${baseUrl}/api/v1/fixtures/${fixtureId}/events/export.csv`,
  };

  // This discarded request establishes the retained database-pool client. It is
  // required for a warm run and intentionally not included in any percentile.
  await request(`${baseUrl}/api/v1/competitions?limit=1`);
  const results = [];
  for (const [name, url] of Object.entries(operations)) {
    const timings = [];
    for (let index = 0; index < samples; index += 1) timings.push(await request(url));
    const p95 = percentile(timings, 0.95);
    results.push({
      name,
      p50: percentile(timings, 0.5),
      p95,
      target: targets[name],
      passed: p95 <= targets[name],
    });
  }

  const lines = [
    '# Issue #289 local representative-scale measurement',
    '',
    `- Base URL: ${baseUrl}`,
    `- Fixture ID: ${fixtureId}; participant ID: ${participantId}`,
    `- Samples per operation: ${samples}; sequential warm-cache requests`,
    '- Warm-up: one successful database-backed request discarded before sampling.',
    '',
    '| Operation | P50 (ms) | P95 (ms) | Target (ms) | Result |',
    '| --- | ---: | ---: | ---: | --- |',
    ...results.map(
      (result) =>
        `| ${result.name} | ${result.p50.toFixed(1)} | ${result.p95.toFixed(1)} | ${result.target} | ${result.passed ? 'pass' : 'fail'} |`,
    ),
    '',
    'This run uses no credentials, private data or production endpoint. See docs/development/performance-baseline.md for setup and cold-run procedure.',
    '',
  ];
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, lines.join('\n'));
  console.log(`Wrote ${output}`);
  if (results.some((result) => !result.passed)) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
