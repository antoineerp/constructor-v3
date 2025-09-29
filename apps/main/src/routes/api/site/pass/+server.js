import { json } from '@sveltejs/kit';

import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { openaiService } from '$lib/openaiService.js';

// Multi-pass generation endpoint
// GET  /api/site/pass?projectId= : retourne les fichiers (stages & pass_index)
// POST /api/site/pass { projectId, pass: 'scaffold'|'fill'|'optimize', files?: [filenames] }
//   Applique la passe aux fichiers demandés (ou tous si non fourni) en respectant l'ordre logique.

const PASS_ORDER = ['scaffold','fill','optimize'];

export async function GET({ url, request }) {
  try {
    const projectId = url.searchParams.get('projectId');
    if(!projectId) return json({ success:false, error:'projectId requis' }, { status:400 });
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  // Supabase retiré
    const { data: project, error: pErr } = await supabase.from('projects').select('id').eq('id', projectId).single();
    if(pErr) throw pErr;
    const { data: pfiles, error: fErr } = await supabase.from('project_files').select('filename, stage, pass_index').eq('project_id', project.id).order('filename');
    if(fErr) throw fErr;
    return json({ success:true, files:pfiles });
  } catch(e){
    console.error('GET pass error', e);
    return json({ success:false, error:e.message }, { status:500 });
  }
}

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { projectId, pass, files } = body;
    if(!projectId || !pass) return json({ success:false, error:'projectId et pass requis' }, { status:400 });
    if(!PASS_ORDER.includes(pass)) return json({ success:false, error:'Pass inconnue' }, { status:400 });
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  // Supabase retiré
    const { data: project, error: pErr } = await supabase.from('projects').select('*').eq('id', projectId).single();
    if(pErr) throw pErr;
    const blueprint = project.blueprint_json;
    if(!blueprint) return json({ success:false, error:'Blueprint manquant' }, { status:400 });

    // Récupérer fichiers existants
    const { data: existingFiles, error: efErr } = await supabase.from('project_files').select('*').eq('project_id', project.id);
    if(efErr) throw efErr;
    const existingMap = Object.fromEntries(existingFiles.map(f => [f.filename, f]));

    // Déterminer cible
    const recommended = (blueprint.recommended_prompts?.per_file || []).map(p=> p.filename);
    let targetFiles = files && files.length ? files : recommended.length ? recommended : Object.keys(existingMap);
    targetFiles = targetFiles.filter(f=> !!f);
    if(!targetFiles.length) return json({ success:false, error:'Aucun fichier cible' }, { status:400 });

    // Vérifier ordre des passes (ex: fill nécessite scaffold pour ce fichier sauf si déjà au moins scaffold)
    for(const f of targetFiles){
      const currentStage = existingMap[f]?.stage || 'initial';
      if(pass !== 'scaffold') {
        const requiredIndex = PASS_ORDER.indexOf(pass)-1;
        if(requiredIndex >= 0) {
          const currentIndex = PASS_ORDER.indexOf(currentStage);
            if(currentIndex < requiredIndex) {
              return json({ success:false, error:`Le fichier ${f} doit d'abord passer par ${PASS_ORDER[requiredIndex]}` }, { status:400 });
            }
        }
      }
    }

    const updated = [];
    for(const filename of targetFiles){
      const current = existingMap[filename];
      const priorContent = current?.content || '';
      const baseContext = JSON.stringify({ site_type: blueprint.detected_site_type, routes: blueprint.routes, components: blueprint.core_components }).slice(0,1800);
      let passInstruction = '';
      if(pass === 'scaffold') passInstruction = 'Génère un squelette très clair et minimal (structure, sections, commentaires TODO) sans logique dynamique avancée.';
      else if(pass === 'fill') passInstruction = 'Remplis le squelette avec du contenu cohérent, textes marketing ou data fournie (sample_content), en évitant le lorem ipsum.';
      else if(pass === 'optimize') passInstruction = 'Optimise pour accessibilité (aria-label, roles), sémantique, responsive, cohérence palette, aucune duplication inutile.';
      const sampleArticles = (blueprint.sample_content?.articles || []).slice(0,3);
      const sampleSnippet = sampleArticles.length ? ('Extraits contenu: '+ sampleArticles.map(a=> a.title+':'+a.excerpt).join(' | ')).slice(0,500) : '';
      const prompt = `Étape: ${pass}. FICHIER: ${filename}. ${passInstruction}\nContexte: ${baseContext}\n${sampleSnippet}\nAncienne version:\n${priorContent.slice(0,2500)}\nRendu: retourne STRICTEMENT JSON {"${filename}":"<contenu fichier>"} (pas de markdown, pas d'autres clés).`;
  const result = await openaiService.generateApplication(prompt, { model: 'gpt-4o-mini', maxFiles: 1 });
      const newContent = result[filename] || Object.values(result)[0];
      if(!newContent) continue;
      const passIndex = (current?.pass_index || 0) + 1;
      const { error: upErr } = await supabase.from('project_files').upsert({ project_id: project.id, filename, content: newContent, stage: pass, pass_index: passIndex }, { onConflict: 'project_id,filename' });
      if(upErr) throw upErr;
      updated.push({ filename, stage: pass, pass_index: passIndex });
    }
    return json({ success:true, pass, updated });
  } catch(e){
    console.error('POST pass error', e);
    return json({ success:false, error:e.message }, { status:500 });
  }
}
