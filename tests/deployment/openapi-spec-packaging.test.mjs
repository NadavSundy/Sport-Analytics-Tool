import assert from 'node:assert/strict';
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('backend build packages the authoritative OpenAPI source into the deployed dist tree', async (t) => {
  const backendPackagePath = path.join(repositoryRoot, 'apps', 'backend', 'package.json');
  const backendPackage = JSON.parse(await readFile(backendPackagePath, 'utf8'));

  assert.match(
    backendPackage.scripts.build,
    /copy-openapi-spec\.mjs/,
    'the backend build must bundle the version-controlled OpenAPI specification',
  );

  const copyScriptPath = path.join(
    repositoryRoot,
    'apps',
    'backend',
    'scripts',
    'copy-openapi-spec.mjs',
  );
  await assert.doesNotReject(
    access(copyScriptPath),
    'the backend OpenAPI packaging helper must exist',
  );

  const { copyOpenApiSpecification } = await import(pathToFileURL(copyScriptPath).href);
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'sport-analytics-openapi-'));
  t.after(async () => {
    await rm(temporaryRoot, { recursive: true, force: true });
  });

  const sourcePath = path.join(temporaryRoot, 'docs', 'api', 'openapi.yaml');
  await mkdir(path.dirname(sourcePath), { recursive: true });
  const expected = 'openapi: 3.1.0\ninfo:\n  title: Sport Analytics API\n';
  await writeFile(sourcePath, expected, 'utf8');

  const copied = await copyOpenApiSpecification(temporaryRoot);
  assert.equal(copied.sourcePath, sourcePath);
  assert.equal(
    copied.destinationPath,
    path.join(temporaryRoot, 'apps', 'backend', 'dist', 'openapi.yaml'),
  );
  assert.equal(await readFile(copied.destinationPath, 'utf8'), expected);

  const deploymentScript = await readFile(
    path.join(repositoryRoot, 'scripts', 'prepare-backend-deployment.mjs'),
    'utf8',
  );
  assert.match(
    deploymentScript,
    /['"]apps\/backend\/dist['"]/,
    'the Azure deployment artifact must continue to include the complete backend dist directory',
  );
});
