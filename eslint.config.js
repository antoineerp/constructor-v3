import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs['flat/recommended'],
  prettier,
    // Règles et globals communs
    {
      files: ['**/*.js','**/*.ts','**/*.svelte'],
      languageOptions: {
        globals: {
          process: 'readonly',
          console: 'readonly',
          TextEncoder: 'readonly',
          require: 'readonly'
        }
      },
      ignores: [
        '**/.svelte-kit/**',
        '**/dist/**',
        '**/build/**',
        '**/node_modules/**',
        '**/storybook-static/**'
      ],
      rules: {
        'no-console': ['warn', { allow: ['warn','error'] }],
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-require-imports': 'off'
      }
    }
];
