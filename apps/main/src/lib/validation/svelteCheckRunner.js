import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

/* Exécute svelte-check sur un snippet isolé.
   Stratégie:
   1. Crée un dossier temporaire.
   2. Écrit un mini projet SvelteKit minimal (tsconfig + svelte.config + snippet sous src/routes/+page.svelte ou src/lib/Component.svelte selon filename fourni).
   3. Lance `npx svelte-check --output json` avec timeout.
   4. Parse chaque ligne JSON retournée (svelte-check émet des objets par ligne) et filtre celles associées au fichier cible.
   5. Map -> diagnostics génériques consommables par pipeline auto-repair.
*/
export async function runSvelteCheckSnippet(filename, code, { timeoutMs = 6000 } = {}) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'svchk-'));
  const relFile = filename.endsWith('.svelte') ? filename : 'Component.svelte';
  // Normalise emplacement (on préfère src/lib/...)
  const targetPath = path.join(tmpRoot, 'src', 'lib');
  fs.mkdirSync(targetPath, { recursive: true });
  const fullFile = path.join(targetPath, path.basename(relFile));
  fs.writeFileSync(fullFile, code, 'utf8');
  // tsconfig minimal
  fs.writeFileSync(path.join(tmpRoot, 'tsconfig.json'), JSON.stringify({ extends: "./tsconfig.base.json", compilerOptions: { strict: true, module: "ESNext", target: "ES2020" } }), 'utf8');
  fs.writeFileSync(path.join(tmpRoot, 'tsconfig.base.json'), JSON.stringify({ compilerOptions: { moduleResolution: "Node", allowJs: true } }), 'utf8');
  // svelte.config minimal
  fs.writeFileSync(path.join(tmpRoot, 'svelte.config.js'), `export default { extensions: ['.svelte'] };`, 'utf8');
  // package minimal
  fs.writeFileSync(path.join(tmpRoot, 'package.json'), JSON.stringify({ name: 'svchk-snippet', private: true }), 'utf8');

  const diagnostics = [];
  await new Promise((resolve) => setTimeout(resolve, 10)); // micro-yield
  const proc = spawn('npx', ['svelte-check', '--output', 'json'], { cwd: tmpRoot, stdio: ['ignore', 'pipe', 'pipe'] });

  let timedOut = false;
  const killer = setTimeout(() => { timedOut = true; proc.kill('SIGKILL'); }, timeoutMs);

  proc.stdout.on('data', chunk => {
    const lines = chunk.toString().split(/\r?\n/).filter(Boolean);
    for(const line of lines){
      try {
        const obj = JSON.parse(line);
        if(!obj || typeof obj !== 'object') continue;
        if(obj.type === 'diagnostic'){ // svelte-check stable structure
          const file = obj.file || '';
          if(!file) continue;
          // On n'affiche que ceux concernant notre snippet (dossier temp)
          if(!file.startsWith(tmpRoot)) continue;
          const sev = obj.severity === 'error' ? 'error' : 'warning';
          diagnostics.push({
            severity: sev,
            source: 'svelte-check',
            message: obj.message,
            line: obj.range?.start?.line ? (obj.range.start.line + 1) : undefined,
            column: obj.range?.start?.character ? (obj.range.start.character + 1) : undefined,
            rule: obj.code || undefined
          });
        }
      } catch { /* ignore parse err */ }
    }
  });
  proc.stderr.on('data', () => { /* silencieux (warnings de config) */ });
  await new Promise(resolve => proc.on('close', () => { clearTimeout(killer); resolve(); }));

  if(timedOut){
    diagnostics.push({ severity:'warning', source:'svelte-check', message:`Timeout (${timeoutMs}ms) – résultats partiels.` });
  }
  // Nettoyage best-effort (non bloquant); on ignore erreurs potentiels (FS ephemeral)
  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* ignore */ }
  return { diagnostics };
}
