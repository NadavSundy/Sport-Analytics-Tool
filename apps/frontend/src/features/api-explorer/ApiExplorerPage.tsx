import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SwaggerUI from 'swagger-ui-react';
import { parse } from 'yaml';
import 'swagger-ui-react/swagger-ui.css';

import { PageLayout } from '../../components/PageLayout';
import './ApiExplorerPage.css';

const DEFAULT_API_BASE_URL = 'http://localhost:3000/api/v1';
const API_MAJOR_VERSION = 'v1';
const HTTP_METHODS = new Set(['get', 'put', 'post', 'delete', 'patch', 'options', 'head']);

type OpenApiOperation = Record<string, unknown> & {
  description?: string;
  summary?: string;
  'x-implementation-status'?: string;
};

type OpenApiPathItem = Record<string, unknown>;

export type OpenApiDocument = Record<string, unknown> & {
  components?: Record<string, unknown>;
  info?: Record<string, unknown>;
  openapi?: string;
  paths?: Record<string, OpenApiPathItem>;
};

export interface PlannedOperationSummary {
  method: string;
  operationId?: string;
  path: string;
  summary: string;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | {
      document: OpenApiDocument;
      kind: 'ready';
      plannedOperations: PlannedOperationSummary[];
    };

function apiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL;
}

export function openApiSpecificationUrl(baseUrl = apiBaseUrl()): string {
  const trimmed = baseUrl.replace(/\/+$/, '');
  const backendRoot = trimmed.endsWith('/api/v1') ? trimmed.slice(0, -'/api/v1'.length) : trimmed;

  return `${backendRoot}/openapi.yaml`;
}

function isOperation(value: unknown): value is OpenApiOperation {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPlannedOperation(operation: OpenApiOperation): boolean {
  return operation['x-implementation-status'] === 'planned';
}

export function plannedOperations(document: OpenApiDocument): PlannedOperationSummary[] {
  const planned: PlannedOperationSummary[] = [];

  for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
    for (const [method, rawOperation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method) || !isOperation(rawOperation)) continue;
      if (!isPlannedOperation(rawOperation)) continue;

      planned.push({
        method: method.toUpperCase(),
        path,
        summary:
          typeof rawOperation.summary === 'string' ? rawOperation.summary : 'Planned operation',
        ...(typeof rawOperation.operationId === 'string'
          ? { operationId: rawOperation.operationId }
          : {}),
      });
    }
  }

  return planned;
}

export function implementedExplorerDocument(document: OpenApiDocument): OpenApiDocument {
  const nextPaths: Record<string, OpenApiPathItem> = {};

  for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
    const nextPathItem: OpenApiPathItem = {};
    let implementedOperationCount = 0;

    for (const [key, value] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(key)) {
        nextPathItem[key] = value;
        continue;
      }

      if (isOperation(value) && isPlannedOperation(value)) {
        continue;
      }

      nextPathItem[key] = value;
      implementedOperationCount += 1;
    }

    if (implementedOperationCount > 0) {
      nextPaths[path] = nextPathItem;
    }
  }

  return {
    ...document,
    paths: nextPaths,
  };
}

function parseOpenApiDocument(source: string): OpenApiDocument {
  const parsed = parse(source) as unknown;

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('OpenAPI document is not an object');
  }

  const document = parsed as OpenApiDocument;

  if (typeof document.openapi !== 'string' || !document.openapi.startsWith('3.')) {
    throw new Error('OpenAPI document does not declare a supported OpenAPI version');
  }

  if (typeof document.paths !== 'object' || document.paths === null) {
    throw new Error('OpenAPI document does not contain paths');
  }

  return document;
}

export function ApiExplorerPage() {
  const [reloadToken, setReloadToken] = useState(0);
  const [showPlanned, setShowPlanned] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' });
  const specificationUrl = openApiSpecificationUrl();

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setLoadState({ kind: 'loading' });

    async function loadSpecification() {
      try {
        const response = await fetch(specificationUrl, {
          headers: {
            Accept: 'application/yaml, text/yaml, text/plain',
          },
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`OpenAPI request failed with status ${response.status}`);
        }

        const source = await response.text();
        const document = parseOpenApiDocument(source);

        if (active) {
          setLoadState({
            kind: 'ready',
            document,
            plannedOperations: plannedOperations(document),
          });
        }
      } catch {
        if (!active || controller.signal.aborted) return;
        setLoadState({ kind: 'error' });
      }
    }

    void loadSpecification();

    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadToken, specificationUrl]);

  const swaggerDocument = useMemo(() => {
    if (loadState.kind !== 'ready') return null;
    return implementedExplorerDocument(loadState.document);
  }, [loadState]);

  return (
    <PageLayout
      heading="API Explorer"
      description="Explore the authoritative Sport Analytics OpenAPI contract and try implemented endpoints directly from the browser."
    >
      <section className="api-explorer__intro" aria-labelledby="api-explorer-version">
        <div>
          <p className="eyebrow">Public developer interface</p>
          <h2 id="api-explorer-version">Supported API major version: {API_MAJOR_VERSION}</h2>
          <p>
            Public reads need no credentials. Authenticated application endpoints use a Supabase
            bearer token, while consumer endpoints use an <code>X-API-Key</code>. Use the
            explorer&apos;s <strong>Authorize</strong> control to supply credentials at runtime.
          </p>
        </div>
        <nav className="api-explorer__links" aria-label="API supporting resources">
          <a href="https://sports-analytics-tool.pages.dev/api/overview/">API documentation</a>
          <Link to="/dataset-releases">Dataset downloads</Link>
        </nav>
      </section>

      {loadState.kind === 'loading' ? (
        <div className="api-explorer__state ui-card" role="status" aria-live="polite">
          <h2>Loading API specification</h2>
          <p>Fetching the current contract from the backend…</p>
        </div>
      ) : null}

      {loadState.kind === 'error' ? (
        <div className="api-explorer__state ui-message ui-message--error" role="alert">
          <h2 className="ui-message__heading">We could not load the API specification</h2>
          <p>The explorer cannot start until the backend contract is available.</p>
          <button
            className="ui-button ui-button--secondary api-explorer__retry"
            type="button"
            onClick={() => setReloadToken((value) => value + 1)}
          >
            Retry loading specification
          </button>
        </div>
      ) : null}

      {loadState.kind === 'ready' && swaggerDocument ? (
        <>
          <section
            className="api-explorer__controls ui-card"
            aria-labelledby="implementation-status-heading"
          >
            <div>
              <h2 id="implementation-status-heading">Implementation status</h2>
              <p>
                Implemented operations are interactive in Swagger. Planned contract entries are
                hidden by default and, when shown, appear separately as non-executable information.
              </p>
            </div>
            <label className="api-explorer__planned-toggle">
              <input
                type="checkbox"
                checked={showPlanned}
                onChange={(event) => setShowPlanned(event.currentTarget.checked)}
              />
              <span>
                Show planned operations
                {loadState.plannedOperations.length > 0
                  ? ` (${loadState.plannedOperations.length})`
                  : ''}
              </span>
            </label>
          </section>

          {showPlanned ? (
            loadState.plannedOperations.length > 0 ? (
              <section
                className="api-explorer__planned-list ui-card"
                aria-labelledby="planned-operations-heading"
              >
                <div className="api-explorer__planned-list-heading">
                  <div>
                    <p className="eyebrow">Contract roadmap</p>
                    <h2 id="planned-operations-heading">Planned operations</h2>
                  </div>
                  <span className="api-explorer__planned-badge">NOT DEPLOYED</span>
                </div>
                <p>
                  These operations are documented for future work. They are intentionally kept out
                  of Swagger&apos;s executable operation list.
                </p>
                <ul className="api-explorer__planned-items">
                  {loadState.plannedOperations.map((operation) => (
                    <li
                      key={`${operation.method}:${operation.path}`}
                      className="api-explorer__planned-item"
                    >
                      <span className="api-explorer__planned-method">{operation.method}</span>
                      <code>{operation.path}</code>
                      <span>{operation.summary}</span>
                      <span className="api-explorer__planned-state">PLANNED</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <p className="api-explorer__planned-empty ui-card" role="status">
                The current contract contains no planned operations.
              </p>
            )
          ) : null}

          <section className="api-explorer__swagger-region" aria-labelledby="swagger-heading">
            <h2 className="api-explorer__swagger-heading" id="swagger-heading">
              OpenAPI {API_MAJOR_VERSION}
            </h2>
            <div className="api-explorer__swagger">
              <SwaggerUI
                spec={swaggerDocument}
                deepLinking
                displayRequestDuration
                defaultModelsExpandDepth={-1}
                persistAuthorization={false}
              />
            </div>
          </section>
        </>
      ) : null}
    </PageLayout>
  );
}
