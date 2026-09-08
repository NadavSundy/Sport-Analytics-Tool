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

function validateObjectKeys(value, allowedKeys, path, errors) {
  if (!isObject(value)) {
    addError(errors, path, 'must be an object');
    return false;
  }

  for (const key of Object.keys(value)) {
    if (!allowedKeys.includes(key)) {
      addError(errors, `${path}.${key}`, 'is not permitted');
    }
  }

  return true;
}

function validateRequiredKeys(value, requiredKeys, path, errors) {
  for (const key of requiredKeys) {
    if (!(key in value)) {
      addError(errors, `${path}.${key}`, 'is required');
    }
  }
}

function validateString(value, path, errors, { pattern, maxLength, minLength = 1 } = {}) {
  if (typeof value !== 'string') {
    addError(errors, path, 'must be a string');
    return;
  }

  if (value.length < minLength)
    addError(errors, path, `must contain at least ${minLength} character`);
  if (maxLength && value.length > maxLength) {
    addError(errors, path, `must not exceed ${maxLength} characters`);
  }
  if (pattern && !new RegExp(pattern).test(value)) addError(errors, path, 'has an invalid format');
}

function validateEnum(value, allowedValues, path, errors) {
  if (!allowedValues.includes(value)) {
    addError(errors, path, `must be one of: ${allowedValues.join(', ')}`);
  }
}

function validateIsoDate(value, path, errors) {
  validateString(value, path, errors, { pattern: '^\\d{4}-\\d{2}-\\d{2}$' });
  if (typeof value !== 'string') return;

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    addError(errors, path, 'must be a real ISO-8601 calendar date');
  }
}

function validateFreeText(value, path, errors, schema) {
  validateString(value, path, errors, schema);
}

function validateFinding(finding, path, errors, schema) {
  const definition = schema.$defs.finding;
  if (!validateObjectKeys(finding, Object.keys(definition.properties), path, errors)) return;
  validateRequiredKeys(finding, definition.required, path, errors);

  validateString(finding.findingId, `${path}.findingId`, errors, definition.properties.findingId);
  validateString(finding.summary, `${path}.summary`, errors, definition.properties.summary);
  validateEnum(finding.severity, definition.properties.severity.enum, `${path}.severity`, errors);
  validateEnum(finding.decision, definition.properties.decision.enum, `${path}.decision`, errors);

  if ('relatedIssue' in finding) {
    validateString(
      finding.relatedIssue,
      `${path}.relatedIssue`,
      errors,
      definition.properties.relatedIssue,
    );
  }
  if ('decisionReason' in finding) {
    validateString(
      finding.decisionReason,
      `${path}.decisionReason`,
      errors,
      definition.properties.decisionReason,
    );
  }
  if (typeof finding.retestRequired !== 'boolean') {
    addError(errors, `${path}.retestRequired`, 'must be a boolean');
  }
}

function validateTask(task, path, errors, schema) {
  const definition = schema.$defs.task;
  if (!validateObjectKeys(task, Object.keys(definition.properties), path, errors)) return;
  validateRequiredKeys(task, definition.required, path, errors);

  validateString(task.taskId, `${path}.taskId`, errors, definition.properties.taskId);
  validateEnum(task.outcome, definition.properties.outcome.enum, `${path}.outcome`, errors);

  if (!Array.isArray(task.observations)) {
    addError(errors, `${path}.observations`, 'must be an array');
  } else {
    task.observations.forEach((observation, index) => {
      validateString(
        observation,
        `${path}.observations[${index}]`,
        errors,
        definition.properties.observations.items,
      );
    });
  }

  if (!Array.isArray(task.findings)) {
    addError(errors, `${path}.findings`, 'must be an array');
  } else {
    task.findings.forEach((finding, index) => {
      validateFinding(finding, `${path}.findings[${index}]`, errors, schema);
    });
  }
}

function validatePostTestResponses(responses, path, errors, schema) {
  const definition = schema.$defs.postTestResponses;
  if (!validateObjectKeys(responses, Object.keys(definition.properties), path, errors)) return;

  for (const [key, value] of Object.entries(responses)) {
    if (key === 'comfortableRepeatingTasks') {
      if (typeof value !== 'boolean') addError(errors, `${path}.${key}`, 'must be a boolean');
      continue;
    }

    validateFreeText(value, `${path}.${key}`, errors, schema.$defs.freeText);
  }
}

function validateResponse(response, path, errors, schema) {
  const definition = schema.$defs.response;
  if (!validateObjectKeys(response, Object.keys(definition.properties), path, errors)) return;
  validateRequiredKeys(response, definition.required, path, errors);

  validateString(
    response.participantId,
    `${path}.participantId`,
    errors,
    definition.properties.participantId,
  );
  validateEnum(response.role, definition.properties.role.enum, `${path}.role`, errors);
  validateIsoDate(response.sessionDate, `${path}.sessionDate`, errors);
  validateEnum(
    response.importSource,
    definition.properties.importSource.enum,
    `${path}.importSource`,
    errors,
  );

  if (!Array.isArray(response.tasks)) {
    addError(errors, `${path}.tasks`, 'must be an array');
  } else {
    if (response.tasks.length < definition.properties.tasks.minItems) {
      addError(errors, `${path}.tasks`, 'must contain at least one task');
    }
    response.tasks.forEach((task, index) =>
      validateTask(task, `${path}.tasks[${index}]`, errors, schema),
    );
  }

  if ('postTestResponses' in response) {
    validatePostTestResponses(
      response.postTestResponses,
      `${path}.postTestResponses`,
      errors,
      schema,
    );
  }
}

export function validateUserFeedbackStore(store, schema) {
  const errors = [];
  if (!validateObjectKeys(store, Object.keys(schema.properties), '$', errors)) {
    return { valid: false, errors };
  }
  validateRequiredKeys(store, schema.required, '$', errors);

  if (store.schemaVersion !== schema.properties.schemaVersion.const) {
    addError(errors, '$.schemaVersion', `must equal ${schema.properties.schemaVersion.const}`);
  }

  if (!Array.isArray(store.responses)) {
    addError(errors, '$.responses', 'must be an array');
  } else {
    store.responses.forEach((response, index) => {
      validateResponse(response, `$.responses[${index}]`, errors, schema);
    });
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
