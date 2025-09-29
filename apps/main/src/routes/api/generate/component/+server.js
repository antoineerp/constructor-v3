import { json } from '@sveltejs/kit';

import { openaiService } from '$lib/openaiService.js';

// Génération ciblée d'un composant manquant (stub) par nom.
// Body: { name: string, prompt?: string, provider?: 'openai'|'claude', type?: string }
export async function POST({ request }) {
  try {
    const { name, prompt, provider='openai', type='generic' } = await request.json();
    if(!name || !/^([A-Z][A-Za-z0-9_]*)$/.test(name)){
      return json({ success:false, error:'Nom composant invalide (CamelCase requis commençant par majuscule).' }, { status:400 });
    }
    if(provider==='openai' && !openaiService.apiKey){
      return json({ success:false, error:'Clé OpenAI absente: impossible de générer ce composant.', provider, missingKey:'openai' }, { status:503 });
    }
    if(provider==='claude' && !openaiService.claudeKey){
      return json({ success:false, error:'Clé Claude absente: impossible de générer ce composant.', provider, missingKey:'claude' }, { status:503 });
    }
    const effectivePrompt = prompt && prompt.trim() ? prompt.trim() : `Composant Svelte ${name} minimal réutilisable.`;
    const code = await openaiService.generateComponent(effectivePrompt, type, { provider });
    return json({ success:true, code, name, type });
  } catch(e){
    return json({ success:false, error:e.message||'Erreur génération composant' }, { status:500 });
  }
}
