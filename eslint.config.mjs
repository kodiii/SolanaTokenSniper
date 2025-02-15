export default [
  {
    ignores: ['dist/*', 'coverage/*'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.mjs'],
    languageOptions: {
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': '@typescript-eslint/eslint-plugin',
    },
    rules: {
      // No require() in ESM files
      '@typescript-eslint/no-var-requires': 'error',
      'no-undef': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Allow require() in CommonJS files
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
    },
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
];