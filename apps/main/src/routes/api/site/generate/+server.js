import { json } from '@sveltejs/kit';
import { openaiService } from '$lib/openaiService.js';
import { supabase } from '$lib/supabase.js';

// Orchestrateur: génère blueprint et/ou code application selon état projet.
// Body: { query?: string, projectId?: string, regenerateFile?: string }
// Réponses:
//  - Génération initiale: { success, blueprint, files, project }
//  - Régénération fichier: { success, regenerated: filename, fileContent }
export async function POST({ request }) {
  try {
    const body = await request.json();
    const { query, projectId, regenerateFile } = body;

    if (!query && !projectId) {
      return json({ success:false, error:'query ou projectId requis' }, { status:400 });
    }

    let project = null;
    if (projectId) {
      const { data, error } = await supabase.from('projects').select('*').eq('id', projectId).single();
      if (error) throw error;
      project = data;
    }

    // Si régénération d'un fichier spécifique
    if (regenerateFile && project?.blueprint_json && project?.code_generated) {
      const blueprint = project.blueprint_json;
      const per = blueprint?.recommended_prompts?.per_file || [];
      const target = per.find(p => p.filename === regenerateFile);
      if (!target) return json({ success:false, error:'Prompt fichier introuvable' }, { status:404 });

      // Utilise generateApplication sur un prompt ciblé minimal mais on attend un seul fichier.
      // Simplicité: on réutilise le modèle composant (pourrait être amélioré plus tard).
      const singlePrompt = `Génère UNIQUEMENT le fichier ${regenerateFile} pour l'application décrite: ${JSON.stringify({ routes: blueprint.routes, components: blueprint.core_components })}. Contenu attendu complet.`;
      // Réutilisation generateApplication donnerait plusieurs fichiers; ici on pourrait appeler generateComponent, mais si c'est un +page.svelte complexe on veut plus.
      const result = await openaiService.generateApplication(singlePrompt);
      const newContent = result[regenerateFile] || Object.values(result)[0];
      // Mettre à jour en base
      const updatedCode = { ...project.code_generated, [regenerateFile]: newContent };
      const { error:upErr } = await supabase.from('projects').update({ code_generated: updatedCode }).eq('id', project.id);
      if (upErr) throw upErr;
      return json({ success:true, regenerated: regenerateFile, fileContent: newContent });
    }

    // Génération complète si pas encore blueprint
    let blueprint = project?.blueprint_json;
    if (!blueprint) {
      const effectiveQuery = query || project?.original_query;
      if (!effectiveQuery) return json({ success:false, error:'Impossible de déterminer la requête de base' }, { status:400 });
      blueprint = await openaiService.generateBlueprint(effectiveQuery);
    }

    // Construire prompt global à partir du blueprint
    const appPrompt = buildAppPrompt(blueprint);
    const files = await openaiService.generateApplication(appPrompt);

    // Mise à jour / création projet
    if (!project) {
      const insertData = {
        name: blueprint.seo_meta?.title?.slice(0,60) || 'Projet sans nom',
        original_query: blueprint.original_query || query,
        blueprint_json: blueprint,
        code_generated: files,
        status: 'draft'
      };
      const { data:created, error:insErr } = await supabase.from('projects').insert(insertData).select().single();
      if (insErr) throw insErr;
      project = created;
    } else {
      const { error:updErr } = await supabase.from('projects').update({ blueprint_json: blueprint, code_generated: files }).eq('id', project.id);
      if (updErr) throw updErr;
    }

    return json({ success:true, blueprint, files, project });
  } catch (e) {
    console.error('site/generate error', e);
    return json({ success:false, error:e.message }, { status:500 });
  }
}

function buildAppPrompt(blueprint){
  const { routes = [], core_components = [], color_palette = [], sample_content = {}, seo_meta = {} } = blueprint || {};
  const articles = sample_content.articles || [];
  return `Crée une application SvelteKit structurée.
Routes: ${routes.map(r=> r.path+ ' => '+ r.sections.join(',')).join(' | ')}.
Palette: ${color_palette.join(', ')}.
SEO Title: ${seo_meta.title}.
Composants à réutiliser si possible: ${core_components.join(', ')}.
Articles d'exemple:${articles.map(a=> ` {title:${a.title}, slug:${a.slug}}`).join('')}.
Contraintes:
- Retourne JSON pur {"src/routes/+page.svelte":"..."}
- Max 8 fichiers
- Utilise Tailwind
- Header + Footer cohérents
- Aucun texte hors JSON
`.trim();
}
