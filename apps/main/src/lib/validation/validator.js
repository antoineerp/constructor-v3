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

    // ESLint (inclut plugin svelte via config) - auto-fix
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
        diagnostics.push({ severity: 'error', source: 'eslint', message: 'ESLint erreur: ' + e.message });
      }
    } else {
      diagnostics.push({ severity: 'info', source: 'eslint', message: 'ESLint désactivé (init failed)' });
    }

    // Prettier format (après auto-fix ESLint)
    try {
      formatted = await prettier.format(working, {
        parser: ext === '.svelte' ? 'svelte' : 'babel',
        plugins: [await import('prettier-plugin-svelte')]
      });
    } catch (e) {
      diagnostics.push({ severity: 'error', source: 'prettier', message: 'Formatage échoué: ' + e.message });
      formatted = working; // fallback
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
