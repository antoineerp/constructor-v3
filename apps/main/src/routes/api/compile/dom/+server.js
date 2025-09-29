import { json } from '@sveltejs/kit';
import { compile } from 'svelte/compiler';

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
      compiled = compile(source, { generate:'dom', css:true, dev:false, hydratable:true });
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
            compiled = compile(repairedSource, { generate:'dom', css:true, dev:false, hydratable:true });
          } else {
            autoRepairMeta = { attempted:true, success:false, mode:'dom-compile-syntax', reason: repairJson?.error || 'repair-no-change' };
            return json({ success:false, stage:'compile', error:msg, autoRepair:autoRepairMeta });
          }
        } catch(repairErr){
          autoRepairMeta = { attempted:true, success:false, mode:'dom-compile-syntax', reason: repairErr.message||'repair-exception' };
          return json({ success:false, stage:'compile', error:msg, autoRepair:autoRepairMeta });
        }
      } else {
        return json({ success:false, stage:'compile', error:msg });
      }
    }
    const { js, css } = compiled;
    // Sécurité: ajouter quelques headers passifs (ex: pour debug future instrumentation)
    const resp = json({ success:true, js: js.code, css: css.code, autoRepair: autoRepairMeta });
    resp.headers.set('X-Compile-Mode','dom');
    resp.headers.set('Cache-Control','no-store');
    return resp;
  } catch(e){
    console.error('compile/dom error', e);
    return json({ success:false, error:e.message }, { status:500 });
  }
}