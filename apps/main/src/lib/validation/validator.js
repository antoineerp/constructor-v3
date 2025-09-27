import { compile } from 'svelte/compiler';
import prettier from 'prettier';
import * as path from 'path';
import { ESLint } from 'eslint';
import { toText } from '../utils/to-text.js';
// Charge optionnellement le formatter dédié multi-fichiers (Svelte + Tailwind)
let formatFilesFn = null;
try {
  // Chargement via alias Vite ($tools/format) défini dans vite.config.js
  const mod = await import('$tools/format');
  formatFilesFn = mod.formatFiles;
} catch(_e) {
  // silencieux si absent (en build SSR Vercel, alias résolu via Vite)
}

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
