import js from '@eslint/js';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.replit/**',
      'playwright-report/**',
      'test-results/**',
      '*.config.js',
      '*.config.ts',
      'vite.config.ts',
      'vitest.config.ts',
      'tailwind.config.ts',
      'postcss.config.js',
      'drizzle.config.ts',
      'playwright.config.ts',
    ],
  },

  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      'import': importPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...typescriptEslint.configs.recommended.rules,

      'no-console': ['error', {
        allow: ['warn', 'error']
      }],

      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      'import/order': ['error', {
        'groups': [
          'builtin',
          'external',
          'internal',
          ['parent', 'sibling', 'index']
        ],
        'newlines-between': 'never',
        'alphabetize': {
          order: 'asc',
          caseInsensitive: true,
        },
      }],
    },
  },

  {
    files: ['client/src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        FormData: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        Image: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        setInterval: 'readonly',
        setTimeout: 'readonly',
        clearInterval: 'readonly',
        clearTimeout: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
      'import': importPlugin,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...jsxA11yPlugin.configs.recommended.rules,

      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',

      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/alt-text': 'error',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },

  {
    files: ['server/**/*.ts', 'shared/**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      'import': importPlugin,
    },
    rules: {
      'no-console': ['error', {
        allow: ['warn', 'error']
      }],
    },
  },

  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', 'tests/**/*.{ts,tsx}', 'server/__tests__/**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        describe: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        afterAll: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
        vitest: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
