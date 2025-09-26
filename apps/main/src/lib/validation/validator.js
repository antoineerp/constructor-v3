import { compile } from 'svelte/compiler';
import prettier from 'prettier';
import * as path from 'path';
import { ESLint } from 'eslint';

let eslintInstance; // singleton paresseux
async function getEslint() {
  if (!eslintInstance) {
    eslintInstance = new ESLint({
      useEslintrc: true, // s'appuie sur .eslintrc.cjs
      fix: false
    });
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
    let formatted = content;
    let ssrOk = false;
    let domOk = false;

    // Prettier format
    try {
      formatted = await prettier.format(content, {
        parser: ext === '.svelte' ? 'svelte' : 'babel',
        plugins: [await import('prettier-plugin-svelte')]
      });
    } catch (e) {
      diagnostics.push({ severity: 'error', source: 'prettier', message: 'Formatage échoué: ' + e.message });
    }

    // ESLint (inclut plugin svelte via config)
    try {
      const lintResults = await eslint.lintText(content, { filePath: filename });
      for (const lr of lintResults) {
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
      formatted,
      diagnostics,
      ssrOk,
      domOk
    };
  }
  return result;
}
