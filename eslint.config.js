// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
    plugins: {
      jest: require('eslint-plugin-jest'),
    },
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
      },
    },
    rules: {
      // Example: allow devDependencies in test files
      'import/no-extraneous-dependencies': ['error', { devDependencies: ['**/*.test.ts', '**/*.test.tsx'] }],
    },
  },
]);
