import { json } from '@sveltejs/kit';
import { compile } from 'svelte/compiler';

// Forcer runtime Node (Vercel) afin d'autoriser require/new Function sans restrictions edge
// Mise à jour vers Node 20 (Node 18 indiqué comme invalide par Vercel sur ce projet)
export const config = { runtime: 'nodejs20.x' };

// POST /api/compile/dom  { code: string }
// Retourne { success, js, css } pour exécution côté client (hydration interactive)
export async function POST({ request }) {
  try {
    const { code } = await request.json();
    if(!code || !code.trim()) return json({ success:false, error:'Code requis' }, { status:400 });
    let source = code;
    // Si pas de balise <script>, on en ajoute une vide pour permettre l'instance propre
    if(!/<script[\s>]/.test(source)) {
      source = `<script>export let props={};</script>\n` + source;
    }
    let compiled;
    try {
      compiled = compile(source, { generate:'dom', css:true, dev:false, hydratable:true });
    } catch(e){
      return json({ success:false, stage:'compile', error:e.message });
    }
    const { js, css } = compiled;
    // Sécurité: ajouter quelques headers passifs (ex: pour debug future instrumentation)
    const resp = json({ success:true, js: js.code, css: css.code });
    resp.headers.set('X-Compile-Mode','dom');
    resp.headers.set('Cache-Control','no-store');
    return resp;
  } catch(e){
    console.error('compile/dom error', e);
    return json({ success:false, error:e.message }, { status:500 });
  }
}