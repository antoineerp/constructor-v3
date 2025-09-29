import js from '@eslint/js';
import globals from 'globals';
import * as ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import tailwindPlugin from 'eslint-plugin-tailwindcss';
import importPlugin from 'eslint-plugin-import';
import unusedImports from 'eslint-plugin-unused-imports';

// Le plugin tailwind doit être importé statiquement (pas top-level await) pour ESLint.
const tailwind = tailwindPlugin || { rules: {} };

export default [
  { files: ['**/*.{js,cjs,mjs,ts,svelte}'], ignores: ['node_modules/**','dist/**','build/**','.svelte-kit/**','.vercel/**','.output/**','coverage/**'] },
  js.configs.recommended,
  // Utiliser la variante non type-checked pour éviter l'exigence parserOptions.project en CI (Svelte parser proxy)
  ...ts.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    plugins: { tailwind, import: importPlugin, 'unused-imports': unusedImports },
    settings: {
      'import/resolver': { node: { extensions: ['.js','.cjs','.mjs','.ts','.svelte'] }, typescript: { alwaysTryTypes: true } },
      tailwindcss: { callees: ['clsx','cva','twMerge'], config: 'tailwind.config.cjs' }
    },
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  'import/order': ['warn', { 'newlines-between': 'always', groups: ['builtin','external','internal','parent','sibling','index'], alphabetize: { order: 'asc', caseInsensitive: true }, warnOnUnassignedImports: false }],
  '@typescript-eslint/await-thenable': 'off',
  '@typescript-eslint/no-misused-promises': 'off',
  '@typescript-eslint/require-await': 'off',
  '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-require-imports': 'warn',
      'no-useless-escape': 'warn',
      'no-empty': 'warn',
      'import/no-unresolved': 'off',
      // Règles tailwind temporairement désactivées (plugin non chargé en CI)
      'svelte/no-at-html-tags': 'warn'
    }
  },
  { files: ['**/*.svelte'], rules: { 'unused-imports/no-unused-vars': ['warn', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }] } }
];
