function normaliseHost(hostname: string): string {
  const host = hostname.toLowerCase();

  if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1') {
    return 'localhost';
  }

  return host;
}

function databaseIdentity(databaseUrl: URL): string {
  const host = normaliseHost(databaseUrl.hostname);
  const port = databaseUrl.port || '5432';
  const databaseName = decodeURIComponent(databaseUrl.pathname.replace(/^\//, '')).toLowerCase();

  return `${host}:${port}/${databaseName}`;
}

export function assertSafeTestDatabase(
  testDatabaseUrl: string | undefined,
  developmentDatabaseUrl: string | undefined,
  nodeEnvironment: string | undefined,
): URL {
  if (nodeEnvironment !== 'test') {
    throw new Error('Test database commands require NODE_ENV=test.');
  }

  if (!testDatabaseUrl) {
    throw new Error('DATABASE_URL_TEST is required.');
  }

  let parsedTestUrl: URL;

  try {
    parsedTestUrl = new URL(testDatabaseUrl);
  } catch {
    throw new Error('DATABASE_URL_TEST must be a valid URL.');
  }

  if (parsedTestUrl.protocol !== 'postgres:' && parsedTestUrl.protocol !== 'postgresql:') {
    throw new Error('DATABASE_URL_TEST must use the PostgreSQL protocol.');
  }

  const databaseName = decodeURIComponent(parsedTestUrl.pathname.replace(/^\//, '')).toLowerCase();

  if (!/(^|[_-])test($|[_-])/.test(databaseName)) {
    throw new Error('The test database name must contain "test" as a distinct name segment.');
  }

  if (developmentDatabaseUrl) {
    let parsedDevelopmentUrl: URL;

    try {
      parsedDevelopmentUrl = new URL(developmentDatabaseUrl);
    } catch {
      throw new Error('DATABASE_URL must be a valid URL when provided.');
    }

    if (
      (parsedDevelopmentUrl.protocol === 'postgres:' ||
        parsedDevelopmentUrl.protocol === 'postgresql:') &&
      databaseIdentity(parsedTestUrl) === databaseIdentity(parsedDevelopmentUrl)
    ) {
      throw new Error('DATABASE_URL_TEST must not target the same database as DATABASE_URL.');
    }
  }

  return parsedTestUrl;
}
