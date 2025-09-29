import { json } from '@sveltejs/kit';
import { compile } from 'svelte/compiler';

// Endpoint minimaliste sans heuristiques / fallback pour diagnostiquer le SSR réel
// Body: { code:string, generate?: 'ssr'|'dom', filename?: string }
export async function POST({ request }) {
  try {
    const { code, generate = 'ssr', filename = 'Component.svelte' } = await request.json();
    if(!code || !code.trim()) return json({ success:false, error:'Code requis' }, { status:400 });
    try {
      const c = compile(code, { generate, hydratable:true, filename });
      return json({ success:true, js: c.js?.code || null, css: c.css?.code || null, warnings: c.warnings||[], ast: undefined });
    } catch(e){
      const loc = e.start ? { line:e.start.line, column:e.start.column } : null;
      return json({ success:false, error: e.message, position: loc, stack: e.stack?.split('\n').slice(0,5).join('\n') }, { status:400 });
    }
  } catch(e){
    return json({ success:false, error:e.message }, { status:500 });
  }
}
