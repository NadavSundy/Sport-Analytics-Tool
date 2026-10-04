/**
 * Runs the issue #815 natural-language translation evaluation set against the
 * configured provider and writes a dated, auditable record under `evidence/`.
 *
 * Run it by hand:
 *
 *   npm run evaluate:natural-language-queries
 *
 * It is deliberately not part of continuous integration. Every run makes one
 * provider call per case and spends real money against the ADR-017 limit, so it
 * is run when there is a reason to: a model change, a prompt change, or a
 * contract change.
 *
 * It calls the issue #814 adapter directly rather than the HTTP endpoint, so it
 * measures translation alone: no limiter, no name resolution and no database.
 *
 * The key is read from `LLM_API_KEY` and is never printed, logged or written. The
 * only thing recorded about the provider is the model identifier it reported.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { createLlmClient } from '../apps/backend/src/modules/analytics-query/llm.client';
import {
  NATURAL_LANGUAGE_QUERY_CASES,
  compareTranslation,
  renderResults,
  summarise,
} from './natural-language-query-cases.mjs';

function argument(name, environmentName) {
  const index = process.argv.indexOf(name);
  return index === -1 ? process.env[environmentName] : process.argv[index + 1];
}

async function main() {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    // Failing before the first call rather than after twenty-eight of them.
    throw new Error(
      'LLM_API_KEY is not set. Set it in the environment before running the evaluation.',
    );
  }

  const model = argument('--model', 'LLM_MODEL') ?? 'claude-haiku-4-5-20251001';
  const timeoutMs = Number(argument('--timeout-ms', 'LLM_TIMEOUT_MS') ?? '15000');
  const startedAt = new Date().toISOString();
  const output = resolve(
    argument('--output', 'NL_QUERY_EVALUATION_OUTPUT') ??
      `evidence/validation/issue-815-natural-language-evaluation-${startedAt.slice(0, 10)}.md`,
  );

  const client = createLlmClient({ apiKey, model, timeoutMs });

  console.log(`Evaluating ${NATURAL_LANGUAGE_QUERY_CASES.length} cases against ${model}.`);

  const results = [];
  let reportedModel = model;

  // Sequential on purpose: it keeps the provider's own rate limit out of the
  // measurement, and a failed case then names itself in order.
  for (const testCase of NATURAL_LANGUAGE_QUERY_CASES) {
    try {
      const translation = await client.translateQuestion(testCase.question);
      reportedModel = translation.model;
      results.push(compareTranslation(testCase, translation.definition, translation.suggestions));
    } catch (error) {
      // The adapter's messages are fixed strings carrying neither the question nor
      // the model's output, so recording the name and message leaks nothing.
      const name = error instanceof Error ? error.name : 'UnknownError';
      const message = error instanceof Error ? error.message : '';
      results.push({ id: testCase.id, pass: false, detail: `${name}: ${message}` });
    }

    const last = results.at(-1);
    console.log(`  ${last.pass ? 'pass' : 'FAIL'}  ${last.id}`);
  }

  const { passed, total, failed } = summarise(results);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, renderResults({ model: reportedModel, startedAt, results }), 'utf8');

  console.log(`\n${passed}/${total} cases passed (${failed} failed).`);
  console.log(`Wrote ${output}`);
}

main().catch((error) => {
  // Printing the message alone keeps a stack trace carrying request detail out of
  // the terminal and out of any captured build log.
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
