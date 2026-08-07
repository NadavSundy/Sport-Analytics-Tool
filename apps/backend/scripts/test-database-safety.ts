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

  if (developmentDatabaseUrl && testDatabaseUrl === developmentDatabaseUrl) {
    throw new Error('DATABASE_URL_TEST must not match DATABASE_URL.');
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(testDatabaseUrl);
  } catch {
    throw new Error('DATABASE_URL_TEST must be a valid URL.');
  }

  if (parsedUrl.protocol !== 'postgres:' && parsedUrl.protocol !== 'postgresql:') {
    throw new Error('DATABASE_URL_TEST must use the PostgreSQL protocol.');
  }

  const databaseName = parsedUrl.pathname.replace(/^\//, '').toLowerCase();

  if (!databaseName.includes('test')) {
    throw new Error('The test database name must contain "test".');
  }

  return parsedUrl;
}
