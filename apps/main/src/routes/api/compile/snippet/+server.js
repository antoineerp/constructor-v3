import { json } from '@sveltejs/kit';
import { compile } from 'svelte/compiler';

/* Compile un snippet Svelte (component complet) en SSR + DOM pour feedback rapide.
Body: { code: string }
Retour: { success, ssrOk, domOk, ssrError?, domError?, diagnostics:[] }
*/
export async function POST({ request }) {
  try {
    const { code } = await request.json();
    if(!code || typeof code !== 'string') return json({ success:false, error:'code requis' }, { status:400 });
    const diagnostics = [];
    let ssrOk=false, domOk=false;
    try { compile(code, { generate:'ssr', runes:false, legacy:true }); ssrOk=true; } catch(e){ diagnostics.push({ phase:'ssr', message:e.message, severity:'error' }); }
    try { compile(code, { generate:'dom', runes:false, legacy:true }); domOk=true; } catch(e){ diagnostics.push({ phase:'dom', message:e.message, severity:'error' }); }
    return json({ success:true, ssrOk, domOk, diagnostics });
  } catch(e){
    return json({ success:false, error:e.message||'Erreur compilation snippet' }, { status:500 });
  }
}
