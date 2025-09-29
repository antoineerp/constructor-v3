#!/usr/bin/env node
/*
  Script d'ingestion (prototype) de composants Svelte externes.
  Objectif: copier des snapshots locaux (pas de fetch réseau ici) depuis un dossier source (ex: ../../_external-cache/<lib>)
  vers src/lib/external/<lib>/components en ajoutant meta.json.

  Usage: node tools/ingest-external.mjs skeleton path/to/local/skeleton/components
*/
import fs from 'fs';
import path from 'path';

const lib = process.argv[2];
const srcDir = process.argv[3];
if(!lib || !srcDir){
  console.error('Usage: node tools/ingest-external.mjs <libName> <sourceDir>');
  process.exit(1);
}
if(!fs.existsSync(srcDir)){
  console.error('Source dir inexistant:', srcDir); process.exit(1);
}
const targetBase = path.resolve('src/lib/external', lib);
const targetComp = path.join(targetBase, 'components');
fs.mkdirSync(targetComp, { recursive:true });

const meta = { name: lib, importedAt: new Date().toISOString(), source: srcDir, license: 'UNKNOWN', version: 'snapshot' };
const svelteFiles = fs.readdirSync(srcDir).filter(f=> f.endsWith('.svelte'));
for(const f of svelteFiles){
  const content = fs.readFileSync(path.join(srcDir, f), 'utf8');
  fs.writeFileSync(path.join(targetComp, f), content, 'utf8');
}
fs.writeFileSync(path.join(targetBase, 'meta.json'), JSON.stringify(meta,null,2),'utf8');
console.log('Ingestion terminée:', { lib, count: svelteFiles.length });
