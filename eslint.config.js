// ESLint Flat Config pour SvelteKit + Svelte + TypeScript + TailwindCSS
// Référence: ESLint v9 (format flat). Si vous utilisez une version <9, voir alternative legacy plus bas.
// Installation (dev):
//   npm i -D eslint @eslint/js typescript typescript-eslint eslint-plugin-svelte eslint-plugin-tailwindcss eslint-plugin-import eslint-plugin-unused-imports
// Optionnel: prettier eslint-config-prettier
// Assure-toi d'avoir un tsconfig.json (adapter le chemin ci-dessous si nécessaire)

import js from '@eslint/js';
import globals from 'globals';
import * as ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import tailwind from 'eslint-plugin-tailwindcss';
import importPlugin from 'eslint-plugin-import';
import unusedImports from 'eslint-plugin-unused-imports';

export default [
  // Définition des patterns globaux, ignores
  {
    files: ['**/*.{js,cjs,mjs,ts,svelte}'],
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.svelte-kit/**',
      '.vercel/**',
      '.output/**',
      'coverage/**'
    ],
  },

  // Base JS recommended
  js.configs.recommended,

  // TypeScript (type-checked) – si lenteur, remplacer par ...ts.configs.recommended
  ...ts.configs.recommendedTypeChecked.map(c => ({
    ...c,
    languageOptions: {
      ...c.languageOptions,
      parserOptions: {
        ...c.languageOptions?.parserOptions,
        projectService: true,
        // Ajuster ce répertoire si le tsconfig racine est ailleurs
        tsconfigRootDir: import.meta.dirname,
      }
    }
  })),

  // Svelte recommended
  ...svelte.configs['flat/recommended'],

  // Tailwind config (plugin)
  {
    plugins: {
      tailwind,
      import: importPlugin,
      'unused-imports': unusedImports,
    },
    settings: {
      // Pour eslint-plugin-import si monorepo -> ajouter 'node' resolver / tsconfig paths
      'import/resolver': {
        node: { extensions: ['.js', '.cjs', '.mjs', '.ts', '.svelte'] },
        typescript: { alwaysTryTypes: true }
      },
      tailwindcss: {
        callees: ['clsx', 'cva', 'twMerge'],
        config: 'tailwind.config.cjs',
      }
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // Qualité générale
      'no-unused-vars': 'off', // remplacé par unused-imports
      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

      // Imports
      'import/order': ['warn', { 'newlines-between': 'always', groups: ['builtin','external','internal','parent','sibling','index'], alphabetize: { order: 'asc', caseInsensitive: true } }],
      'import/no-unresolved': 'off', // résolu par TS + SvelteKit

      // Tailwind (peut être mis à 'error' quand stable)
      'tailwindcss/classnames-order': 'warn',
      'tailwindcss/no-custom-classname': 'off',

      // Svelte spécifiques (peuvent être durcis)
      'svelte/no-at-html-tags': 'warn'
    }
  },

  // Surcharges spécifiques Svelte (*.svelte)
  {
    files: ['**/*.svelte'],
    rules: {
      // Exemple: autoriser variables non utilisées si prefix '_' dans <script>
      'unused-imports/no-unused-vars': ['warn', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }]
    }
  },

  // Optionnel: compatibilité Prettier (si installé)
  // Désactiver règles qui clashent avec formatteur
  // Ajouter: import prettier from 'eslint-config-prettier'; ... puis pousser prettier à la fin
];

/*
============================================================
 Alternative (legacy .eslintrc.json) si ESLint < 9 :
============================================================
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:svelte/recommended"
  ],
  "plugins": ["tailwindcss","import","unused-imports"],
  "parserOptions": { "ecmaVersion": 2023, "sourceType": "module", "project": ["./tsconfig.json"] },
  "overrides": [
    { "files": ["*.svelte"], "processor": "svelte/svelte" }
  ],
  "rules": {
    "no-unused-vars": "off",
    "unused-imports/no-unused-imports": "warn",
    "unused-imports/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
    "tailwindcss/classnames-order": "warn"
  }
}
*/
// (Fin de la config – la section ci-dessus est la seule exportée)
