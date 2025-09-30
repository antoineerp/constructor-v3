import { json } from '@sveltejs/kit';
import { compile } from 'svelte/compiler';
import crypto from 'crypto';

// Simple heuristique jQuery
function detectJQueryUsage(code){
  const patterns = [/\$\(document\)/, /\$\.ajax\s*\(/, /\$\([^)]*\)\s*\.(on|ready|ajax|addClass|removeClass|toggleClass|css|attr)\b/];
  return patterns.some(r=> r.test(code));
}

// Forcer runtime Node (Vercel) afin d'autoriser require/new Function sans restrictions edge
// Mise à jour vers Node 20 (Node 18 indiqué comme invalide par Vercel sur ce projet)
export const config = { runtime: 'nodejs20.x' };

// POST /api/compile/dom  { code: string }
// Retourne { success, js, css } pour exécution côté client (hydration interactive)
export async function POST(event) {
  try {
    const { request, fetch } = event;
    const body = await request.json();
    const { code, allowAutoRepair = true, strict = false, _autoRepairAttempt = false } = body || {};
    if(!code || !code.trim()) return json({ success:false, error:'Code requis' }, { status:400 });
    if(strict && detectJQueryUsage(code)){
      return json({ success:false, error:'Usage jQuery ($) détecté – interdit en mode strict.', stage:'precheck-jquery' }, { status:400 });
    }
    let source = code;
    // Si pas de balise <script>, on en ajoute une vide pour permettre l'instance propre
    if(!/<script[\s>]/.test(source)) {
      source = `<script>export let props={};</script>\n` + source;
    }
    let autoRepairMeta = null;
    let compiled;
    try {
      compiled = compile(source, { generate:'dom', css:'injected', dev:false, hydratable:true });
    } catch(e){
      const msg = e.message||'';
      const isSyntax = /Unexpected token|Expected token|end of input|Unexpected EOF|Expected /.test(msg);
      const canAttempt = allowAutoRepair && !_autoRepairAttempt && isSyntax && !!process.env.OPENAI_API_KEY;
      if(canAttempt){
        try {
          const repairResp = await fetch('/api/repair/auto', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ filename:'Component.svelte', code, maxPasses:1, allowCatalog:true }) });
          const repairJson = await repairResp.json();
          if(repairJson?.success && repairJson.fixedCode && repairJson.fixedCode !== code){
            autoRepairMeta = { attempted:true, success:true, mode:'dom-compile-syntax', passes:repairJson.passes };
            const repaired = repairJson.fixedCode;
            let repairedSource = repaired;
            if(!/<script[\s>]/.test(repairedSource)) repairedSource = `<script>export let props={};</script>\n` + repairedSource;
            compiled = compile(repairedSource, { generate:'dom', css:'injected', dev:false, hydratable:true });
          } else {
            autoRepairMeta = { attempted:true, success:false, mode:'dom-compile-syntax', reason: repairJson?.error || 'repair-no-change' };
            return json({ success:false, stage:'compile', error:msg, autoRepair:autoRepairMeta });
          }
        } catch(repairErr){
          autoRepairMeta = { attempted:true, success:false, mode:'dom-compile-syntax', reason: repairErr.message||'repair-exception' };
          return json({ success:false, stage:'compile', error:msg, autoRepair:autoRepairMeta });
        }
      } else {
        // Retour enrichi (dev): message + stack minimale
        return json({ success:false, stage:'compile', error:msg, stack: (e.stack||'').split('\n').slice(0,6).join('\n') });
      }
    }
    const { js, css } = compiled;
    // Post-traitement: transformation imports relatifs -> absolus /runtime/<hash>/...
    const runtimeId = crypto.createHash('sha1').update(js.code).digest('hex').slice(0,12);
    // Cache global en mémoire
    if(typeof globalThis.__RUNTIME_BUNDLES === 'undefined') globalThis.__RUNTIME_BUNDLES = new Map();
    // Réécriture (playground: pas de graphe persisté encore, mais on prépare la structure)
    const relImportRe = /import\s+[^;]*?from\s+['"](\.?\.\/[^'"\n]+)['"];?|import\s+['"](\.?\.\/[^'"\n]+)['"];?/g;
    let transformed = js.code.replace(relImportRe, (full, g1, g2)=>{
      const spec = g1||g2; if(!spec) return full;
      // Normalisation simple: retirer ./ prefix
      const clean = spec.replace(/^\.\//,'');
      const abs = `/runtime/${runtimeId}/${clean}`;
      return full.replace(spec, abs);
    });
    // Enregistrer le bundle principal (point d'entrée) sous /runtime/<id>/entry.js
    const entryPath = `/runtime/${runtimeId}/entry.js`;
  globalThis.__RUNTIME_BUNDLES.set(entryPath, transformed);
  if(typeof globalThis.__RUNTIME_BUNDLES_META === 'undefined') globalThis.__RUNTIME_BUNDLES_META = new Map();
  globalThis.__RUNTIME_BUNDLES_META.set(entryPath, { t: Date.now() });
    const record = { js: transformed, css: css.code, id: runtimeId, entry: entryPath };
    const resp = json({ success:true, ...record, autoRepair: autoRepairMeta });
    resp.headers.set('X-Compile-Mode','dom');
    resp.headers.set('Cache-Control','no-store');
    resp.headers.set('X-Runtime-Id', runtimeId);
    return resp;
  } catch(e){
    console.error('compile/dom error', e);
    return json({ success:false, error:e.message, stack:(e.stack||'').split('\n').slice(0,10).join('\n') }, { status:500 });
  }
}