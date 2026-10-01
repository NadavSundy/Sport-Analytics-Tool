import { describe, expect, it } from 'vitest';

import {
  loadDatabaseStatementTimeoutMs,
  loadEnvironment,
  warnAboutOptionalConfiguration,
} from '../../src/config/env';

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

  it('validates bounded anonymous-read policy configuration', () => {
    const environment = loadEnvironment({
      ...requiredEnvironment,
      ANONYMOUS_RATE_LIMIT_SECRET: 'a'.repeat(32),
      ANONYMOUS_RATE_LIMIT_PER_MINUTE: '30',
      ANONYMOUS_GLOBAL_RATE_LIMIT_PER_MINUTE: '600',
      TRUST_PROXY_HOPS: '1',
    });

    expect(environment).toMatchObject({
      ANONYMOUS_RATE_LIMIT_SECRET: 'a'.repeat(32),
      ANONYMOUS_RATE_LIMIT_PER_MINUTE: 30,
      ANONYMOUS_GLOBAL_RATE_LIMIT_PER_MINUTE: 600,
      TRUST_PROXY_HOPS: 1,
    });
    expect(() =>
      loadEnvironment({
        ...requiredEnvironment,
        ANONYMOUS_RATE_LIMIT_PER_MINUTE: '60',
      }),
    ).toThrow(/ANONYMOUS_RATE_LIMIT_PER_MINUTE/);
  });

  it('requires a server-held anonymous source-key secret in production', () => {
    expect(() =>
      loadEnvironment({
        ...requiredEnvironment,
        NODE_ENV: 'production',
        OBJECT_STORAGE_PROVIDER: 'azure',
        AZURE_STORAGE_ACCOUNT_NAME: 'statsthegameblobdev',
        AZURE_STORAGE_CONTAINER_NAME: 'staged-ingestion',
        AZURE_STORAGE_RELEASE_CONTAINER_NAME: 'dataset-releases',
        DEPLOYMENT_ENVIRONMENT: 'dev',
      }),
    ).toThrow(/ANONYMOUS_RATE_LIMIT_SECRET/);
  });

  it('requires the Azure storage account in production', () => {
    expect(() =>
      loadEnvironment({
        ...requiredEnvironment,
        NODE_ENV: 'production',
        ANONYMOUS_RATE_LIMIT_SECRET: 'a'.repeat(32),
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
        ANONYMOUS_RATE_LIMIT_SECRET: 'a'.repeat(32),
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
        ANONYMOUS_RATE_LIMIT_SECRET: 'a'.repeat(32),
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
        ANONYMOUS_RATE_LIMIT_SECRET: 'a'.repeat(32),
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
      DEPLOYMENT_ENVIRONMENT: 'dev',
      ANONYMOUS_RATE_LIMIT_SECRET: 'a'.repeat(32),
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

describe('database statement timeout configuration', () => {
  it('defaults to fifteen seconds when unset', () => {
    expect(loadEnvironment(requiredEnvironment).DATABASE_STATEMENT_TIMEOUT_MS).toBe(15_000);
    expect(loadDatabaseStatementTimeoutMs({})).toBe(15_000);
  });

  it('accepts a configured value through both entry points', () => {
    const source = { ...requiredEnvironment, DATABASE_STATEMENT_TIMEOUT_MS: '30000' };

    expect(loadEnvironment(source).DATABASE_STATEMENT_TIMEOUT_MS).toBe(30_000);
    expect(loadDatabaseStatementTimeoutMs(source)).toBe(30_000);
  });

  it('accepts the declared bounds', () => {
    expect(loadDatabaseStatementTimeoutMs({ DATABASE_STATEMENT_TIMEOUT_MS: '1000' })).toBe(1_000);
    expect(loadDatabaseStatementTimeoutMs({ DATABASE_STATEMENT_TIMEOUT_MS: '120000' })).toBe(
      120_000,
    );
  });

  // Below the floor the bound would cancel ordinary work, and zero would be
  // omitted from the connection handshake altogether, leaving no bound at all.
  it('rejects a value below the floor, including zero', () => {
    for (const value of ['0', '999', '-1']) {
      expect(() =>
        loadEnvironment({ ...requiredEnvironment, DATABASE_STATEMENT_TIMEOUT_MS: value }),
      ).toThrow('DATABASE_STATEMENT_TIMEOUT_MS');
      expect(() =>
        loadDatabaseStatementTimeoutMs({ DATABASE_STATEMENT_TIMEOUT_MS: value }),
      ).toThrow('DATABASE_STATEMENT_TIMEOUT_MS');
    }
  });

  it('rejects a value above the ceiling, so the bound cannot be configured away', () => {
    expect(() =>
      loadEnvironment({ ...requiredEnvironment, DATABASE_STATEMENT_TIMEOUT_MS: '120001' }),
    ).toThrow('DATABASE_STATEMENT_TIMEOUT_MS');
  });

  it('rejects a non-integer and a non-numeric value', () => {
    for (const value of ['1500.5', 'soon', '']) {
      expect(() =>
        loadEnvironment({ ...requiredEnvironment, DATABASE_STATEMENT_TIMEOUT_MS: value }),
      ).toThrow('DATABASE_STATEMENT_TIMEOUT_MS');
    }
  });
});

describe('language-model provider configuration', () => {
  /** A deployable production environment, carrying no language-model key. */
  const productionEnvironmentWithoutKey = {
    ...requiredEnvironment,
    NODE_ENV: 'production',
    DEPLOYMENT_ENVIRONMENT: 'dev',
    OBJECT_STORAGE_PROVIDER: 'azure',
    AZURE_STORAGE_ACCOUNT_NAME: 'statsthegameblobdev',
    AZURE_STORAGE_CONTAINER_NAME: 'staged-ingestion',
    AZURE_STORAGE_RELEASE_CONTAINER_NAME: 'dataset-releases',
    ANONYMOUS_RATE_LIMIT_SECRET: 'a'.repeat(32),
  };

  it('starts without a language-model key', () => {
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

  // Natural-language querying is one optional feature. A missing key must disable
  // it and nothing else, so production must still start without one.
  it('starts in production without a language-model key', () => {
    const environment = loadEnvironment(productionEnvironmentWithoutKey);

    expect(environment.LLM_API_KEY).toBeUndefined();
    expect(environment.NODE_ENV).toBe('production');
  });

  it('accepts a configured key', () => {
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

describe('optional configuration warnings', () => {
  it('reports a missing language-model key once, naming only the variable', () => {
    const messages: string[] = [];

    warnAboutOptionalConfiguration(loadEnvironment(requiredEnvironment), (message) =>
      messages.push(message),
    );

    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('LLM_API_KEY');
    expect(messages[0]).toContain('disabled');
  });

  it('says nothing when the language-model key is configured', () => {
    const messages: string[] = [];

    warnAboutOptionalConfiguration(
      loadEnvironment({ ...requiredEnvironment, LLM_API_KEY: 'test-placeholder-not-a-real-key' }),
      (message) => messages.push(message),
    );

    expect(messages).toEqual([]);
  });

  // The warning exists so an operator learns the feature is off. It must never
  // become a way for key material to reach a log.
  it('never logs the configured key', () => {
    const messages: string[] = [];
    const key = 'test-placeholder-not-a-real-key';

    warnAboutOptionalConfiguration(
      loadEnvironment({ ...requiredEnvironment, LLM_API_KEY: key }),
      (message) => messages.push(message),
    );
    warnAboutOptionalConfiguration(loadEnvironment(requiredEnvironment), (message) =>
      messages.push(message),
    );

    expect(messages.join(' ')).not.toContain(key);
  });
});
