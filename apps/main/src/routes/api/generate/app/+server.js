import { json } from '@sveltejs/kit';

import { openaiService } from '$lib/openaiService.js';
import { supabase } from '$lib/supabase.js';
import { validateFiles } from '$lib/validation/validator.js';

// Génération d'une mini application multi-fichiers.
// Body attendu: { prompt: string }
// Réponse: { success:true, files:{ "filename":"content", ... } }
export async function POST({ request, locals }) {
  try {
    const { prompt, fileHashes } = await request.json();
    if (!prompt || !prompt.trim()) {
      return json({ success:false, error:'Prompt requis' }, { status:400 });
    }
    if(!openaiService.apiKey){
      // Fallback offline mock: génère 3 fichiers basiques pour ne pas bloquer l'UI (sans validation lourde pour rapidité tests)
      const mock = {
        'README.md': '# Application Mock\n\nGénérée en mode offline (aucune clé OpenAI).',
  'src/routes/+page.svelte': `<script>let c=0; const inc=()=>c++;<\/script>\n<h1 class=\"text-2xl font-bold text-purple-600\">Mock App Offline<\/h1>\n<p class=\"text-sm text-gray-600\">Aucune clé OpenAI détectée. Ceci est un blueprint simulé pour test UI.<\/p>\n<p class=\"text-xs text-gray-400\">Bienvenue dans l\'application Offline.<\/p>\n<button class=\"mt-4 px-3 py-1 rounded bg-purple-600 text-white\" on:click={inc}>Compteur {c}<\/button>`,
        'src/routes/about/+page.svelte': '<h2 class="text-xl font-semibold">À propos (offline)</h2><p class="text-sm text-gray-600">Mode dégradé.</p>'
      };
      return json({ success:true, files: mock, offline:true, warning:'Mode offline: clé OpenAI absente.' });
    }
    let analyses = [];
    if(Array.isArray(fileHashes) && fileHashes.length){
      try {
        const { data } = await supabase.from('file_analyses').select('*').in('hash', fileHashes.slice(0,10));
        if(data) analyses = data.map(d=> ({ hash:d.hash, kind:d.kind, analysis:d.analysis, excerpt:d.raw_excerpt }));
      } catch(_e){ /* ignore */ }
    }
  const files = await openaiService.generateApplication(prompt.trim(), { fileAnalyses: analyses });
  const validation = await validateFiles(files);
  return json({ success:true, files, validation, analyses_used: analyses.map(a=> a.hash) });
  } catch (e) {
    console.error('generate/app error', e);
    return json({ success:false, error:e.message || 'Erreur génération application' }, { status:500 });
  }
}
