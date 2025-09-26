/* ESLint config pour Svelte + TS + Prettier */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:svelte/recommended',
    'prettier'
  ],
  plugins: ['svelte','@typescript-eslint'],
  ignorePatterns: ['dist','build','.svelte-kit','node_modules'],
  overrides:[
    {
      files:['*.svelte'],
      parser: 'svelte-eslint-parser',
      parserOptions:{
        parser: '@typescript-eslint/parser'
      }
    }
  ],
  rules:{
    'no-console': ['warn', { allow: ['error','warn'] }],
    '@typescript-eslint/no-explicit-any': 'off'
  }
};
