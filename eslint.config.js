// ESLint Flat Config pour SvelteKit + Svelte + TypeScript + TailwindCSS
// Référence: ESLint v9 (format flat). Si vous utilisez une version <9, voir alternative legacy plus bas.
// Installation (dev):
//   npm i -D eslint @eslint/js typescript typescript-eslint eslint-plugin-svelte eslint-plugin-tailwindcss eslint-plugin-import eslint-plugin-unused-imports
// Optionnel: prettier eslint-config-prettier
// Assure-toi d'avoir un tsconfig.json (adapter le chemin ci-dessous si nécessaire)

// Réutilise la config partagée du package config pour éviter divergence & problème de chargement plugin
import shared from './packages/config/src/eslint.config.js';

export default [
  // Ajout / overrides globaux spécifiques racine si nécessaire
  ...shared,
  {
    rules: {
      // Exemple override possible: renforcer la règle tailwind si besoin
      // 'tailwindcss/classnames-order': 'warn'
    }
  }
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
