import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import importXPlugin from 'eslint-plugin-import-x';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },

  eslint.configs.recommended,

  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.app.json', './tsconfig.server.json', './tsconfig.e2e.json'],
        projectService: false,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },

  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat['jsx-runtime'],
  {
    settings: { react: { version: 'detect' } },
    rules: {
      // TypeScript types the props; AGENTS.md bans dangerouslySetInnerHTML.
      'react/prop-types': 'off',
      'react/no-danger': 'error',
      'react/no-array-index-key': 'error',
    },
  },

  reactHooksPlugin.configs.flat['recommended-latest'],

  jsxA11yPlugin.flatConfigs.strict,

  {
    plugins: { 'import-x': importXPlugin },
    settings: {
      'import-x/resolver-next': [
        importXPlugin.createNodeResolver({
          extensions: ['.ts', '.tsx', '.js', '.mjs'],
        }),
      ],
    },
    rules: {
      'import-x/no-cycle': 'error',
      'import-x/no-duplicates': 'error',
      'import-x/no-self-import': 'error',
    },
  },

  {
    rules: {
      complexity: ['error', 10],
      'max-lines-per-function': ['error', { max: 60, skipBlankLines: true, skipComments: true }],
      'max-depth': ['error', 3],
      'max-params': ['error', 4],
      'no-nested-ternary': 'error',
      'no-console': 'error',
      eqeqeq: 'error',
      curly: 'error',
      'no-empty': 'error',
      'prefer-const': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // Anything that is not a relative path is a package.
              regex: '^[^.]',
              message: 'core may not import from any npm package',
            },
            {
              group: ['src/ui', 'src/ui/**', '../ui/**', '../../ui/**'],
              message: 'core must not import from ui',
            },
            {
              group: ['src/server', 'src/server/**', '../server/**', '../../server/**'],
              message: 'core must not import from server',
            },
          ],
        },
      ],
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['src/ui', 'src/ui/**', '../ui/**', '../../ui/**'],
              message: 'core must not import from ui',
              allowTypeImports: false,
            },
            {
              group: ['src/server', 'src/server/**', '../server/**', '../../server/**'],
              message: 'core must not import from server',
              allowTypeImports: false,
            },
            {
              // shared/limits.ts imports nothing, so its bounds and units may be used as values.
              group: [
                'src/shared',
                'src/shared/**',
                '../shared/**',
                '../../shared/**',
                '!../shared/limits.js',
                '!../../shared/limits.js',
              ],
              message: 'core may only use type-only imports from shared (values: shared/limits.ts)',
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },

  {
    // Tests may import shared schemas to check engine output against the API contract.
    files: ['src/core/**/*.test.ts', 'src/core/fixtures/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-restricted-imports': 'off',
    },
  },

  {
    files: ['src/server/logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },

  {
    // The UI talks to the server over HTTP only; test helpers may run the real app in-process.
    files: ['src/ui/**/*.{ts,tsx}'],
    ignores: ['src/ui/test/**', 'src/ui/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/server/**'],
              message: 'ui must not import from server; call it through src/ui/api/client.ts',
            },
          ],
        },
      ],
    },
  },

  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'e2e/**/*.ts'],
    rules: {
      'max-lines-per-function': 'off',
    },
  },

  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ...tseslint.configs.disableTypeChecked.languageOptions,
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      'no-console': 'off',
    },
  },
);
