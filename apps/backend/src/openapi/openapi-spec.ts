import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const OPENAPI_FILENAME = 'openapi.yaml';

export function resolveOpenApiSpecificationPath(currentDirectory = __dirname): string {
  const bundledSpecificationPath = path.resolve(currentDirectory, '..', OPENAPI_FILENAME);

  if (existsSync(bundledSpecificationPath)) {
    return bundledSpecificationPath;
  }

  const repositorySpecificationPath = path.resolve(
    currentDirectory,
    '..',
    '..',
    '..',
    '..',
    'docs',
    'api',
    OPENAPI_FILENAME,
  );

  if (existsSync(repositorySpecificationPath)) {
    return repositorySpecificationPath;
  }

  throw new Error(
    'OpenAPI specification is unavailable. Expected the backend build to contain openapi.yaml or the repository source at docs/api/openapi.yaml.',
  );
}

export function loadOpenApiSpecification(): string {
  return readFileSync(resolveOpenApiSpecificationPath(), 'utf8');
}
