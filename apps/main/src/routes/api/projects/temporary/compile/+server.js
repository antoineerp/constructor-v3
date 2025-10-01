import { json } from '@sveltejs/kit';

export const config = { runtime: 'nodejs20.x' };

/**
 * POST /api/projects/temporary/compile
 * Wrapper pour le compilateur principal
 * Body: { files: Record<string,string>, entries?: string[] }
 */
export async function POST(event) {
  try {
    const body = await event.request.json();
    
    // Importer dynamiquement le module de compilation principal
    const compileModule = await import('../[id]/compile/+server.js');
    
    // Créer un event avec un ID temporaire
    const tempEvent = {
      ...event,
      params: { id: 'temporary-preview' },
      request: new Request(event.request.url, {
        method: 'POST',
        headers: event.request.headers,
        body: JSON.stringify({
          ...body,
          files: body.files || body,
          format: 'html',
          external: false
        })
      })
    };
    
    // Appeler directement la fonction POST du compilateur
    return await compileModule.POST(tempEvent);
    
  } catch (error) {
    console.error('[temporary/compile] Error:', error);
    return json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
