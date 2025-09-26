import { json } from '@sveltejs/kit';
import { openaiService } from '$lib/openaiService.js';

export async function POST({ request }) {
  try {
  const { prompt, type, provider='openai' } = await request.json();

    if (!prompt || !prompt.trim()) {
      return json({ error: 'Prompt requis' }, { status: 400 });
    }

  const componentCode = await openaiService.generateComponent(prompt, type, { provider });

    return json({ 
      success: true, 
      code: componentCode,
      type: type || 'generic'
    });

  } catch (error) {
    console.error('Erreur API generate:', error);
    return json({ 
      error: error.message || 'Erreur lors de la génération',
      success: false 
    }, { status: 500 });
  }
}