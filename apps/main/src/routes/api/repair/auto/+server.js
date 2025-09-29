import { json } from '@sveltejs/kit';

import { runAllTransforms } from '$lib/ast/transformers.js';
import { componentsCatalog } from '$lib/catalog/components.js';
import { openaiService } from '$lib/openaiService.js';
import { supabase as clientSupabase } from '$lib/supabase.js';
import { runSvelteCheckSnippet } from '$lib/validation/svelteCheckRunner.js';
import { validateFiles } from '$lib/validation/validator.js';

/* Auto-réparation multi-passes.
Body: {
  projectId?: string,
  filename: string,
  code?: string, // si pas projectId
  maxPasses?: number (défaut 3),
  allowCatalog?: boolean (défaut true)
}
Retour: { success, filename, passes, fixedCode, finalDiagnostics, source, memoryApplied }
*/
export async function POST(event) {
  const { request, locals } = event;
  try {
    const body = await request.json();
    const { projectId, filename, code: providedCode, maxPasses = 3, allowCatalog = true } = body || {};
    if(!filename) return json({ success:false, error:'filename requis' }, { status:400 });
    if(!projectId && !providedCode) return json({ success:false, error:'code ou projectId requis' }, { status:400 });

    let baseCode = providedCode;
    let project = null;
    if(projectId){
      const { data:projRow } = await clientSupabase.from('projects').select('*').eq('id', projectId).maybeSingle();
      project = projRow || null;
      if(project && project.owner_id && locals.user && project.owner_id !== locals.user.id){
        return json({ success:false, error:'Accès refusé (owner mismatch)' }, { status:403 });
      }
      if(!baseCode){
        const { data:fileRow } = await clientSupabase.from('project_files').select('*').eq('project_id', projectId).eq('filename', filename).maybeSingle();
        baseCode = fileRow?.content || '';
      }
    }
    if(!baseCode) return json({ success:false, error:'Fichier introuvable' }, { status:404 });

    // Charger éventuelle mémoire de réparations pour ce projet
    const repairMemory = (project?.repair_memory && typeof project.repair_memory === 'object') ? project.repair_memory : {};
    const memoryForFile = repairMemory[filename] || [];

    let working = baseCode;
    let lastDiagnostics = [];
    let source = 'original';
    let passes = 0;
    let memoryApplied = memoryForFile.length>0;

    for(let i=0;i<maxPasses;i++){
      passes = i+1;
      // Validation
      const validation = await validateFiles({ [filename]: working });
      lastDiagnostics = validation[filename].diagnostics.filter(d=> d.severity==='error');
      if(lastDiagnostics.length === 0){
        source = source === 'original' ? 'validated-original' : source;
        break; // terminé
      }

      // Préparation prompt avec historique diag + mémoire
      const diagText = lastDiagnostics.slice(0,20).map(d=>`- (${d.source||'src'}) ${d.message}${d.rule?' ['+d.rule+']':''}`).join('\n');
      const memoryText = memoryForFile.length ? `Historique corrections déjà appliquées (à ne pas réintroduire):\n${memoryForFile.map(m=> '- '+m).join('\n')}` : '';
      const catalogHint = `Catalogue composants disponibles (réutilise au lieu de réécrire si pertinent) : ${componentsCatalog.slice(0,10).map(c=>c.name).join(', ')}.`;
      const repairPrompt = `Tu améliores un fichier Svelte jusqu'à éliminer toutes les erreurs.
Règles fortes:
- Conserve la fonctionnalité si présente.
- Préfère réutiliser un composant catalogue existant via import si structure similaire.
- Ne crée pas de dépendances externes.
- Minimise modifications si une correction locale suffit.
${catalogHint}
${memoryText}
Diagnostics actuels (pass ${i+1}/${maxPasses}):\n${diagText}\n\nCode actuel:\n${working}\n\nRetourne UNIQUEMENT le code complet corrigé.`;
      const patched = await openaiService.generateComponent(repairPrompt, 'repair', { model:'gpt-4o-mini' });
      if(patched && typeof patched === 'string' && patched.trim()){
        working = patched;
        source = 'ai-repair';
      }
      // Transformations AST ciblées (post patch IA) pour corrections structurelles faciles
      try {
        const { code: transformed, notes } = runAllTransforms(working);
        if(notes.length){
          working = transformed;
        }
  } catch { /* silencieux */ }
      // Revalider avant prochaine boucle
      const postVal = await validateFiles({ [filename]: working });
      let remaining = postVal[filename].diagnostics.filter(d=> d.severity==='error');
      // Étape supplémentaire: svelte-check pour typer/structure si déjà peu ou plus d'erreurs ESLint/compiler (ou pour compléter)
      try {
        if(remaining.length === 0 || remaining.length < 5){
          const sc = await runSvelteCheckSnippet(filename, working);
          if(sc.diagnostics?.length){
            // Fusion (éviter doublons par message)
            const seen = new Set(remaining.map(d=> d.source+'|'+d.message+'|'+d.line));
            for(const d of sc.diagnostics){
              const key = d.source+'|'+d.message+'|'+d.line;
              if(!seen.has(key)){ remaining.push(d); seen.add(key); }
            }
          }
        }
  } catch { /* silencieux */ }
      lastDiagnostics = remaining;
      if(remaining.length===0) break;

      // Dernière tentative: substitution catalogue si toujours erreurs et allowCatalog
      if(allowCatalog && i === maxPasses-1 && remaining.length){
        const baseName = filename.split('/').pop().replace('.svelte','').toLowerCase();
        const candidate = componentsCatalog.find(c=> c.filename.endsWith(baseName+'.svelte')) || componentsCatalog.find(c=> c.name.toLowerCase()===baseName);
        if(candidate){
          working = candidate.code;
          source = 'catalog';
          const catVal = await validateFiles({ [filename]: working });
          lastDiagnostics = catVal[filename].diagnostics.filter(d=> d.severity==='error');
        }
      }
    }

    // Mise à jour persistance si projet
    if(projectId){
      try {
        await clientSupabase.from('project_files').upsert({ project_id: projectId, filename, content: working, stage:'auto-repaired', pass_index:0 }, { onConflict:'project_id,filename' });
        // enrichir mémoire: stocker règles ou messages d'erreurs désormais corrigées
        const solved = lastDiagnostics.length===0 ? (memoryForFile.concat(['pass:'+passes+' ok'])).slice(-12) : memoryForFile.concat(['pass:'+passes+' partial']).slice(-12);
        const newMemory = { ...repairMemory, [filename]: solved };
        await clientSupabase.from('projects').update({ code_generated: { ...(project?.code_generated||{}), [filename]: working }, repair_memory: newMemory }).eq('id', projectId);
      } catch { /* ignore persistence error */ }
    }

    try {
      if(projectId){
        await clientSupabase.from('generation_logs').insert({
          user_id: project?.owner_id || null,
          project_id: projectId,
          type: 'auto-repair',
          filename,
          pass_count: passes,
          duration_ms: null,
          meta: { final_errors: lastDiagnostics.length, source }
        });
      }
  } catch { /* ignore log */ }
    return json({ success:true, filename, passes, fixedCode: working, finalDiagnostics: lastDiagnostics, source, memoryApplied });
  } catch(err){
    console.error('auto repair error', err);
    return json({ success:false, error:err.message||'Erreur auto-repair' }, { status:500 });
  }
}
