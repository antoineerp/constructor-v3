#!/usr/bin/env ts-node
/**
 * Script de synchronisation des composants shadcn-svelte dans packages/ui
 * Objectif: copier les sources désirées (depuis node_modules/shadcn-svelte/src/components/...) vers packages/ui/src/shadcn/
 * en appliquant éventuellement une légère adaptation (ex: préfixe de class utilitaire tailwind si nécessaire).
 *
 * Usage:
 *  pnpm ts-node scripts/shadcn-sync.ts button card alert
 *  (si aucun argument: liste les composants disponibles)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.join(__dirname, '..');
const UI_TARGET = path.join(ROOT, 'packages/ui/src/shadcn');
const LIB_ROOT = path.join(ROOT, 'node_modules/shadcn-svelte/src/lib');

interface CopyResult { name:string; status:'copied'|'skipped'|'not-found'; reason?:string; }

function listAvailable(): string[] {
  if (!fs.existsSync(LIB_ROOT)) return [];
  const entries = fs.readdirSync(LIB_ROOT, { withFileTypes:true });
  return entries.filter(e=> e.isDirectory()).map(e=> e.name).sort();
}

function ensureDir(p: string){ if(!fs.existsSync(p)) fs.mkdirSync(p, { recursive:true }); }

function copyComponent(name: string): CopyResult {
  const sourceDir = path.join(LIB_ROOT, name);
  if(!fs.existsSync(sourceDir)) return { name, status:'not-found' };
  const targetDir = path.join(UI_TARGET, name);
  ensureDir(targetDir);
  const files = fs.readdirSync(sourceDir).filter(f=> f.endsWith('.svelte') || f.endsWith('.ts'));
  for (const f of files){
    const srcFile = path.join(sourceDir, f);
    const tgtFile = path.join(targetDir, f);
    let content = fs.readFileSync(srcFile, 'utf-8');
    // Adaptations simples (ex: commentaire d'origine)
    if(!content.includes('@generated-from-shadcn')) {
      content = `<!-- @generated-from-shadcn:${name}/${f} -->\n` + content;
    }
    fs.writeFileSync(tgtFile, content, 'utf-8');
  }
  return { name, status:'copied' };
}

async function main(){
  const args = process.argv.slice(2).filter(a=> !a.startsWith('-'));
  if(!fs.existsSync(LIB_ROOT)){
    console.error('Dossier shadcn-svelte introuvable. Assure-toi que la dépendance est installée.');
    process.exit(1);
  }
  if(!args.length){
    console.log('Composants disponibles:\n');
    console.log(listAvailable().join('\n'));
    console.log('\nUtilisation: pnpm ts-node scripts/shadcn-sync.ts button card alert');
    return;
  }
  ensureDir(UI_TARGET);
  const results: CopyResult[] = args.map(c => copyComponent(c));
  const copied = results.filter(r=> r.status==='copied').map(r=> r.name);
  const missing = results.filter(r=> r.status==='not-found').map(r=> r.name);
  console.log('Copiés:', copied.length ? copied.join(', ') : '0');
  if(missing.length) console.warn('Introuvables:', missing.join(', '));
}

main().catch(e=>{ console.error(e); process.exit(1); });
