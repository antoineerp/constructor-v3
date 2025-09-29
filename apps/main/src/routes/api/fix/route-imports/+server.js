import { json } from '@sveltejs/kit';
import { fixRouteImports } from '$lib/fix/routeImports.js';

export async function POST({ request }) {
  try {
    const { files = {} } = await request.json();
    if(typeof files !== 'object' || Array.isArray(files)) return json({ success:false, error:'files invalide' }, { status:400 });
    const result = fixRouteImports(files);
    return json({ success:true, ...result });
  } catch(e){
    return json({ success:false, error:e.message||'Erreur auto-fix' }, { status:500 });
  }
}
