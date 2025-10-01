import { json } from '@sveltejs/kit';
import { compile } from 'svelte/compiler';
// Import conditionnel pour Svelte 5
let svelteCompile = compile;
import crypto from 'crypto';

// Simple util interne pour id requête
function reqId(){ return crypto.randomBytes(6).toString('hex'); }

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
  const rid = reqId();
  const t0 = Date.now();
  const { request, fetch } = event;
  let logCtx = { rid, env: process.env.VERCEL ? 'vercel' : 'local' };
  
  try {
    // Vérification rapide de la disponibilité de Svelte
    if (!compile || typeof compile !== 'function') {
      console.error('[compile/dom] Svelte compiler not available');
      return json({ 
        success: false, 
        error: 'Svelte compiler not available in serverless environment', 
        rid 
      }, { status: 500 });
    }
    
    const body = await request.json();
    const { code, allowAutoRepair = true, strict = false, _autoRepairAttempt = false } = body || {};
    logCtx.len = code ? code.length : 0;
    logCtx.strict = !!strict;
    
    if(!code || !code.trim()) {
      const resp = json({ success:false, error:'Code requis', rid }, { status:400 });
      resp.headers.set('X-Request-Id', rid);
      return resp;
    }
    if(strict && detectJQueryUsage(code)){
      const resp = json({ success:false, error:'Usage jQuery ($) détecté – interdit en mode strict.', stage:'precheck-jquery', rid }, { status:400 });
      resp.headers.set('X-Request-Id', rid);
      return resp;
    }
    let source = code;
    if(!/<script[\s>]/.test(source)) {
      source = `<script>export let props={};</script>\n` + source;
    }
    let autoRepairMeta = null;
    let compiled;
    try {
      // Configuration adaptée pour Svelte 5 et environnement serverless
      const compileOptions = { 
        generate: 'dom', 
        css: 'injected', 
        dev: false, 
        hydratable: true,
        // Options Svelte 5
        runes: false,
        // Désactiver les optimisations qui peuvent poser problème en serverless
        immutable: false,
        accessors: false,
        // Forcer la compatibilité
        compatibility: { componentApi: 4 }
      };
      
      compiled = compile(source, compileOptions);
    } catch(e){
      const msg = e.message||'';
      const isSyntax = /Unexpected token|Expected token|end of input|Unexpected EOF|Expected /.test(msg);
      const canAttempt = allowAutoRepair && !_autoRepairAttempt && isSyntax && !!process.env.OPENAI_API_KEY;
      logCtx.compileError = msg.substring(0,140);
      logCtx.syntax = !!isSyntax;
      logCtx.autoRepairEligible = !!canAttempt;
      if(canAttempt){
        try {
          const repairResp = await fetch('/api/repair/auto', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ filename:'Component.svelte', code, maxPasses:1, allowCatalog:true }) });
          const repairJson = await repairResp.json();
          if(repairJson?.success && repairJson.fixedCode && repairJson.fixedCode !== code){
            autoRepairMeta = { attempted:true, success:true, mode:'dom-compile-syntax', passes:repairJson.passes };
            logCtx.autoRepair = 'success';
            let repairedSource = repairJson.fixedCode;
            if(!/<script[\s>]/.test(repairedSource)) repairedSource = `<script>export let props={};</script>\n` + repairedSource;
            compiled = compile(repairedSource, { generate:'dom', css:'injected', dev:false, hydratable:true, runes:false, compatibility: { componentApi: 4 } });
          } else {
            autoRepairMeta = { attempted:true, success:false, mode:'dom-compile-syntax', reason: repairJson?.error || 'repair-no-change' };
            logCtx.autoRepair = 'failed';
            const resp = json({ success:false, stage:'compile', error:msg, autoRepair:autoRepairMeta, rid });
            resp.headers.set('X-Request-Id', rid);
            return resp;
          }
        } catch(repairErr){
          autoRepairMeta = { attempted:true, success:false, mode:'dom-compile-syntax', reason: repairErr.message||'repair-exception' };
          logCtx.autoRepair = 'exception';
          const resp = json({ success:false, stage:'compile', error:msg, autoRepair:autoRepairMeta, rid });
          resp.headers.set('X-Request-Id', rid);
          return resp;
        }
      } else {
        const resp = json({ success:false, stage:'compile', error:msg, stack: (e.stack||'').split('\n').slice(0,6).join('\n'), rid });
        resp.headers.set('X-Request-Id', rid);
        return resp;
      }
    }
    const { js, css } = compiled;
    const runtimeId = crypto.createHash('sha1').update(js.code).digest('hex').slice(0,12);
    if(typeof globalThis.__RUNTIME_BUNDLES === 'undefined') globalThis.__RUNTIME_BUNDLES = new Map();
    
    // Post-traitement pour nettoyer les imports Svelte 5
    let cleanedCode = js.code;
    
    // Remplacer svelte/legacy par svelte
    cleanedCode = cleanedCode.replace(/from ['"]svelte\/legacy['"]/g, 'from "svelte"');
    cleanedCode = cleanedCode.replace(/import ['"]svelte\/legacy['"]/g, 'import "svelte"');
    
    // Nettoyer les autres imports legacy problématiques
    cleanedCode = cleanedCode.replace(/from ['"]svelte\/legacy\/(.+?)['"]/g, 'from "svelte/$1"');
    
    const relImportRe = /import\s+[^;]*?from\s+['"](\.?\.\/[^^'"\n]+)['"];?|import\s+['"](\.?\.\/[^^'"\n]+)['"];?/g;
    let relCount = 0;
    let transformed = cleanedCode.replace(relImportRe, (full, g1, g2)=>{
      const spec = g1||g2; if(!spec) return full;
      relCount++;
      const clean = spec.replace(/^\.\//,'');
      const abs = `/runtime/${runtimeId}/${clean}`;
      return full.replace(spec, abs);
    });
    const entryPath = `/runtime/${runtimeId}/entry.js`;
    globalThis.__RUNTIME_BUNDLES.set(entryPath, transformed);
    if(typeof globalThis.__RUNTIME_BUNDLES_META === 'undefined') globalThis.__RUNTIME_BUNDLES_META = new Map();
    globalThis.__RUNTIME_BUNDLES_META.set(entryPath, { t: Date.now() });
    logCtx.relImports = relCount;
    logCtx.runtimeId = runtimeId;
    const record = { js: transformed, css: css.code, id: runtimeId, entry: entryPath };
    const resp = json({ success:true, ...record, autoRepair: autoRepairMeta, rid });
    resp.headers.set('X-Compile-Mode','dom');
    resp.headers.set('Cache-Control','no-store');
    resp.headers.set('X-Runtime-Id', runtimeId);
    resp.headers.set('X-Request-Id', rid);
    logCtx.ms = Date.now()-t0;
    if(process.env.DEBUG_COMPILE_DOM){
      console.log('[compile/dom success]', logCtx);
    }
    return resp;
  } catch(e){
    logCtx.error = e.message;
    logCtx.stackTop = (e.stack||'').split('\n')[0];
    logCtx.ms = Date.now()-t0;
    console.error('[compile/dom fatal]', logCtx);
    console.error('[compile/dom stack]', e.stack);
    const resp = json({ 
      success:false, 
      error:e.message, 
      stage:'fatal', 
      debug: process.env.NODE_ENV==='development' ? e.stack : undefined,
      rid 
    }, { status:500 });
    resp.headers.set('X-Request-Id', rid);
    return resp;
  }
}