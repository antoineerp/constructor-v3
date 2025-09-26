import { json } from '@sveltejs/kit';
import { openaiService } from '$lib/openaiService.js';

// Génération d'une mini application multi-fichiers.
// Body attendu: { prompt: string }
// Réponse: { success:true, files:{ "filename":"content", ... } }
export async function POST({ request }) {
  try {
    const { prompt } = await request.json();
    if (!prompt || !prompt.trim()) {
      return json({ success:false, error:'Prompt requis' }, { status:400 });
    }
    const files = await openaiService.generateApplication(prompt.trim());
    return json({ success:true, files });
  } catch (e) {
    console.error('generate/app error', e);
    return json({ success:false, error:e.message || 'Erreur génération application' }, { status:500 });
  }
}
