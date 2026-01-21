import { fixupPluginRules } from '@eslint/compat';
import nextVitals from 'eslint-config-next/core-web-vitals'
import prettierPlugin from 'eslint-plugin-prettier';

const eslintConfig = [
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  {
    ignores: [
      // Default ignores of eslint-config-next:
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
    ],
  },
  {
    plugins: {
      prettier: fixupPluginRules(prettierPlugin),
    },
    rules: {
      'import/order': [
        'error',
        {
          'newlines-between': 'never',
          alphabetize: {
            order: 'asc',
            caseInsensitive: false,
          },
          // Enforce a specific import order
          groups: ['external', 'builtin', 'parent', 'sibling', 'index', 'object', 'type', 'unknown'],
          pathGroups: [
            {
              pattern: 'react',
              group: 'external',
              position: 'before',
            },
            {
              pattern: 'next',
              group: 'external',
              position: 'before',
            },
            {
              pattern: 'next/**',
              group: 'external',
              position: 'before',
            },
            {
              pattern: '~/assets/**',
              group: 'unknown',
              position: 'after',
            },
            {
              pattern: '~/**',
              group: 'parent',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['react'],
        },
      ],
      // Prettier plugin to apply formatting rules
      'prettier/prettier': 'error', // This tells ESLint to show Prettier errors as ESLint errors
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
    },
  }
];
 
export default eslintConfig


