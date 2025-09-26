import { json, text } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// Endpoint: /api/preview
// Query params: projectId (obligatoire), file (optionnel)
// Retour: HTML sandboxé (Content-Type text/html) encapsulant le fichier +page.svelte (ou file sélectionné) transformé naïvement en "HTML statique".
// NOTE: Ceci est un sandbox très simplifié: on retire les <script> et on ne résout pas les imports Svelte.
// Objectif: aperçu rapide du markup généré sans build complet.

export async function GET({ url, request }) {
  try {
    const projectId = url.searchParams.get('projectId');
    const file = url.searchParams.get('file');
    if (!projectId) return json({ error: 'projectId requis' }, { status: 400 });

    // Auth facultative: si header Authorization présent on le propage pour respecter RLS
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, authHeader ? { global: { headers: { Authorization: authHeader } } } : {});

    // Récupérer fichiers du projet (table project_files de préférence sinon fallback code_generated)
    const { data: project, error: pErr } = await supabase.from('projects').select('*').eq('id', projectId).single();
    if (pErr) throw pErr;

    // Essayer project_files
    const { data: files, error: fErr } = await supabase.from('project_files').select('filename, content').eq('project_id', projectId).limit(50);
    if (fErr) {
      console.warn('project_files indisponible, fallback code_generated');
    }
    let mapping = {};
    if (files && files.length) {
      for (const f of files) mapping[f.filename] = f.content;
    } else {
      mapping = project.code_generated || {};
    }

    // Choisir fichier principal
    const mainCandidates = file ? [file] : ['src/routes/+page.svelte', 'src/routes/index.svelte'];
    let chosen = null;
    for (const c of mainCandidates) { if (mapping[c]) { chosen = c; break; } }
    if (!chosen) {
      const first = Object.keys(mapping)[0];
      if (!first) return json({ error: 'Aucun fichier pour ce projet' }, { status: 404 });
      chosen = first;
    }

    let raw = mapping[chosen] || '';
    // Sanitize: retirer scripts
    raw = raw.replace(/<script[\s\S]*?<\/script>/gi, '');
    // Heuristique: si composant Svelte contient {#each} etc., on laisse tel quel (pas d'exécution) → afficher comme code.
    const isLikelySvelte = /{#each|{#if|on:click=/.test(raw);

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Aperçu Sandbox</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
<script src="https://cdn.tailwindcss.com"></script>
<style>body{font-family:system-ui, sans-serif;padding:1rem;background:#f1f5f9;} .container{max-width:960px;margin:0 auto;} pre{background:#0f172a;color:#e2e8f0;padding:1rem;border-radius:.5rem;overflow:auto;font-size:.8rem;}</style>
</head><body><div class="container">
<h1 class="text-xl font-semibold mb-4">Preview fichier: ${chosen}</h1>
${ isLikelySvelte ? `<div class="mb-4 p-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded">Ce fichier contient de la syntaxe Svelte dynamique. Rendu statique approximatif ci-dessous.</div><pre>${escapeHtml(raw)}</pre>` : raw }
</div></body></html>`;

    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  } catch (e) {
    console.error('preview error', e);
    return json({ error: e.message }, { status: 500 });
  }
}

function escapeHtml(str){
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
