import { compile } from 'svelte/compiler';
import prettier from 'prettier';
import * as path from 'path';
import { ESLint } from 'eslint';

// ESLint singleton (flat config inline) — on ne dépend plus de découverte de fichier ni de fallback.
let eslintInstance;
async function getEslint() {
  if (eslintInstance) return eslintInstance;
  try {
    const sveltePlugin = (await import('eslint-plugin-svelte')).default;
    const globalsMod = await import('globals');
    // Construction d'une flat config minimale interne
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
          parser: (await import('svelte-eslint-parser')).default,
          parserOptions: { extraFileExtensions: ['.svelte'], ecmaVersion: 2022, sourceType: 'module' },
          globals: { ...globalsMod.browser, ...globalsMod.node }
        },
        rules: {
          'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
          'no-undef': 'error'
        }
      },
      {
        name: 'ignores',
        ignores: ['**/dist/**','**/build/**','**/.svelte-kit/**','**/node_modules/**']
      }
    ];
    // Instanciation; en ESLint v9 la flat config est par défaut si on passe un tableau à overrideConfig.
    eslintInstance = new ESLint({
      fix: true,
      overrideConfig: baseConfig
    });
  } catch (e) {
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
  const result = {};
  const eslint = await getEslint();

  for (const [filename, content] of Object.entries(files)) {
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
        diagnostics.push({ severity: 'error', source: 'eslint', message: 'ESLint erreur: ' + e.message });
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
