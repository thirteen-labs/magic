// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // eslint-plugin-import can't parse react-native's `exports` map (it uses
    // `null` targets). Metro always provides the module, so skip it here.
    rules: {
      'import/no-unresolved': ['error', { ignore: ['^react-native$'] }],
    },
  },
]);
