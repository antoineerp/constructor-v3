import { json } from '@sveltejs/kit';
import { openaiService } from '$lib/openaiService.js';
import { validateFiles } from '$lib/validation/validator.js';
import { supabase as clientSupabase } from '$lib/supabase.js';

/* Réparation d'un fichier appartenant à un projet blueprint persisté.
Body: { projectId, filename, intent?, diagnostics?[] }
Optionnel: code (si version locale non encore persistée) sinon on lit project_files.
Retour: { success, patchedCode, validation }
*/
export async function POST(event) {
  const { request, locals } = event;
  try {
    const body = await request.json();
    const { projectId, filename, code: overrideCode, diagnostics = [] } = body || {};
    if(!projectId || !filename) return json({ success:false, error:'projectId & filename requis' }, { status:400 });
    // Ownership rapide
    try {
      const { data:proj } = await clientSupabase.from('projects').select('id, owner_id').eq('id', projectId).maybeSingle();
      if(proj && proj.owner_id && locals.user && proj.owner_id !== locals.user.id){
        return json({ success:false, error:'Accès refusé (owner mismatch)' }, { status:403 });
      }
    } catch { /* ignore */ }

    // Récupération du fichier existant
    let existingContent = overrideCode;
    if(!existingContent){
      const { data:fileRow, error:fileErr } = await clientSupabase.from('project_files').select('*').eq('project_id', projectId).eq('filename', filename).maybeSingle();
      if(fileErr) return json({ success:false, error:'Lecture project_files échouée: '+fileErr.message }, { status:500 });
      if(!fileRow) return json({ success:false, error:'Fichier introuvable dans project' }, { status:404 });
      existingContent = fileRow.content;
    }

    const diagText = diagnostics.slice(0,20).map(d=>`- [${d.severity}] ${d.message}${d.line?` (L${d.line})`:''}`).join('\n');
    const repairPrompt = `Tu répares un fichier Svelte pour un projet existant. Ne change pas radicalement la structure si non nécessaire.
Règles strictes: pas de dépendances supplémentaires, conserver style Tailwind, corriger accessibilité si évident.
Diagnostics:\n${diagText || 'aucun'}\n\nCode actuel:\n${existingContent}\n\nCorrige et renvoie UNIQUEMENT le code final complet.`;
    const patched = await openaiService.generateComponent(repairPrompt, 'repair', { model:'gpt-4o-mini' });

    // Revalidation
    let validation = null;
    try {
      const v = await validateFiles({ [filename]: patched });
      validation = v[filename];
    } catch(e){
      validation = { diagnostics:[{ severity:'error', source:'validator', message:'Revalidation échouée: '+e.message }], ssrOk:false, domOk:false, original: existingContent, formatted: patched };
    }

    // Persistance nouvelle version
    try {
      await clientSupabase.from('project_files').upsert({ project_id: projectId, filename, content: patched, stage:'repaired', pass_index:0 }, { onConflict:'project_id,filename' });
      // Mettre à jour agrégat code_generated du projet
      const { data:projRow } = await clientSupabase.from('projects').select('code_generated').eq('id', projectId).maybeSingle();
      if(projRow){
        const updated = { ...(projRow.code_generated||{}), [filename]: patched };
        await clientSupabase.from('projects').update({ code_generated: updated }).eq('id', projectId);
      }
    } catch(pErr){
      console.warn('Persistance réparation échouée:', pErr.message);
    }

    return json({ success:true, patchedCode: patched, validation });
  } catch(e){
    console.error('repair/project error', e);
    return json({ success:false, error:e.message||'Erreur réparation projet' }, { status:500 });
  }
}
