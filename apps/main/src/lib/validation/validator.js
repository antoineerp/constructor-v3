import * as path from 'path';

import { ESLint } from 'eslint';
import prettier from 'prettier';
import { compile } from 'svelte/compiler';

import { toText } from '../utils/to-text.js';
// Charge optionnellement le formatter dédié multi-fichiers (Svelte + Tailwind)
let formatFilesFn = null;
try {
  // On saute complètement le chargement si on est dans Vitest (import.meta.vitest) ou NODE_ENV === 'test'
  const isVitest = typeof import.meta !== 'undefined' && import.meta?.vitest;
  const isTestEnv = process?.env?.NODE_ENV === 'test';
  if(!isVitest && !isTestEnv){
    // Construire la chaîne dynamiquement pour empêcher Vite d'essayer de résoudre l'alias lors de la transformation
    const modPath = '$' + 'tools/format';
    const mod = await import(modPath);
    formatFilesFn = mod.formatFiles;
  }
} catch(_e) { /* ignore absence alias / échec format optionnel */ }

// ESLint singleton (flat config inline) — on ne dépend plus de découverte de fichier ni de fallback.
let eslintInstance; let eslintInitError=null;
async function getEslint() {
  if (eslintInstance || eslintInitError) return eslintInstance;
  try {
    const sveltePlugin = (await import('eslint-plugin-svelte')).default;
    const globalsMod = await import('globals');
    const parser = (await import('svelte-eslint-parser')).default;
    // Flat config interne – empêche la recherche d'un fichier externe
    const baseConfig = [
      {
        name: 'base-js',
        files: ['**/*.{js,ts}'],
        languageOptions: {
          ecmaVersion: 2022,
          sourceType: 'module',
          globals: { ...globalsMod.browser, ...globalsMod.node }
        },
        rules: {
          'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
          'no-undef': 'error'
        }
      },
      {
        name: 'svelte-files',
        files: ['**/*.svelte'],
        plugins: { svelte: sveltePlugin },
        languageOptions: {
          parser,
          parserOptions: { extraFileExtensions: ['.svelte'], ecmaVersion: 2022, sourceType: 'module' },
          globals: { ...globalsMod.browser, ...globalsMod.node }
        },
        rules: {
          'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
          'no-undef': 'error'
        }
      },
      { name: 'ignores', ignores: ['**/dist/**','**/build/**','**/.svelte-kit/**','**/node_modules/**'] }
    ];
    eslintInstance = new ESLint({
      fix: true,
      useFlatConfig: true,
      overrideConfigFile: false,
      overrideConfig: baseConfig
    });
  } catch (e) {
    eslintInitError = e;
    console.error('[validator] ESLint initialisation échouée (lint désactivé):', e.message);
    eslintInstance = null;
  }
  return eslintInstance;
}

function mapSeverity(num) {
  if (num === 2) return 'error';
  if (num === 1) return 'warning';
  return 'info';
}

export async function validateFiles(files) {
  // Filtrer strictement les fichiers Svelte pour compilation/validation
  const svelteFiles = Object.entries(files).filter(([filename]) => filename.endsWith('.svelte'))
    .reduce((acc, [filename, val]) => { acc[filename] = val; return acc; }, {});
  // Pré-formatage global (rapide, parallélisé) avant lint/compile
  if (formatFilesFn) {
    try {
      const { files: formattedAll } = await formatFilesFn(svelteFiles);
      files = formattedAll;
    } catch(e) {
      console.warn('[validator] formatFiles.mjs a échoué (continuation sans pré-format):', e.message);
    }
  } else {
    files = svelteFiles;
  }
  const result = {};
  const eslint = await getEslint();

  for (const [filename, rawVal] of Object.entries(files)) {
    const content = toText(rawVal, filename);
    const ext = path.extname(filename);
    const diagnostics = [];
    let working = content;
    let formatted = content;
    let fixed = null;
    let fixApplied = false;
    let ssrOk = false;
    let domOk = false;

    // ESLint (désactivé pour JSON). Pas de fallback: soit ça marche, soit on log l'erreur réelle.
    if (ext !== '.json' && eslint) {
      try {
        const lintResults = await eslint.lintText(working, { filePath: filename });
        for (const lr of lintResults) {
          if (lr.output && lr.output !== working) {
            working = lr.output;
            fixed = lr.output;
            fixApplied = true;
          }
          if (lr.messages?.length) {
            diagnostics.push(
              ...lr.messages.map(m => ({
                severity: mapSeverity(m.severity),
                rule: m.ruleId || 'unknown',
                message: m.message,
                line: m.line,
                column: m.column,
                source: 'eslint'
              }))
            );
          }
        }
      } catch(e){
        // Cas fréquent: "Could not find config file" → convertir en info & ne pas bloquer
        const msg = e.message || '';
        if(/could not find config file/i.test(msg)){
          diagnostics.push({ severity: 'info', source: 'eslint', message: 'ESLint (flat interne) utilisé – config externe absente (info)' });
        } else {
          diagnostics.push({ severity: 'error', source: 'eslint', message: 'ESLint erreur: ' + msg });
        }
      }
    } else if (ext !== '.json' && !eslint) {
      diagnostics.push({ severity: 'info', source: 'eslint', message: 'Lint non initialisé (ESLint indisponible)' });
    }

    // Prettier format (après auto-fix ESLint)
    if (ext === '.json') {
      // Validation JSON explicite
      try {
        JSON.parse(working);
      } catch(parseErr) {
        diagnostics.push({ severity: 'error', source: 'json-parse', message: 'JSON invalide: ' + parseErr.message });
      }
    }
    try {
      let parser;
      if (ext === '.svelte') parser = 'svelte';
      else if (ext === '.json') parser = 'json';
      else if (ext === '.ts') parser = 'typescript';
      else if (ext === '.css') parser = 'css'; // Important: évite interprétation décorateur JS (@tailwind)
      else parser = 'babel';
      const prettierPlugins = [];
      if (parser === 'svelte') {
        prettierPlugins.push(await import('prettier-plugin-svelte'));
      }
      formatted = await prettier.format(working, { parser, plugins: prettierPlugins });
    } catch (e) {
      diagnostics.push({ severity: 'error', source: 'prettier', message: 'Formatage échoué: ' + e.message });
      formatted = working;
    }

    if (ext === '.svelte') {
      // Détection précoce de patterns jQuery/legacy ($, $.ajax, $(document).ready) pour éviter runtime "$ is not defined"
      try {
        // On ignore les occurrences de $: store Svelte via heuristique: "$: " ou "$store" ne doivent pas compter.
        const jqueryPatterns = [/\$\(document\)/, /\$\.ajax\s*\(/, /\$\(['"].+['"]\)/];
        const suspicious = [];
        for(const re of jqueryPatterns){ if(re.test(content)) suspicious.push(re.source); }
        // Heuristique plus large: un appel $(...) suivi d'un point .on/.addClass etc.
        const genericDollar = /\$\([^)]*\)\s*\.(on|ready|ajax|addClass|removeClass|toggleClass|css|attr)\b/;
        if(genericDollar.test(content) && !suspicious.includes(genericDollar.source)) suspicious.push(genericDollar.source);
        // Exclure les cas Svelte réactifs ($:) et $page, $session, etc.
        if(suspicious.length){
          diagnostics.push({
            severity: 'warning',
            source: 'precheck',
            message: 'Usage probable de jQuery ($) détecté. Svelte ne fournit pas $ par défaut. Remplacer par DOM natif ou onMount, ou injecter une lib (cash-dom). Patterns: '+suspicious.join(', ')
          });
        }
      } catch(_e) { /* silencieux */ }
      // Interdiction d'importer directement une route (+page/+layout) depuis une autre route ou composant
      try {
        const badImportRe = /import\s+[^;]*from\s+['"]((?:\.\.?\/)+|src\/)?routes\/[^'";]+\+page\.svelte['"]/g;
        const badLayoutRe = /import\s+[^;]*from\s+['"]((?:\.\.?\/)+|src\/)?routes\/[^'";]+\+layout\.svelte['"]/g;
        if(badImportRe.test(content) || badLayoutRe.test(content)){
          diagnostics.push({
            severity: 'error',
            source: 'routing-rule',
            message: 'Import direct d\'une route (+page/+layout) détecté. Extraire le contenu dans src/lib/YourComponent.svelte et importer ce composant à la place.'
          });
        }
      } catch(_e){ /* ignore */ }
      try {
        compile(content, { generate: 'ssr' });
        ssrOk = true;
      } catch (e) {
        diagnostics.push({ severity: 'error', phase: 'ssr', source: 'svelte-compiler', message: e.message });
      }
      try {
        compile(content, { generate: 'dom' });
        domOk = true;
      } catch (e) {
        diagnostics.push({ severity: 'error', phase: 'dom', source: 'svelte-compiler', message: e.message });
      }
    }

    result[filename] = {
      original: content,
      fixed,
      fixApplied,
      formatted,
      diagnostics,
      ssrOk,
      domOk
    };
  }
  return result;
}
