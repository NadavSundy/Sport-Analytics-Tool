import { copyFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(scriptPath), '..', '..', '..');

export function getOpenApiPackagingPaths(root = repositoryRoot) {
  return {
    sourcePath: path.join(root, 'docs', 'api', 'openapi.yaml'),
    destinationPath: path.join(root, 'apps', 'backend', 'dist', 'openapi.yaml'),
  };
}

export async function copyOpenApiSpecification(root = repositoryRoot) {
  const { sourcePath, destinationPath } = getOpenApiPackagingPaths(root);

  await mkdir(path.dirname(destinationPath), { recursive: true });
  await copyFile(sourcePath, destinationPath);

  const [sourceBytes, destinationBytes] = await Promise.all([
    readFile(sourcePath),
    readFile(destinationPath),
  ]);

  if (!sourceBytes.equals(destinationBytes)) {
    throw new Error('Bundled OpenAPI specification does not match docs/api/openapi.yaml.');
  }

  return { sourcePath, destinationPath };
}

const executedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';

if (executedPath === path.resolve(scriptPath)) {
  const { sourcePath, destinationPath } = await copyOpenApiSpecification();
  console.log(
    `Bundled ${path.relative(repositoryRoot, sourcePath)} -> ${path.relative(
      repositoryRoot,
      destinationPath,
    )}.`,
  );
}
