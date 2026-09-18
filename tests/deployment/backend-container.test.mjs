import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dockerfilePath = path.join(repositoryRoot, 'apps', 'backend', 'Dockerfile');

test('backend container build preserves the production runtime contract', async () => {
  await assert.doesNotReject(access(dockerfilePath), 'backend Dockerfile must exist');

  const dockerfile = await readFile(dockerfilePath, 'utf8');

  assert.match(dockerfile, /^FROM node:22-bookworm-slim AS build$/m);
  assert.match(dockerfile, /^FROM node:22-bookworm-slim AS runtime$/m);
  assert.match(dockerfile, /npm ci[\s\S]*--workspace=@sport-analytics\/backend/);
  assert.match(dockerfile, /npm run build --workspace=@sport-analytics\/backend/);
  assert.match(dockerfile, /npm prune --omit=dev/);
  assert.match(dockerfile, /apps\/backend\/certs/);

  for (const workspace of ['contracts', 'batch-processing', 'object-storage']) {
    assert.match(
      dockerfile,
      new RegExp(`packages/${workspace}/dist`),
      `runtime image must contain compiled ${workspace} workspace output`,
    );
  }

  assert.match(dockerfile, /^ENV NODE_ENV=production$/m);
  assert.match(dockerfile, /^USER node$/m);
  assert.match(dockerfile, /^EXPOSE 3000$/m);
  assert.match(dockerfile, /\/api\/v1\/health/);
  assert.match(
    dockerfile,
    /CMD \["node", "apps\/backend\/dist\/index\.js"\]/,
    'container must invoke the existing compiled backend production entrypoint directly',
  );
  assert.doesNotMatch(dockerfile, /COPY .*\.env/i, 'container must not copy environment files');
  assert.doesNotMatch(dockerfile, /COPY .*\.git/i, 'container must not copy Git metadata');
});
