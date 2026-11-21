import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          include: [
            'src/core/**/*.test.ts',
            'src/shared/**/*.test.ts',
            'src/server/**/*.test.ts',
            'api/**/*.test.ts',
          ],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'ui',
          include: ['src/ui/**/*.test.ts', 'src/ui/**/*.test.tsx'],
          environment: 'jsdom',
          setupFiles: ['src/ui/test/setup.ts'],
          unstubGlobals: true,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**', 'api/**'],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        'src/ui/main.tsx',
        '**/*.d.ts',
        'src/ui/test/**',
        'src/server/test/**',
        'src/**/fixtures/**',
        '**/*.css',
      ],
      thresholds: {
        lines: 90,
        branches: 90,
        functions: 90,
        statements: 90,
        'src/core/**': {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
      },
    },
  },
});
