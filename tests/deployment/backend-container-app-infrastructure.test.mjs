import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const infrastructurePath = path.join(repositoryRoot, 'infra', 'azure', 'backend', 'main.bicep');

test('backend Container Apps infrastructure reuses shared resources and isolates identities', async () => {
  await assert.doesNotReject(access(infrastructurePath), 'backend Bicep must exist');

  const infrastructure = await readFile(infrastructurePath, 'utf8');

  assert.match(infrastructure, /resource containerEnvironment .* existing =/);
  assert.match(infrastructure, /resource registry .* existing =/);
  assert.match(infrastructure, /resource existingStorage .* existing =/);
  assert.match(infrastructure, /resource existingKeyVault .* existing =/);
  assert.match(infrastructure, /name: '\$\{suffix\}-api-runtime'/);
  assert.match(infrastructure, /name: '\$\{suffix\}-api-pull'/);
  assert.match(infrastructure, /registries: \[[\s\S]*identity: pullIdentity\.id/);
  assert.match(infrastructure, /roleDefinitionId: acrPullRoleId/);
});

test('backend Container Apps infrastructure configures safe API ingress, capacity and health probes', async () => {
  const infrastructure = await readFile(infrastructurePath, 'utf8');

  assert.match(infrastructure, /activeRevisionsMode: 'Single'/);
  assert.match(infrastructure, /external: true/);
  assert.match(infrastructure, /allowInsecure: false/);
  assert.match(infrastructure, /targetPort: 3000/);
  assert.match(infrastructure, /resources: \{ cpu: json\('0\.5'\), memory: '1Gi' \}/);
  assert.match(infrastructure, /minReplicas: minReplicas/);
  assert.match(infrastructure, /maxReplicas: maxReplicas/);
  assert.match(infrastructure, /path: '\/api\/v1\/health'/);
  assert.match(infrastructure, /terminationGracePeriodSeconds: 30/);
});

test('backend Container Apps infrastructure preserves secret and service boundaries', async () => {
  const infrastructure = await readFile(infrastructurePath, 'utf8');

  assert.match(infrastructure, /keyVaultUrl: databaseSecretUri/);
  assert.match(infrastructure, /\{ name: 'DATABASE_URL', secretRef: 'database-url' \}/);
  assert.match(infrastructure, /param supabaseSecretKeySecretUri string/);
  assert.match(
    infrastructure,
    /name: 'supabase-secret-key'[\s\S]*keyVaultUrl: supabaseSecretKeySecretUri[\s\S]*identity: runtimeIdentity\.id/,
  );
  assert.match(
    infrastructure,
    /\{ name: 'SUPABASE_SECRET_KEY', secretRef: 'supabase-secret-key' \}/,
  );
  assert.doesNotMatch(
    infrastructure,
    /\{ name: 'SUPABASE_SECRET_KEY', value:/,
    'the Supabase admin key must never be a plaintext environment value',
  );
  assert.match(
    infrastructure,
    /\{ name: 'AZURE_CLIENT_ID', value: runtimeIdentity\.properties\.clientId \}/,
  );
  assert.match(infrastructure, /roleDefinitionId: blobContributorRoleId/);
  assert.match(infrastructure, /scope: existingStorage/);
  assert.doesNotMatch(infrastructure, /(?:ServiceBus|serviceBus|SERVICE_BUS)/);
  assert.doesNotMatch(infrastructure, /Microsoft\.Web\/sites|webapp|App Service/i);
  assert.doesNotMatch(
    infrastructure,
    /(?:SharedAccessKey|AccountKey|AZURE_STORAGE_CONNECTION_STRING|AZURE_STORAGE_SAS_TOKEN)/,
  );
});

test('backend Container Apps infrastructure configures the natural-language query limits', async () => {
  const infrastructure = await readFile(infrastructurePath, 'utf8');

  // One hop: Container Apps appends the caller's address to any X-Forwarded-For
  // the caller sent, and the count is read from the right. A larger count would
  // reach into the caller-supplied part of the header, and the per-client limits
  // would be bypassable by sending one.
  assert.match(infrastructure, /\{ name: 'TRUSTED_PROXY_HOP_COUNT', value: '1' \}/);
  assert.match(
    infrastructure,
    /\{ name: 'NL_QUERY_RATE_LIMIT_PER_MINUTE', value: string\(nlQueryRateLimitPerMinute\) \}/,
  );
  assert.match(
    infrastructure,
    /\{ name: 'NL_QUERY_DAILY_QUOTA_PER_CLIENT', value: string\(nlQueryDailyQuotaPerClient\) \}/,
  );
  assert.match(
    infrastructure,
    /\{ name: 'NL_QUERY_GLOBAL_DAILY_LIMIT', value: string\(nlQueryGlobalDailyLimit\) \}/,
  );
});

// Issue #831: a required parameter added without a matching argument in the
// deployment workflow fails every backend deploy. The limits are therefore
// declared with defaults, so the template keeps the same required parameters.
test('backend Container Apps infrastructure requires no parameter the deployment does not pass', async () => {
  const infrastructure = await readFile(infrastructurePath, 'utf8');

  const withoutDefault = [...infrastructure.matchAll(/^param (\w+) [^=\n]+$/gm)].map(
    ([, name]) => name,
  );

  assert.deepEqual(withoutDefault.sort(), [
    'containerImage',
    'corsOrigins',
    'databaseSecretUri',
    'llmApiKeySecretUri',
    'supabasePublishableKey',
    'supabaseSecretKeySecretUri',
    'supabaseUrl',
  ]);
});
