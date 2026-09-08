import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const defaultResponsesPath = resolve(repositoryRoot, 'testing/user-feedback/responses.json');
const defaultSchemaPath = resolve(repositoryRoot, 'testing/user-feedback/schema.json');

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function addError(errors, path, message) {
  errors.push(`${path}: ${message}`);
}

function validateObject(value, allowedKeys, requiredKeys, path, errors) {
  if (!isObject(value)) {
    addError(errors, path, 'must be an object');
    return false;
  }

  for (const key of Object.keys(value)) {
    if (!allowedKeys.includes(key)) addError(errors, `${path}.${key}`, 'is not permitted');
  }
  for (const key of requiredKeys) {
    if (!(key in value)) addError(errors, `${path}.${key}`, 'is required');
  }
  return true;
}

/**
 * @param {unknown} value
 * @param {string} path
 * @param {string[]} errors
 * @param {{ pattern?: string; maxLength?: number; minLength?: number }} [options]
 */
function validateString(value, path, errors, { pattern, maxLength, minLength = 1 } = {}) {
  if (typeof value !== 'string') {
    addError(errors, path, 'must be a string');
    return;
  }
  if (value.length < minLength)
    addError(errors, path, `must contain at least ${minLength} character`);
  if (maxLength && value.length > maxLength)
    addError(errors, path, `must not exceed ${maxLength} characters`);
  if (pattern && !new RegExp(pattern).test(value)) addError(errors, path, 'has an invalid format');
}

function validateTraceability(traceability, path, errors, schema) {
  const definition = schema.$defs.traceability;
  if (!validateObject(traceability, Object.keys(definition.properties), [], path, errors)) return;

  for (const [key, value] of Object.entries(traceability)) {
    validateString(value, `${path}.${key}`, errors, definition.properties[key]);
  }
}

function validateResponse(response, path, errors, schema) {
  const definition = schema.$defs.response;
  if (
    !validateObject(response, Object.keys(definition.properties), definition.required, path, errors)
  )
    return;

  validateString(
    response.participant,
    `${path}.participant`,
    errors,
    definition.properties.participant,
  );
  for (const field of [
    'workflow',
    'tasksAttempted',
    'completionStatus',
    'observations',
    'positiveFindings',
    'problems',
    'suggestions',
  ]) {
    validateString(response[field], `${path}.${field}`, errors, schema.$defs.freeText);
  }

  if (!definition.properties.severity.enum.includes(response.severity)) {
    addError(errors, `${path}.severity`, 'must be one of: S1, S2, S3, S4');
  }
  if ('traceability' in response) {
    validateTraceability(response.traceability, `${path}.traceability`, errors, schema);
  }
}

export function validateUserFeedbackStore(store, schema) {
  const errors = [];
  if (!validateObject(store, Object.keys(schema.properties), schema.required, '$', errors)) {
    return { valid: false, errors };
  }

  if (store.schemaVersion !== schema.properties.schemaVersion.const) {
    addError(errors, '$.schemaVersion', `must equal ${schema.properties.schemaVersion.const}`);
  }
  if (!Array.isArray(store.responses)) {
    addError(errors, '$.responses', 'must be an array');
  } else {
    store.responses.forEach((response, index) =>
      validateResponse(response, `$.responses[${index}]`, errors, schema),
    );
  }

  return { valid: errors.length === 0, errors };
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function main() {
  const responsesPath = resolve(process.argv[2] ?? defaultResponsesPath);
  const [store, schema] = await Promise.all([readJson(responsesPath), readJson(defaultSchemaPath)]);
  const result = validateUserFeedbackStore(store, schema);

  if (!result.valid) {
    console.error(`User-feedback validation failed for ${responsesPath}:`);
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `User-feedback validation passed for ${responsesPath} (${store.responses.length} response(s)).`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`User-feedback validation could not run: ${error.message}`);
    process.exitCode = 1;
  });
}
