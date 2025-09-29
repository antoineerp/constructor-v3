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
      return json({ success:false, error:'Clé OpenAI absente: génération impossible (aucun fallback).', missingKey:'openai' }, { status:503 });
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
