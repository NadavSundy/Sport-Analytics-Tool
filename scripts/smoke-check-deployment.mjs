import { pathToFileURL } from 'node:url';

const DEFAULT_ATTEMPTS = 12;
const DEFAULT_DELAY_MS = 10_000;
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_ERROR_BODY_LENGTH = 500;

function readPositiveInteger(value, fallback, name) {
  if (value === undefined) {
    return fallback;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsedValue;
}

function sleep(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function describeResponseFailure(response, body, expectedText) {
  if (!response.ok) {
    const bodySummary = body.trim().slice(0, MAX_ERROR_BODY_LENGTH);
    const suffix = bodySummary ? ` Response: ${bodySummary}` : '';
    return `HTTP ${response.status}.${suffix}`;
  }

  return `response did not contain ${JSON.stringify(expectedText)}.`;
}

export async function smokeCheck(
  {
    label,
    url,
    expectedText,
    attempts = DEFAULT_ATTEMPTS,
    delayMs = DEFAULT_DELAY_MS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  },
  dependencies = {},
) {
  if (!label?.trim()) {
    throw new Error('Smoke-check label is required.');
  }

  let targetUrl;

  try {
    targetUrl = new URL(url);
  } catch {
    throw new Error(`Smoke-check URL is invalid: ${url}`);
  }

  if (!['http:', 'https:'].includes(targetUrl.protocol)) {
    throw new Error('Smoke-check URL must use HTTP or HTTPS.');
  }

  const fetchRequest = dependencies.fetchRequest ?? globalThis.fetch;
  const wait = dependencies.wait ?? sleep;
  const logger = dependencies.logger ?? console;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchRequest(targetUrl, {
        headers: { Accept: '*/*' },
        redirect: 'follow',
        signal: controller.signal,
      });
      const body = await response.text();
      const hasExpectedText = expectedText === undefined || body.includes(expectedText);

      if (response.ok && hasExpectedText) {
        logger.log(
          `[smoke] ${label} passed on attempt ${attempt}/${attempts} (HTTP ${response.status}).`,
        );
        return { attempts: attempt, status: response.status };
      }

      throw new Error(describeResponseFailure(response, body, expectedText));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[smoke] ${label} attempt ${attempt}/${attempts} failed: ${message}`);

      if (attempt === attempts) {
        throw new Error(`${label} failed after ${attempts} attempts. Last error: ${message}`);
      }
    } finally {
      clearTimeout(timeout);
    }

    await wait(delayMs);
  }

  throw new Error(`${label} failed without making a request.`);
}

async function runFromCommandLine() {
  const [label, url, expectedText] = process.argv.slice(2);

  if (!label || !url) {
    console.error(
      'Usage: node scripts/smoke-check-deployment.mjs <label> <url> [expected-response-text]',
    );
    process.exitCode = 2;
    return;
  }

  try {
    await smokeCheck({
      label,
      url,
      expectedText,
      attempts: readPositiveInteger(
        process.env.SMOKE_CHECK_ATTEMPTS,
        DEFAULT_ATTEMPTS,
        'SMOKE_CHECK_ATTEMPTS',
      ),
      delayMs: readPositiveInteger(
        process.env.SMOKE_CHECK_DELAY_MS,
        DEFAULT_DELAY_MS,
        'SMOKE_CHECK_DELAY_MS',
      ),
      timeoutMs: readPositiveInteger(
        process.env.SMOKE_CHECK_TIMEOUT_MS,
        DEFAULT_TIMEOUT_MS,
        'SMOKE_CHECK_TIMEOUT_MS',
      ),
    });
  } catch (error) {
    console.error(`[smoke] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runFromCommandLine();
}
