// tools/format-files.mjs
// Formatage unifié pour fichiers générés (Svelte / TS / JS / CSS / JSON / MD)
// Usage programmatique: import { formatFiles } from './tools/format-files.mjs'
// Usage CLI: node tools/format-files.mjs < input.json > output.json

import { stdin as input, stdout as output } from 'node:process';
import fs from 'node:fs/promises';
import prettier from 'prettier';
import pluginSvelte from 'prettier-plugin-svelte';
import { toText } from '../src/lib/utils/to-text.js';

let pluginTailwind = null;
try {
  // eslint-disable-next-line import/no-extraneous-dependencies
  pluginTailwind = (await import('prettier-plugin-tailwindcss')).default || null;
} catch (_e) {
  // plugin tailwind optionnel
}

const plugins = [pluginSvelte, pluginTailwind].filter(Boolean);

function pickParser(filename = '') {
  const f = filename.toLowerCase();
  if (f.endsWith('.svelte')) return 'svelte';
  if (f.endsWith('.ts')) return 'typescript';
  if (f.endsWith('.js') || f.endsWith('.mjs') || f.endsWith('.cjs')) return 'babel';
  if (f.endsWith('.json')) return 'json';
  if (f.endsWith('.md') || f.endsWith('.markdown')) return 'markdown';
  if (f.endsWith('.css')) return 'css';
  if (f.endsWith('.scss')) return 'scss';
  return 'babel';
}

async function formatOne(path, codeVal) {
  const code = toText(codeVal, path);
  let resolved = null;
  try { resolved = await prettier.resolveConfig(path).catch(() => null); } catch (_e) { /* ignore */ }
  const parser = pickParser(path);
  return prettier.format(code, { parser, plugins, filepath: path, ...(resolved || {}) });
}

export async function formatFiles(files) {
  const out = {};
  const changes = [];
  await Promise.all(
    Object.entries(files).map(async ([p, code]) => {
      try {
        const formatted = await formatOne(p, code);
        const raw = toText(code, p);
        out[p] = formatted;
        changes.push({ file: p, before: raw.length, after: formatted.length, changed: formatted !== raw });
      } catch (e) {
        // En cas d'échec, on conserve le code original pour ne pas bloquer
        const raw = (typeof code === 'string') ? code : (()=>{ try { return toText(code,p);} catch { return ''; } })();
        out[p] = raw;
        changes.push({ file: p, before: raw.length, after: raw.length, changed: false, error: e.message });
      }
    })
  );
  return { files: out, changes };
}

// Mode CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    let buf = '';
    input.setEncoding('utf8');
    for await (const chunk of input) buf += chunk;
    const payload = JSON.parse(buf || '{}');
    const { files = {} } = payload;
    const result = await formatFiles(files);
    try { await fs.writeFile('.format-files.last.json', JSON.stringify(result, null, 2), 'utf8'); } catch(_e){ /* ignore */ }
    output.write(JSON.stringify(result));
  })();
}
