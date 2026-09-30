import { describe, expect, it } from 'vitest';

import { loadDatabaseStatementTimeoutMs, loadEnvironment } from '../../src/config/env';

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
