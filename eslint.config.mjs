import cds from '@sap/cds/eslint.config.mjs';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['dist/**', 'gen/**', 'node_modules/**', '@cds-models/**', 'tests/sample/**'],
  },
  ...cds,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      'no-await-in-loop': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['tests/**'],
    rules: {
      'no-console': 'off',
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-redeclare': 'off',
    },
  },
];
