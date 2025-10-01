import { json } from '@sveltejs/kit';

export const config = { runtime: 'nodejs20.x' };

/**
 * POST /api/projects/temporary/compile
 * Redirection vers le compilateur unifié avec format HTML
 * Body: { files: Record<string,string>, entries?: string[] }
 */
export async function POST(event) {
  const { request } = event;
  
  try {
    const body = await request.json();
    
    // Préparer le body avec format HTML
    const compileBody = {
      ...body,
      format: 'html',
      external: false
    };
    
    // Appeler directement le compilateur unifié avec fetch interne
    const compileUrl = new URL('/api/projects/temp-preview/compile', request.url);
    const compileResponse = await fetch(compileUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(compileBody)
    });
    
    // Retourner la réponse telle quelle
    const data = await compileResponse.json();
    return json(data, { status: compileResponse.status });
    
  } catch (error) {
    console.error('[temporary/compile] Error:', error);
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
