import { json } from '@sveltejs/kit';
import { POST as compileHandler } from '../../[id]/compile/+server.js';

export const config = { runtime: 'nodejs20.x' };

/**
 * POST /api/projects/temporary/compile
 * Wrapper pour le compilateur principal
 * Body: { files: Record<string,string>, entries?: string[] }
 */
export async function POST(event) {
  try {
    const body = await event.request.json();
    
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
    return await compileHandler(tempEvent);
    
  } catch (error) {
    console.error('[temporary/compile] Error:', error);
    return json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
