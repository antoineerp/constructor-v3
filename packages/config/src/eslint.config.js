import js from '@eslint/js';
import globals from 'globals';
import * as ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import tailwind from 'eslint-plugin-tailwindcss';
import importPlugin from 'eslint-plugin-import';
import unusedImports from 'eslint-plugin-unused-imports';

export default [
  { files: ['**/*.{js,cjs,mjs,ts,svelte}'], ignores: ['node_modules/**','dist/**','build/**','.svelte-kit/**','.vercel/**','.output/**','coverage/**'] },
  js.configs.recommended,
  ...ts.configs.recommendedTypeChecked.map(c => ({
    ...c,
    languageOptions: {
      ...c.languageOptions,
      parserOptions: { ...c.languageOptions?.parserOptions, projectService: true, tsconfigRootDir: import.meta.dirname }
    }
  })),
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
      'import/order': ['warn', { 'newlines-between': 'always', groups: ['builtin','external','internal','parent','sibling','index'], alphabetize: { order: 'asc', caseInsensitive: true } }],
      'import/no-unresolved': 'off',
      'tailwindcss/classnames-order': 'warn',
      'tailwindcss/no-custom-classname': 'off',
      'svelte/no-at-html-tags': 'warn'
    }
  },
  { files: ['**/*.svelte'], rules: { 'unused-imports/no-unused-vars': ['warn', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }] } }
];
