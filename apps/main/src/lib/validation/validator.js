import { compile } from 'svelte/compiler';
import prettier from 'prettier';
import * as path from 'path';
import { ESLint } from 'eslint';

let eslintInstance; // singleton paresseux
async function getEslint() {
  if (!eslintInstance) {
    try {
      eslintInstance = new ESLint({
        fix: true,
        overrideConfig: {
          extends: ['eslint:recommended', 'plugin:svelte/recommended', 'prettier'],
          plugins: ['svelte'],
          ignorePatterns: ['dist','build','.svelte-kit','node_modules'],
          overrides: [
            {
              files: ['**/*.svelte'],
              processor: 'svelte/svelte'
            }
          ]
        }
      });
    } catch (e) {
      console.error('ESLint init failed, fallback disabled lint:', e);
      eslintInstance = null;
    }
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

    // ESLint (skip pour JSON car on ne veut pas de bruit et ce n'est pas du code exécutable)
    if (ext !== '.json') {
      if (eslint) {
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
        } catch (e) {
          if (/Could not find config file/i.test(e.message)) {
            try {
              const sveltePlugin = await import('eslint-plugin-svelte');
              const fallback = new ESLint({
                fix: true,
                overrideConfig: {
                  overrides: [
                    {
                      files: ['**/*.{js,ts,svelte}'],
                      excludedFiles: ['dist/**','build/**','.svelte-kit/**','node_modules/**'],
                      plugins: ['svelte'],
                      parser: (await import('svelte-eslint-parser')).default,
                      parserOptions: { extraFileExtensions: ['.svelte'], ecmaVersion: 2022, sourceType: 'module' },
                      rules: {
                        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
                        'no-undef': 'error'
                      }
                    }
                  ]
                },
                plugins: { svelte: sveltePlugin }
              });
              const lintResults = await fallback.lintText(working, { filePath: filename });
              for (const lr of lintResults) {
                if (lr.output && lr.output !== working) {
                  working = lr.output;
                  fixed = lr.output;
                  fixApplied = true;
                }
                if (lr.messages?.length) {
                  diagnostics.push(...lr.messages.map(m => ({
                    severity: mapSeverity(m.severity),
                    rule: m.ruleId || 'unknown',
                    message: m.message,
                    line: m.line,
                    column: m.column,
                    source: 'eslint-fallback'
                  })));
                }
              }
              diagnostics.push({ severity: 'info', source: 'eslint', message: 'Fallback ESLint inline config utilisé.' });
            } catch(fbErr){
              diagnostics.push({ severity: 'error', source: 'eslint-fallback', message: 'Fallback échoué: '+fbErr.message });
            }
          } else {
            diagnostics.push({ severity: 'error', source: 'eslint', message: 'ESLint erreur: ' + e.message });
          }
        }
      } else {
        diagnostics.push({ severity: 'info', source: 'eslint', message: 'ESLint désactivé (init failed)' });
      }
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
