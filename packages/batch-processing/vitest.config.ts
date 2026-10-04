import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['dist/**'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'dist/**',
        'src/**/*.{test,spec}.ts',
        'src/**/{test,tests}/**',
        'src/**/{fixtures,mocks}/**',
        'src/**/generated/**',
        'src/**/*.generated.ts',
        'src/**/*.d.ts',
      ],
      reporter: ['text', 'html', 'lcov', 'json', 'json-summary'],
      reportsDirectory: '../../coverage/batch-processing',
    },
  },
});
