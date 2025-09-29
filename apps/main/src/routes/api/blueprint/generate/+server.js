import { json } from '@sveltejs/kit';
import { generateBlueprintProject } from '$lib/blueprints/generator.ts';

// POST /api/blueprint/generate
// Body: { id:string, includeExample?:boolean, language?:'ts'|'js' }
// Réponse: { success, files, meta }
export async function POST({ request }) {
  try {
    const body = await request.json().catch(()=> ({}));
    const { id, includeExample=false, language='ts' } = body;
    if(!id) return json({ success:false, error:'Paramètre id requis' }, { status:400 });
    const generated = generateBlueprintProject(id, { includeExample, language });
    if(!generated.found) return json({ success:false, error:'Blueprint inconnu' }, { status:404 });
    return json({ success:true, files: generated.files, meta: generated.meta });
  } catch(e){
    return json({ success:false, error: e.message||'Erreur génération blueprint' }, { status:500 });
  }
}
