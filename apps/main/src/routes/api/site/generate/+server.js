import { json } from '@sveltejs/kit';
import { openaiService } from '$lib/openaiService.js';
import { supabase as clientSupabase } from '$lib/supabase.js';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { summarizeCatalog, componentsCatalog, selectComponentsForBlueprint } from '$lib/catalog/components.js';
import { validateAndFix } from '$lib/validator/svelteValidator.js';

// Orchestrateur: génère blueprint et/ou code application selon état projet.
// Body: { query?: string, projectId?: string, regenerateFile?: string }
// Nouvelles persistance: table project_files (un enregistrement par fichier généré)
// Réponses:
//  - Génération initiale: { success, blueprint, files, project }
//  - Régénération fichier: { success, regenerated: filename, fileContent }
export async function POST({ request }) {
  try {
    const body = await request.json();
  const { query, projectId, regenerateFile, simpleMode } = body;
    // Récupération token Supabase (passé côté client via Authorization: Bearer <access_token>)
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    let userId = null;
    let serverSupabase = null;
    if (authHeader?.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.split(' ')[1];
      serverSupabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
      try {
        const { data: { user }, error: userErr } = await serverSupabase.auth.getUser();
        if (!userErr && user) userId = user.id;
      } catch (e) {
        console.warn('Impossible de récupérer user depuis token', e);
      }
    }
    // Fallback: ne pas utiliser clientSupabase côté serveur pour auth sensible, mais permet encore la lecture si pas RLS stricte.

    if (!query && !projectId) {
      return json({ success:false, error:'query ou projectId requis' }, { status:400 });
    }
    // Mode éphémère: si pas d'userId et pas de projectId on autorise génération (pas de persistance)
    const ephemeral = !userId && !projectId;

    let project = null;
    if (projectId) {
      // Vérifier ownership si userId connu
      const queryBuilder = clientSupabase.from('projects').select('*').eq('id', projectId);
      if (userId) queryBuilder.eq('user_id', userId);
      const { data, error } = await queryBuilder.single();
      if (error) throw error;
      project = data;
    }

    // Si régénération d'un fichier spécifique
    if (regenerateFile && project?.blueprint_json) {
      // Chercher le fichier existant dans project_files pour confirmer existence (optionnel)
      const { data:existingFile } = await clientSupabase.from('project_files').select('*').eq('project_id', project.id).eq('filename', regenerateFile).maybeSingle();
      const blueprint = project.blueprint_json;
      const per = blueprint?.recommended_prompts?.per_file || [];
      const target = per.find(p => p.filename === regenerateFile);
      if (!target) return json({ success:false, error:'Prompt fichier introuvable' }, { status:404 });

      const singlePrompt = `Tu améliores ou régénères un fichier unique pour une application SvelteKit. FICHIER CIBLE: ${regenerateFile}. Fournis UNIQUEMENT le contenu brut du fichier sans markdown ni explications. Contexte blueprint: ${JSON.stringify({ routes: blueprint.routes, components: blueprint.core_components, site_type: blueprint.detected_site_type }).slice(0,1800)}\n${existingFile ? 'Ancienne version:\n'+existingFile.content.slice(0,2000) : ''}`;
      const result = await openaiService.generateApplication(singlePrompt);
      const newContent = result[regenerateFile] || Object.values(result)[0];
      if (!newContent) return json({ success:false, error:'Aucun contenu régénéré' }, { status:500 });
      // Upsert dans project_files
      const { error:pfErr } = await clientSupabase.from('project_files')
        .upsert({ project_id: project.id, filename: regenerateFile, content: newContent, stage: 'final', pass_index: 0 }, { onConflict: 'project_id,filename' });
      if (pfErr) throw pfErr;
      // Mettre à jour l'agrégat code_generated (option legacy)
      const updatedCode = { ...(project.code_generated||{}), [regenerateFile]: newContent };
      await clientSupabase.from('projects').update({ code_generated: updatedCode }).eq('id', project.id);
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
    let files = {};
    const selected = selectComponentsForBlueprint(blueprint, 12);
    const catalogSummary = selected.map(c => `${c.name} -> ${c.filename} : ${c.purpose}`).join('\n');
    const validationIssues = {}; // new: collect issues per file

    if(simpleMode){
      const appPrompt = buildAppPrompt(blueprint, { simpleMode: true });
      files = await openaiService.generateApplication(appPrompt, { model: 'gpt-4o-mini', maxFiles: 5 });
    } else {
      // Étape 2: génération orchestrée fichier par fichier
      const perFile = blueprint?.recommended_prompts?.per_file || [];
      if(perFile.length){
        for(const entry of perFile){
          const { filename, prompt: filePrompt } = entry;
          if(!filename || !filePrompt) continue;
          try {
            const context = buildPerFilePrompt({ blueprint, filePrompt, filename, already: files, catalogSummary });
            const result = await openaiService.generateApplication(context, { model: 'gpt-4o-mini', maxFiles: 1 });
            // On attend exactement 1 clé (filename attendu). Sinon on tente de récupérer la première.
            if(result[filename]) files[filename] = result[filename];
            else {
              const firstKey = Object.keys(result)[0];
              if(firstKey) files[filename] = result[firstKey]; // remap
            }
            // validate after each per-file generation
            if (files[filename]) {
              const { fixed, issues } = validateAndFix(files[filename], { filename });
              files[filename] = fixed;
              if (issues.length) validationIssues[filename] = issues;
            }
          } catch(e){
            console.warn('Échec génération fichier', filename, e.message);
          }
        }
      }
      // Fallback: si rien généré, utiliser ancien mode global
      if(Object.keys(files).length === 0){
        const fallbackPrompt = buildAppPrompt(blueprint, { simpleMode: false });
        files = await openaiService.generateApplication(fallbackPrompt, { model: 'gpt-4o-mini', maxFiles: 20 });
      }
      // Injecter composants validés manquants (si non générés) en ajoutant leur code brut
      for(const comp of selected){
        if(!Object.keys(files).includes(comp.filename)){
          files[comp.filename] = comp.code;
          const { fixed, issues } = validateAndFix(files[comp.filename], { filename: comp.filename });
          files[comp.filename] = fixed;
          if (issues.length) validationIssues[comp.filename] = issues;
        }
      }
    }
    // S'assurer présence d'une page principale (après les deux modes)
    if(!files['src/routes/+page.svelte']){
      const candidate = Object.keys(files).find(k => k.startsWith('src/routes/') && k.endsWith('+page.svelte'));
      if(candidate){
        files['src/routes/+page.svelte'] = files[candidate];
      } else {
        files['src/routes/+page.svelte'] = `<script>/* page principale injectée */</script><div class='p-8 text-center text-gray-600'>Page principale non définie dans blueprint.</div>`;
      }
    }
    // global validation pass for all files (ensure even simpleMode gets it)
    for (const k of Object.keys(files)) {
      const { fixed, issues } = validateAndFix(files[k], { filename: k });
      files[k] = fixed;
      if (issues.length) {
        validationIssues[k] = Array.from(new Set([...(validationIssues[k]||[]), ...issues]));
      }
    }

    // Mise à jour / création projet
    if (!project && !ephemeral) {
      const insertData = {
        name: blueprint.seo_meta?.title?.slice(0,60) || 'Projet sans nom',
        original_query: blueprint.original_query || query,
        blueprint_json: blueprint,
        code_generated: files,
        status: 'draft',
        user_id: userId
      };
      const { data:created, error:insErr } = await clientSupabase.from('projects').insert(insertData).select().single();
      if (insErr) throw insErr;
      project = created;
    } else if(project && !ephemeral) {
      const { error:updErr } = await clientSupabase.from('projects').update({ blueprint_json: blueprint, code_generated: files }).eq('id', project.id);
      if (updErr) throw updErr;
    }

    // Stocker chaque fichier dans project_files (upsert pour idempotence)
    if(!ephemeral && project){
      const fileEntries = Object.entries(files || {});
      for (const [filename, content] of fileEntries) {
        await clientSupabase.from('project_files').upsert({ project_id: project.id, filename, content, stage: 'final', pass_index: 0 }, { onConflict: 'project_id,filename' });
      }
    }

    return json({ success:true, blueprint, files, project: project || null, ephemeral, orchestrated: !simpleMode, validationIssues });
  } catch (e) {
    console.error('site/generate error', e);
    return json({ success:false, error:e.message }, { status:500 });
  }
}

function buildAppPrompt(blueprint, { simpleMode } = {}){
  const { routes = [], core_components = [], color_palette = [], sample_content = {}, seo_meta = {} } = blueprint || {};
  const articles = sample_content.articles || [];
  if(simpleMode){
    return `Génère un site SvelteKit ULTRA SIMPLE en UN SEUL FICHIER.
Contraintes STRICTES:
- Uniquement le fichier src/routes/+page.svelte dans le JSON final (pas d'autres clés)
- Pas de <script> ni d'import local; uniquement du markup statique + classes Tailwind
- Le fichier doit contenir: un header de navigation, une section hero, jusqu'à 3 sections de contenu, éventuellement une grille d'articles, et un footer.
- Le style repose exclusivement sur Tailwind CDN (le sandbox l'injectera)
- Pas de logique dynamique, pas de formulaires complexes
- AUCUN texte hors JSON, pas de commentaires.
Contexte:
Routes prévues: ${routes.map(r=>r.path).join(', ') || '/'}
Palette: ${color_palette.join(', ')}
Titre SEO: ${seo_meta.title}
Articles disponibles: ${articles.slice(0,4).map(a=>a.title).join(' | ')}
Retourne JSON: {"src/routes/+page.svelte":"CONTENU"}`.trim();
  }
  // Construction des fichiers attendus à partir des routes + composants
  const routeFileMappings = routes.map(r => {
    const p = r.path || '/';
    if(p === '/' || p === '') return 'src/routes/+page.svelte';
    // dynamique : /articles/:slug
    const segs = p.split('/').filter(Boolean).map(seg => seg.startsWith(':') ? `[${seg.slice(1)}]` : seg);
    return 'src/routes/' + segs.join('/') + '/+page.svelte';
  });
  const uniqueRoutes = Array.from(new Set(routeFileMappings));
  const componentFiles = (core_components || []).map(name => {
    const safe = name.replace(/[^A-Za-z0-9]/g,'');
    return `src/lib/components/${safe}.svelte`;
  });
  const expectedFiles = [...uniqueRoutes, ...componentFiles].slice(0, 20);
  const catalogSummary = summarizeCatalog();
  return `Crée une application SvelteKit multi-fichiers.
Contexte:
Routes: ${routes.map(r=> r.path+ ' => '+ (r.sections||[]).join(',')).join(' | ')}
Composants: ${core_components.join(', ')}
Palette: ${color_palette.join(', ')}
SEO Title: ${seo_meta.title}
Articles: ${articles.map(a=> a.slug).join(', ')}
Catalogue de composants validés (à RÉUTILISER, pas réécrire) :\n${catalogSummary}\n
Objectif: Générer les fichiers Svelte suivants (clés JSON): ${expectedFiles.join(', ')}. Tu peux aussi ajouter README.md, package.json, tailwind.config.cjs, postcss.config.cjs, src/app.css si utiles.
Contraintes STRICTES:
- Retourne UNIQUEMENT un objet JSON (pas de markdown, pas de texte hors JSON)
- Chaque clé = chemin fichier relatif
- Pas de commentaires hors code
- Les fichiers .svelte doivent être valides et utiliser Tailwind pour le style
- Réutiliser Header/Footer/Hero/ArticleCard/CommentSection
- Pour la page dynamique, inclure un exemple d'affichage d'un article (données mock locales)
- Fournir contenu pertinent dans chaque route
- Max 20 fichiers, prioriser ceux listés
FIN.`.trim();
}

// Construit un prompt dédié à un fichier unique en intégrant contexte blueprint + fichiers déjà générés.
function buildPerFilePrompt({ blueprint, filePrompt, filename, already, catalogSummary }){
  const { seo_meta = {}, color_palette = [], routes = [], core_components = [] } = blueprint || {};
  const previousList = Object.keys(already||{}).slice(-6); // limiter contexte
  return `Tu génères UNIQUEMENT le fichier Svelte suivant: ${filename}.
Contexte site:
Titre: ${seo_meta.title}
Palette: ${color_palette.join(', ')}
Routes: ${routes.map(r=> r.path).join(', ')}
Composants à réutiliser si utiles: ${core_components.join(', ')}
Catalogue validé:\n${catalogSummary}\n
Fichiers déjà générés (référence uniquement, ne pas les réécrire): ${previousList.join(', ') || 'aucun'}
Instruction spécifique:
${filePrompt}
Contraintes STRICTES:
- Retourne JSON: { "${filename}": "CONTENU" }
- Pas de texte hors JSON
- Pas de commentaires superflus
- Utilise Tailwind pour la mise en page
- Si le fichier est une page article dynamique, inclure données mock locales.
FIN.`.trim();
}
