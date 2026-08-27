/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular-dependencies',
      comment: 'Keep the application and shared-contract dependency graph acyclic.',
      severity: 'error',
      from: {
        path: '^(apps|packages)/',
      },
      to: {
        circular: true,
      },
    },
    {
      name: 'frontend-must-not-import-backend',
      comment:
        'The frontend communicates with the backend through the documented HTTP API, not source imports.',
      severity: 'error',
      from: {
        path: '^apps/frontend/',
      },
      to: {
        path: '^apps/backend/',
      },
    },
    {
      name: 'backend-must-not-import-frontend',
      comment:
        'The backend is independently deployable and must not depend on frontend source code.',
      severity: 'error',
      from: {
        path: '^apps/backend/',
      },
      to: {
        path: '^apps/frontend/',
      },
    },
    {
      name: 'contracts-must-not-import-applications',
      comment:
        'Shared contracts contain schemas and types and may be consumed by applications, but must not depend on them.',
      severity: 'error',
      from: {
        path: '^packages/contracts/',
      },
      to: {
        path: '^apps/',
      },
    },
  ],
  options: {
    tsPreCompilationDeps: true,
    combinedDependencies: true,
    skipAnalysisNotInRules: true,
    doNotFollow: {
      path: 'node_modules',
    },
  },
};
