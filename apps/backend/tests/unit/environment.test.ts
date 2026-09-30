import { describe, expect, it } from 'vitest';

import { loadEnvironment } from '../../src/config/env';

const requiredEnvironment = {
  NODE_ENV: 'test',
  SUPABASE_URL: 'https://test-project.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
};

describe('backend environment', () => {
  it('starts without elevated Supabase access', () => {
    expect(loadEnvironment(requiredEnvironment).SUPABASE_SECRET_KEY).toBeUndefined();
  });

  it('accepts an optional server-only Supabase secret for account deletion', () => {
    expect(
      loadEnvironment({
        ...requiredEnvironment,
        SUPABASE_SECRET_KEY: 'test-server-only-secret-key',
      }).SUPABASE_SECRET_KEY,
    ).toBe('test-server-only-secret-key');
  });

  it('treats an empty optional Supabase secret as unavailable', () => {
    expect(
      loadEnvironment({
        ...requiredEnvironment,
        SUPABASE_SECRET_KEY: '   ',
      }).SUPABASE_SECRET_KEY,
    ).toBeUndefined();
  });

  it('requires the Azure storage account in production', () => {
    expect(() =>
      loadEnvironment({
        ...requiredEnvironment,
        NODE_ENV: 'production',
        OBJECT_STORAGE_PROVIDER: 'azure',
        AZURE_STORAGE_CONTAINER_NAME: 'staged-ingestion',
        AZURE_STORAGE_RELEASE_CONTAINER_NAME: 'dataset-releases',
        DEPLOYMENT_ENVIRONMENT: 'dev',
      }),
    ).toThrow(
      'Invalid environment configuration: AZURE_STORAGE_ACCOUNT_NAME: Azure storage account name is required for the Azure provider',
    );
  });

  it('requires the Azure storage container in production', () => {
    expect(() =>
      loadEnvironment({
        ...requiredEnvironment,
        NODE_ENV: 'production',
        OBJECT_STORAGE_PROVIDER: 'azure',
        AZURE_STORAGE_ACCOUNT_NAME: 'statsthegameblobdev',
        AZURE_STORAGE_RELEASE_CONTAINER_NAME: 'dataset-releases',
        DEPLOYMENT_ENVIRONMENT: 'dev',
      }),
    ).toThrow(
      'Invalid environment configuration: AZURE_STORAGE_CONTAINER_NAME: Azure storage container name is required for the Azure provider',
    );
  });

  it('requires an explicit object-storage provider in production', () => {
    expect(() =>
      loadEnvironment({
        ...requiredEnvironment,
        NODE_ENV: 'production',
        AZURE_STORAGE_ACCOUNT_NAME: 'statsthegameblobdev',
        AZURE_STORAGE_CONTAINER_NAME: 'staged-ingestion',
        DEPLOYMENT_ENVIRONMENT: 'dev',
      }),
    ).toThrow(
      'Invalid environment configuration: OBJECT_STORAGE_PROVIDER: Object storage provider is required in production',
    );
  });

  it('rejects filesystem object storage in production', () => {
    expect(() =>
      loadEnvironment({
        ...requiredEnvironment,
        NODE_ENV: 'production',
        OBJECT_STORAGE_PROVIDER: 'filesystem',
        OBJECT_STORAGE_FILESYSTEM_ROOT: '.local/object-storage',
      }),
    ).toThrow(
      'Invalid environment configuration: OBJECT_STORAGE_PROVIDER: Production object storage provider must be azure',
    );
  });

  it('requires a root when the filesystem provider is selected', () => {
    expect(() =>
      loadEnvironment({
        ...requiredEnvironment,
        OBJECT_STORAGE_PROVIDER: 'filesystem',
      }),
    ).toThrow(
      'Invalid environment configuration: OBJECT_STORAGE_FILESYSTEM_ROOT: Filesystem object storage root is required for the filesystem provider',
    );
  });

  it('accepts only non-secret Azure object-storage identifiers', () => {
    const environment = loadEnvironment({
      ...requiredEnvironment,
      NODE_ENV: 'production',
      OBJECT_STORAGE_PROVIDER: 'azure',
      AZURE_STORAGE_ACCOUNT_NAME: 'statsthegameblobdev',
      AZURE_STORAGE_CONTAINER_NAME: 'staged-ingestion',
      AZURE_STORAGE_RELEASE_CONTAINER_NAME: 'dataset-releases',
      // Production now also requires the language-model key (issue #814), which
      // this object-storage assertion has to satisfy to reach production at all.
      LLM_API_KEY: 'test-placeholder-not-a-real-key',
      DEPLOYMENT_ENVIRONMENT: 'dev',
      AZURE_STORAGE_CONNECTION_STRING: 'unsupported',
      AZURE_STORAGE_ACCOUNT_KEY: 'unsupported',
      AZURE_STORAGE_SAS_TOKEN: 'unsupported',
    });

    expect(environment.AZURE_STORAGE_ACCOUNT_NAME).toBe('statsthegameblobdev');
    expect(environment.AZURE_STORAGE_CONTAINER_NAME).toBe('staged-ingestion');
    expect(environment).not.toHaveProperty('AZURE_STORAGE_CONNECTION_STRING');
    expect(environment).not.toHaveProperty('AZURE_STORAGE_ACCOUNT_KEY');
    expect(environment).not.toHaveProperty('AZURE_STORAGE_SAS_TOKEN');
  });
});

describe('language-model provider configuration', () => {
  /** A deployable production environment in every respect except the key. */
  const productionEnvironmentWithoutKey = {
    ...requiredEnvironment,
    NODE_ENV: 'production',
    DEPLOYMENT_ENVIRONMENT: 'dev',
    OBJECT_STORAGE_PROVIDER: 'azure',
    AZURE_STORAGE_ACCOUNT_NAME: 'statsthegameblobdev',
    AZURE_STORAGE_CONTAINER_NAME: 'staged-ingestion',
    AZURE_STORAGE_RELEASE_CONTAINER_NAME: 'dataset-releases',
  };

  it('starts without a language-model key outside production', () => {
    const environment = loadEnvironment(requiredEnvironment);

    expect(environment.LLM_API_KEY).toBeUndefined();
    expect(environment.LLM_MODEL).toBe('claude-haiku-4-5-20251001');
    expect(environment.LLM_TIMEOUT_MS).toBe(15_000);
  });

  it('treats a blank language-model key as unconfigured', () => {
    expect(
      loadEnvironment({ ...requiredEnvironment, LLM_API_KEY: '   ' }).LLM_API_KEY,
    ).toBeUndefined();
  });

  it('requires a language-model key in production', () => {
    expect(() => loadEnvironment(productionEnvironmentWithoutKey)).toThrow(
      'Invalid environment configuration: LLM_API_KEY: Language-model API key is required in production',
    );
  });

  it('accepts a configured production key', () => {
    expect(
      loadEnvironment({
        ...productionEnvironmentWithoutKey,
        LLM_API_KEY: 'test-placeholder-not-a-real-key',
      }).LLM_API_KEY,
    ).toBe('test-placeholder-not-a-real-key');
  });

  it('accepts a configured model and timeout', () => {
    const environment = loadEnvironment({
      ...requiredEnvironment,
      LLM_MODEL: 'claude-sonnet-5-5',
      LLM_TIMEOUT_MS: '30000',
    });

    expect(environment.LLM_MODEL).toBe('claude-sonnet-5-5');
    expect(environment.LLM_TIMEOUT_MS).toBe(30_000);
  });

  it('accepts the declared timeout bounds', () => {
    for (const [value, expected] of [
      ['2000', 2_000],
      ['60000', 60_000],
    ] as const) {
      expect(
        loadEnvironment({ ...requiredEnvironment, LLM_TIMEOUT_MS: value }).LLM_TIMEOUT_MS,
      ).toBe(expected);
    }
  });

  it('rejects a timeout outside the declared bounds or not a whole number', () => {
    for (const value of ['0', '1999', '60001', '1500.5', 'soon']) {
      expect(() => loadEnvironment({ ...requiredEnvironment, LLM_TIMEOUT_MS: value })).toThrow(
        'LLM_TIMEOUT_MS',
      );
    }
  });

  // The identifier reaches the outbound request body, so it may only be a model
  // identifier and never arbitrary content.
  it('rejects a model identifier outside the permitted character set', () => {
    for (const value of ['Claude Haiku', 'claude/haiku', '../etc/passwd', '']) {
      expect(() => loadEnvironment({ ...requiredEnvironment, LLM_MODEL: value })).toThrow(
        'LLM_MODEL',
      );
    }
  });
});
