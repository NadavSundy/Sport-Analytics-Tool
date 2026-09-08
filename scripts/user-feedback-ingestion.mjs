import { readdir } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readJson, validateUserFeedbackStore } from './validate-user-feedback.mjs';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const defaultSchemaPath = resolve(repositoryRoot, 'testing/user-feedback/schema.json');

function redactFreeText(value) {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted email]')
    .replace(/\b(?:\+?\d[\d .()-]{6,}\d)\b/g, '[redacted phone]')
    .replace(/\b(?:password|token|secret|api[ _-]?key)\s*[:=]\s*[^\s]+/gi, '[redacted credential]');
}

function normaliseStore(document) {
  if (
    document &&
    typeof document === 'object' &&
    !Array.isArray(document) &&
    'responses' in document
  ) {
    return document;
  }
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw new Error(
      'A user-testing feedback file must contain a feedback object or response-store object.',
    );
  }

  return { schemaVersion: '1.0', responses: [document] };
}

function sanitiseResponse(response) {
  return {
    participant: response.participant,
    workflow: redactFreeText(response.workflow),
    tasksAttempted: redactFreeText(response.tasksAttempted),
    completionStatus: redactFreeText(response.completionStatus),
    observations: redactFreeText(response.observations),
    positiveFindings: redactFreeText(response.positiveFindings),
    problems: redactFreeText(response.problems),
    severity: response.severity,
    suggestions: redactFreeText(response.suggestions),
    traceability: response.traceability ?? {},
  };
}

async function ingestFeedbackFile(sourcePath, { schemaPath = defaultSchemaPath } = {}) {
  const [document, schema] = await Promise.all([readJson(sourcePath), readJson(schemaPath)]);
  const store = normaliseStore(document);
  const validation = validateUserFeedbackStore(store, schema);

  if (!validation.valid)
    throw new Error(`User-testing feedback validation failed: ${validation.errors.join('; ')}`);

  return store.responses.map(sanitiseResponse);
}

export async function ingestFeedbackDirectory(sourceDirectory, options = {}) {
  const entries = await readdir(sourceDirectory, { withFileTypes: true });
  const jsonFiles = entries
    .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === '.json')
    .map((entry) => resolve(sourceDirectory, entry.name))
    .sort();
  const responses = [];

  for (const sourcePath of jsonFiles) {
    const fileResponses = await ingestFeedbackFile(sourcePath, options);
    responses.push(...fileResponses);
  }

  return responses;
}

async function main() {
  const sourceDirectory = process.argv[2];
  if (!sourceDirectory)
    throw new Error('Supply a directory containing retrieved user-testing feedback JSON.');

  const responses = await ingestFeedbackDirectory(resolve(sourceDirectory));
  console.log(`Validated ${responses.length} user-testing feedback response(s).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`User-testing feedback validation failed: ${error.message}`);
    process.exitCode = 1;
  });
}
