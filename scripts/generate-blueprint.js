#!/usr/bin/env node
/**
 * Script CLI: génération blueprint (+ option code) via services internes.
 * Usage:
 *  node scripts/generate-blueprint.js --query "crm clients pipeline" [--code] [--profile enhanced|external_libs|safe]
 */
import fs from 'fs';
import path from 'path';
import process from 'process';
import url from 'url';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const API_BASE = process.env.LOCAL_API_BASE || 'http://localhost:5173'; // adapter si besoin

function parseArgs(){
  const args = process.argv.slice(2);
  const out = { code:false, profile:'safe' };
  for(let i=0;i<args.length;i++){
    const a = args[i];
    if(a === '--query') out.query = args[++i];
    else if(a === '--code') out.code = true;
    else if(a === '--profile') out.profile = args[++i];
    else if(a === '--help') out.help = true;
  }
  return out;
}

async function callGenerate({ query, code, profile }){
  if(!query) throw new Error('Param --query requis');
  const body = { query, simpleMode: !code, generationProfile: profile };
  const res = await fetch(`${API_BASE}/api/site/generate`, {
    method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(body)
  });
  if(!res.ok){ const txt = await res.text(); throw new Error('Erreur API generate: '+txt); }
  return await res.json();
}

(async ()=>{
  const args = parseArgs();
  if(args.help){
    console.log(`Usage: node scripts/generate-blueprint.js --query "texte" [--code] [--profile enhanced|external_libs|safe]\n`);
    process.exit(0);
  }
  try {
    const data = await callGenerate(args);
    const stamp = new Date().toISOString().replace(/[:.]/g,'-');
    const outDir = path.join(process.cwd(), 'exports', 'blueprints');
    fs.mkdirSync(outDir, { recursive: true });
    const baseName = `blueprint-${stamp}`;
    const bpPath = path.join(outDir, baseName + '.json');
    fs.writeFileSync(bpPath, JSON.stringify(data.blueprint, null, 2));
    console.log('Blueprint sauvegardé:', bpPath);
    if(args.code){
      const codeDir = path.join(outDir, baseName + '-code');
      fs.mkdirSync(codeDir, { recursive: true });
      for(const [filename, content] of Object.entries(data.files||{})){
        const full = path.join(codeDir, filename);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, content);
      }
      console.log('Code généré écrit dans:', codeDir);
    }
  } catch(e){
    console.error('Erreur:', e.message);
    process.exit(1);
  }
})();
