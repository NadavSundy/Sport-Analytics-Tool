import { describe, expect, test } from 'vitest';

import { createTestApp } from '../test-app';
import { createOpenApiContract } from './openapi-contract';

/**
 * Every implemented route is a documented operation, and every documented
 * operation is implemented (issue #609). There is no allowlist: a new route
 * needs an operation in docs/api/openapi.yaml before this test passes.
 */

interface RouterLayer {
  route?: { path: string | string[]; methods: Record<string, boolean> };
  name?: string;
  regexp?: RegExp & { fast_slash?: boolean };
  handle?: { stack?: RouterLayer[] };
}

const HTTP_METHODS = new Set(['get', 'put', 'post', 'delete', 'patch']);
const MOUNT_SUFFIX = String.raw`\/?(?=\/|$)`;

/** The literal prefix of an Express 4 router mount such as `app.use('/api/v1', router)`. */
function mountPrefix(layer: RouterLayer): string {
  if (!layer.regexp || layer.regexp.fast_slash) return '';
  const source = layer.regexp.source;
  if (!source.startsWith('^') || !source.endsWith(MOUNT_SUFFIX)) {
    throw new Error(`Unsupported router mount pattern: ${source}`);
  }
  return source
    .slice(1, -MOUNT_SUFFIX.length)
    .split(String.raw`\/`)
    .join('/');
}

/** Express path parameters as OpenAPI templates; a router mounted with `/` has no trailing slash. */
function normalise(path: string): string {
  const template = path.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
  return template.length > 1 ? template.replace(/\/$/, '') : template;
}

function implementedRoutes(stack: RouterLayer[], prefix = ''): string[] {
  return stack.flatMap((layer) => {
    if (layer.route) {
      const paths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
      return Object.keys(layer.route.methods)
        .filter((method) => HTTP_METHODS.has(method))
        .flatMap((method) =>
          paths.map((path) => `${method.toUpperCase()} ${normalise(`${prefix}${path}`)}`),
        );
    }
    if (layer.name === 'router' && layer.handle?.stack) {
      return implementedRoutes(layer.handle.stack, prefix + mountPrefix(layer));
    }
    return [];
  });
}

describe('OpenAPI route inventory', () => {
  const contract = createOpenApiContract();
  const app = createTestApp() as unknown as { _router: { stack: RouterLayer[] } };
  const routes = implementedRoutes(app._router.stack);

  test('reads the implemented routes from the application', () => {
    expect(routes.length).toBeGreaterThan(50);
    expect(routes).toContain('GET /api/v1/health');
  });

  test('documents every implemented route', () => {
    const undocumented = routes.filter((route) => {
      const [method, path] = route.split(' ') as [string, string];
      const operation = contract.findOperation(method, path);
      return operation === undefined || operation.template !== path;
    });

    expect(undocumented, 'Implemented routes missing from docs/api/openapi.yaml').toEqual([]);
  });

  test('implements every documented operation', () => {
    const implemented = new Set(routes);
    const unimplemented = contract.operations().filter((operation) => !implemented.has(operation));

    expect(unimplemented, 'Documented operations with no implemented route').toEqual([]);
  });
});
