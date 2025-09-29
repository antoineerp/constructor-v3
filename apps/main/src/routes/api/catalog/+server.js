import { json } from '@sveltejs/kit';
import catalog from '$lib/local-catalog.json';

// GET /api/catalog => retourne catalog complet (offline)
export async function GET(){
  return json({ success:true, ...catalog, counts: {
    templates: catalog.templates.length,
    components: catalog.components.length,
    projects: catalog.projects.length
  }});
}

// POST /api/catalog/template { name,type,description,structure }
export async function POST({ request }){
  try {
    const body = await request.json();
    const { name, type='generic', description='', structure={} } = body || {};
    if(!name) return json({ success:false, error:'name requis'}, { status:400 });
    // NOTE: Pas de persistance disque (runtime ephemeral); pourrait être amélioré.
    const tpl = { id: 'tpl_'+Date.now().toString(36), name, type, description, structure, created_at: Date.now() };
    catalog.templates.push(tpl);
    return json({ success:true, template: tpl });
  } catch(e){
    return json({ success:false, error: e.message }, { status:500 });
  }
}
