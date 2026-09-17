import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import type { Response } from 'supertest';
import { parse } from 'yaml';

/**
 * Checks real API exchanges against the published OpenAPI contract (issue #609).
 *
 * `docs/api/openapi.yaml` is the only specification. It is loaded as-is and its
 * schemas are validated with Ajv's JSON Schema 2020-12 dialect, which is the
 * dialect OpenAPI 3.1 uses. Ajv resolves every `$ref` against the loaded
 * document, so nothing is dereferenced or copied into a second contract.
 *
 * For each response the contract requires that:
 *   - the request path and method match exactly one documented operation;
 *   - the status is documented (exactly, as `4XX`/`5XX`, or as `default`);
 *   - the content type is one the response documents, and a response that
 *     documents no content has no body;
 *   - a JSON body satisfies the documented schema;
 *   - every documented `required` response header is present, and every
 *     documented header that is present satisfies its schema.
 *
 * The request is checked as well: path, query and header parameters, and a
 * JSON request body when the test supplies it. A test that deliberately sends
 * an invalid request declares so, and the contract then requires the request
 * to be invalid, which proves the error response is exercised for a reason.
 */

const OPENAPI_DOCUMENT_PATH = resolve(__dirname, '../../../../docs/api/openapi.yaml');

type JsonObject = Record<string, unknown>;

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
const DOCUMENT_ID = 'openapi.json';

interface Located<T> {
  node: T;
  pointer: string;
}

interface MatchedOperation {
  method: string;
  template: string;
  pathPointer: string;
  operationPointer: string;
  operation: JsonObject;
  pathParameters: Record<string, string>;
}

interface ContractExchange {
  /** The JSON request body the test sent, checked against the documented request body. */
  requestBody?: unknown;
  /**
   * The test deliberately sent a request the contract does not allow, for
   * example an invalid query value or malformed JSON. The contract requires at
   * least one request violation instead of none.
   */
  requestIsInvalid?: boolean;
}

export class ContractViolation extends Error {
  constructor(
    readonly exchange: string,
    readonly problems: string[],
  ) {
    super(
      `OpenAPI contract violation for ${exchange}:\n${problems.map((problem) => `  - ${problem}`).join('\n')}\n` +
        `Contract: docs/api/openapi.yaml`,
    );
    this.name = 'ContractViolation';
  }
}

function escapePointerToken(token: string): string {
  return token.replace(/~/g, '~0').replace(/\//g, '~1');
}

function unescapePointerToken(token: string): string {
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatAjvErrors(errors: ErrorObject[] | null | undefined): string[] {
  return (errors ?? []).slice(0, 12).map((error) => {
    const location = error.instancePath === '' ? '(root)' : error.instancePath;
    const detail =
      error.keyword === 'additionalProperties'
        ? ` '${String((error.params as { additionalProperty?: string }).additionalProperty)}'`
        : error.keyword === 'enum' || error.keyword === 'const'
          ? ` ${JSON.stringify(error.params)}`
          : '';
    return `${location} ${error.message ?? 'is invalid'}${detail}`;
  });
}

function schemaTypes(schema: unknown): string[] {
  if (!isObject(schema)) return [];
  if (typeof schema.type === 'string') return [schema.type];
  if (Array.isArray(schema.type))
    return schema.type.filter((t): t is string => typeof t === 'string');
  return [];
}

export interface OpenApiContract {
  readonly document: JsonObject;
  /** Validates a supertest response, and its request, against the contract. Throws a ContractViolation. */
  expectResponse(response: Response, exchange?: ContractExchange): void;
  /** Returns the problems instead of throwing, for tests of the contract itself. */
  checkResponse(response: Response, exchange?: ContractExchange): string[];
  /** The documented operation for a method and request path, or undefined. */
  findOperation(
    method: string,
    requestPath: string,
  ): { method: string; template: string } | undefined;
  /** Validates a value against the schema at a JSON pointer in the document, such as a component schema. */
  schemaProblems(pointer: string, value: unknown): string[];
  /** Every documented operation as `METHOD /path/template`. */
  operations(): string[];
  /** Operations checked so far through this contract instance. */
  exercisedOperations(): Set<string>;
}

export function loadOpenApiDocument(path = OPENAPI_DOCUMENT_PATH): JsonObject {
  return parse(readFileSync(path, 'utf8')) as JsonObject;
}

export function createOpenApiContract(
  document: JsonObject = loadOpenApiDocument(),
): OpenApiContract {
  const ajv = new Ajv2020({ strict: false, allErrors: true, validateFormats: true });
  addFormats(ajv);
  for (const format of ['binary', 'byte', 'int32', 'int64', 'float', 'double', 'password']) {
    ajv.addFormat(format, true);
  }
  ajv.addSchema(document, DOCUMENT_ID);

  const validators = new Map<string, ValidateFunction>();
  const exercised = new Set<string>();

  function validatorAt(pointer: string): ValidateFunction {
    const existing = validators.get(pointer);
    if (existing) return existing;
    const validate = ajv.compile({ $ref: `${DOCUMENT_ID}#${pointer}` });
    validators.set(pointer, validate);
    return validate;
  }

  function nodeAt(pointer: string): unknown {
    return pointer
      .split('/')
      .slice(1)
      .reduce<unknown>(
        (node, token) =>
          isObject(node) || Array.isArray(node)
            ? (node as JsonObject)[unescapePointerToken(token)]
            : undefined,
        document,
      );
  }

  /** Follows local `$ref`s from a node, keeping the pointer of the node finally reached. */
  function follow<T>(node: unknown, pointer: string): Located<T> {
    let current: unknown = node;
    let currentPointer = pointer;
    for (let depth = 0; isObject(current) && typeof current.$ref === 'string'; depth += 1) {
      if (depth > 20 || !current.$ref.startsWith('#/')) {
        throw new Error(
          `Unsupported or circular $ref at ${currentPointer}: ${String(current.$ref)}`,
        );
      }
      currentPointer = current.$ref.slice(1);
      current = nodeAt(currentPointer);
    }
    return { node: current as T, pointer: currentPointer };
  }

  const pathEntries = Object.entries((document.paths ?? {}) as Record<string, JsonObject>).map(
    ([template, item]) => {
      const names: string[] = [];
      const pattern = template
        .split('/')
        .map((segment) => {
          const parameter = /^\{([^}]+)\}$/.exec(segment);
          if (parameter) {
            names.push(parameter[1]!);
            return '([^/]+)';
          }
          return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        })
        .join('/');
      return {
        template,
        item,
        names,
        regex: new RegExp(`^${pattern}$`),
        literalSegments: template
          .split('/')
          .filter((segment) => segment && !segment.startsWith('{')).length,
      };
    },
  );

  function matchOperation(method: string, requestPath: string): MatchedOperation | undefined {
    const lowerMethod = method.toLowerCase();
    const candidates = pathEntries
      .map((entry) => ({ entry, match: entry.regex.exec(requestPath) }))
      .filter(({ entry, match }) => match && isObject(entry.item[lowerMethod]))
      // A literal segment outranks a template parameter, as in OpenAPI path matching.
      .sort((left, right) => right.entry.literalSegments - left.entry.literalSegments);
    const chosen = candidates[0];
    if (!chosen?.match) return undefined;
    const pathPointer = `/paths/${escapePointerToken(chosen.entry.template)}`;
    return {
      method: lowerMethod,
      template: chosen.entry.template,
      pathPointer,
      operationPointer: `${pathPointer}/${lowerMethod}`,
      operation: chosen.entry.item[lowerMethod] as JsonObject,
      pathParameters: Object.fromEntries(
        chosen.entry.names.map((name, index) => [
          name,
          decodeURIComponent(chosen.match![index + 1]!),
        ]),
      ),
    };
  }

  function coerce(value: string, schema: unknown): unknown {
    const types = schemaTypes(schema);
    if (
      (types.includes('integer') || types.includes('number')) &&
      value.trim() !== '' &&
      !Number.isNaN(Number(value))
    ) {
      return Number(value);
    }
    if (types.includes('boolean') && (value === 'true' || value === 'false'))
      return value === 'true';
    return value;
  }

  function requestProblems(
    matched: MatchedOperation,
    url: URL,
    requestHeaders: Record<string, unknown>,
    exchange: ContractExchange,
  ): string[] {
    const problems: string[] = [];
    const declared = new Map<string, Located<JsonObject>>();
    const pathItem = nodeAt(matched.pathPointer) as JsonObject;
    for (const [owner, ownerPointer] of [
      [pathItem, matched.pathPointer],
      [matched.operation, matched.operationPointer],
    ] as const) {
      const parameters = Array.isArray(owner.parameters) ? owner.parameters : [];
      parameters.forEach((parameter, index) => {
        const located = follow<JsonObject>(parameter, `${ownerPointer}/parameters/${index}`);
        declared.set(
          `${String(located.node.in)}:${String(located.node.name).toLowerCase()}`,
          located,
        );
      });
    }

    for (const { node: parameter, pointer } of declared.values()) {
      const name = String(parameter.name);
      let raw: string | undefined;
      if (parameter.in === 'path') raw = matched.pathParameters[name];
      if (parameter.in === 'query') raw = url.searchParams.get(name) ?? undefined;
      if (parameter.in === 'header') {
        const header = requestHeaders[name.toLowerCase()];
        raw = header === undefined ? undefined : String(header);
      }
      if (parameter.in === 'cookie') continue;
      if (raw === undefined) {
        if (parameter.required === true)
          problems.push(
            `request ${String(parameter.in)} parameter '${name}' is required but missing`,
          );
        continue;
      }
      if (parameter.schema !== undefined) {
        const schema = follow<unknown>(parameter.schema, `${pointer}/schema`);
        const validate = validatorAt(`${pointer}/schema`);
        if (!validate(coerce(raw, schema.node))) {
          problems.push(
            ...formatAjvErrors(validate.errors).map(
              (message) =>
                `request ${String(parameter.in)} parameter '${name}'=${JSON.stringify(raw)}: ${message}`,
            ),
          );
        }
      }
    }

    const knownQuery = new Set(
      [...declared.values()]
        .filter(({ node }) => node.in === 'query')
        .map(({ node }) => String(node.name)),
    );
    for (const name of new Set(url.searchParams.keys())) {
      if (!knownQuery.has(name))
        problems.push(`request query parameter '${name}' is not documented`);
    }

    if (exchange.requestBody !== undefined) {
      if (matched.operation.requestBody === undefined) {
        problems.push('a request body was sent but the operation documents none');
      } else {
        const body = follow<JsonObject>(
          matched.operation.requestBody,
          `${matched.operationPointer}/requestBody`,
        );
        const content = (body.node.content ?? {}) as Record<string, unknown>;
        const jsonType = Object.keys(content).find((type) =>
          /^application\/(?:[\w.+-]+\+)?json$/.test(type),
        );
        if (!jsonType) {
          problems.push(
            `a JSON request body was sent but the operation documents ${Object.keys(content).join(', ')}`,
          );
        } else if (typeof exchange.requestBody === 'string') {
          problems.push('the request body is not valid JSON');
        } else {
          const validate = validatorAt(
            `${body.pointer}/content/${escapePointerToken(jsonType)}/schema`,
          );
          if (!validate(exchange.requestBody)) {
            problems.push(
              ...formatAjvErrors(validate.errors).map((message) => `request body ${message}`),
            );
          }
        }
      }
    }
    return problems;
  }

  function responseProblems(matched: MatchedOperation, response: Response): string[] {
    const problems: string[] = [];
    const responses = (matched.operation.responses ?? {}) as Record<string, unknown>;
    const status = String(response.status);
    const key = [status, `${status[0]}XX`, 'default'].find(
      (candidate) => responses[candidate] !== undefined,
    );
    if (!key) {
      return [
        `status ${status} is not documented; documented statuses: ${Object.keys(responses).join(', ')}`,
      ];
    }

    const documented = follow<JsonObject>(
      responses[key],
      `${matched.operationPointer}/responses/${escapePointerToken(key)}`,
    );
    const content = (documented.node.content ?? {}) as Record<string, unknown>;
    const mediaTypes = Object.keys(content);
    const contentType = String(response.headers['content-type'] ?? '')
      .split(';')[0]!
      .trim()
      .toLowerCase();

    if (mediaTypes.length === 0) {
      if (response.text !== undefined && response.text !== '') {
        problems.push(`status ${status} documents no content but the response has a body`);
      }
    } else {
      const mediaType = mediaTypes.find((type) => type.toLowerCase() === contentType);
      if (!mediaType) {
        problems.push(
          `status ${status} content type '${contentType || '(none)'}' is not documented; documented: ${mediaTypes.join(', ')}`,
        );
      } else if (/^application\/(?:[\w.+-]+\+)?json$/.test(mediaType)) {
        const schemaPointer = `${documented.pointer}/content/${escapePointerToken(mediaType)}/schema`;
        if (nodeAt(schemaPointer) !== undefined) {
          const validate = validatorAt(schemaPointer);
          if (!validate(response.body)) {
            problems.push(
              ...formatAjvErrors(validate.errors).map((message) => `response body ${message}`),
            );
          }
        }
      }
    }

    const headers = (documented.node.headers ?? {}) as Record<string, unknown>;
    for (const [name, header] of Object.entries(headers)) {
      if (name.toLowerCase() === 'content-type') continue;
      const located = follow<JsonObject>(
        header,
        `${documented.pointer}/headers/${escapePointerToken(name)}`,
      );
      const value = response.headers[name.toLowerCase()];
      if (value === undefined) {
        if (located.node.required === true)
          problems.push(`required response header '${name}' is missing`);
        continue;
      }
      if (located.node.schema !== undefined) {
        const schema = follow<unknown>(located.node.schema, `${located.pointer}/schema`);
        const validate = validatorAt(`${located.pointer}/schema`);
        if (!validate(coerce(String(value), schema.node))) {
          problems.push(
            ...formatAjvErrors(validate.errors).map(
              (message) => `response header '${name}'=${JSON.stringify(value)}: ${message}`,
            ),
          );
        }
      }
    }
    return problems;
  }

  function checkResponse(response: Response, exchange: ContractExchange = {}): string[] {
    const request = (
      response as unknown as {
        req: { method: string; path: string; getHeaders(): Record<string, unknown> };
      }
    ).req;
    const url = new URL(request.path, 'http://contract.test');
    const matched = matchOperation(request.method, url.pathname);
    if (!matched) {
      return [`${request.method} ${url.pathname} matches no documented operation`];
    }
    exercised.add(`${matched.method.toUpperCase()} ${matched.template}`);

    const problems = responseProblems(matched, response);
    const requestIssues = requestProblems(matched, url, request.getHeaders(), exchange);
    if (exchange.requestIsInvalid) {
      if (requestIssues.length === 0) {
        problems.push(
          'the test declares the request invalid, but it satisfies the documented parameters and body',
        );
      }
    } else {
      problems.push(...requestIssues);
    }
    return problems;
  }

  return {
    document,
    checkResponse,
    expectResponse(response, exchange) {
      const problems = checkResponse(response, exchange);
      if (problems.length > 0) {
        const request = (response as unknown as { req: { method: string; path: string } }).req;
        throw new ContractViolation(
          `${request.method} ${request.path} → ${response.status}`,
          problems,
        );
      }
    },
    findOperation(method, requestPath) {
      const matched = matchOperation(method, requestPath);
      return matched && { method: matched.method.toUpperCase(), template: matched.template };
    },
    schemaProblems(pointer, value) {
      const validate = validatorAt(pointer);
      return validate(value) ? [] : formatAjvErrors(validate.errors);
    },
    operations() {
      return pathEntries.flatMap((entry) =>
        HTTP_METHODS.filter((method) => isObject(entry.item[method])).map(
          (method) => `${method.toUpperCase()} ${entry.template}`,
        ),
      );
    },
    exercisedOperations() {
      return exercised;
    },
  };
}
