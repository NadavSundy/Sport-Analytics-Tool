import type { RequestHandler } from 'express';

export interface ApiDeprecation {
  method: string;
  path: string;
  replacementPath: string;
}

const deprecatedOperations: readonly ApiDeprecation[] = [
  {
    method: 'GET',
    path: '/api/v1/fixtures/:fixtureId/events/export.json',
    replacementPath: '/api/v1/consumer/fixtures/:fixtureId/events/export.json',
  },
];

function pathParameters(path: string): string[] {
  return [...path.matchAll(/:([A-Za-z][A-Za-z0-9_]*)/g)].map((match) => match[1]!);
}

function validateDeprecations(deprecations: readonly ApiDeprecation[]): void {
  const seen = new Set<string>();

  for (const deprecation of deprecations) {
    if (!/^[A-Z]+$/.test(deprecation.method)) {
      throw new Error('A deprecated API operation must use an uppercase HTTP method.');
    }
    if (!deprecation.path.startsWith('/')) {
      throw new Error('A deprecated API operation path must begin with "/".');
    }
    if (!deprecation.replacementPath.startsWith('/')) {
      throw new Error('A deprecated API operation requires an absolute replacement path.');
    }

    const operation = `${deprecation.method} ${deprecation.path}`;
    if (seen.has(operation)) {
      throw new Error(`Duplicate API deprecation configuration for ${operation}.`);
    }
    seen.add(operation);

    const sourceParameters = pathParameters(deprecation.path).sort();
    const replacementParameters = pathParameters(deprecation.replacementPath).sort();
    if (sourceParameters.join(',') !== replacementParameters.join(',')) {
      throw new Error(`Replacement path for ${operation} must retain every path parameter.`);
    }
  }
}

function matchesPath(path: string, template: string): Record<string, string> | undefined {
  const pathSegments = path.split('/').filter(Boolean);
  const templateSegments = template.split('/').filter(Boolean);
  if (pathSegments.length !== templateSegments.length) return undefined;

  const parameters: Record<string, string> = {};
  for (const [index, templateSegment] of templateSegments.entries()) {
    const value = pathSegments[index]!;
    if (templateSegment.startsWith(':')) {
      parameters[templateSegment.slice(1)] = value;
    } else if (templateSegment !== value) {
      return undefined;
    }
  }
  return parameters;
}

function replacementUrl(
  replacementPath: string,
  parameters: Record<string, string>,
  originalUrl: string,
): string {
  const path = replacementPath.replace(/:([A-Za-z][A-Za-z0-9_]*)/g, (_match, name: string) => {
    return encodeURIComponent(parameters[name]!);
  });
  const query = originalUrl.indexOf('?');
  return query === -1 ? path : `${path}${originalUrl.slice(query)}`;
}

/**
 * Adds RFC 9745 / RFC 8288 lifecycle metadata while the deprecated operation
 * remains fully compatible. A Sunset header is intentionally absent until a
 * retirement date has been approved and published.
 */
export function createDeprecationMiddleware(
  deprecations: readonly ApiDeprecation[] = deprecatedOperations,
): RequestHandler {
  validateDeprecations(deprecations);

  return (request, response, next) => {
    const deprecation = deprecations.find((candidate) => {
      return (
        candidate.method === request.method &&
        matchesPath(request.path, candidate.path) !== undefined
      );
    });
    if (!deprecation) return next();

    const parameters = matchesPath(request.path, deprecation.path)!;
    const successor = replacementUrl(deprecation.replacementPath, parameters, request.originalUrl);
    response.setHeader('Deprecation', '?1');
    response.setHeader('Link', `<${successor}>; rel="successor-version"`);
    next();
  };
}

export const apiDeprecationMiddleware = createDeprecationMiddleware();
