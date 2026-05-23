import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['server/**/*.{test,spec}.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['server/**/*.js'],
      exclude: [
        'server/**/*.{test,spec}.js',
        'server/**/__tests__/**',
        'server/index.js', // listen() side-effect; refactor to factory before unit-testing
      ],
    },
    testTimeout: 10_000,
  },
});
