import { json } from '@sveltejs/kit';

import { openaiService } from '$lib/openaiService.js';

export async function POST({ request }) {
  try {
    const { query } = await request.json();
    if(!query || typeof query !== 'string') return json({ success:false, error:'query manquante' }, { status:400 });
    const blueprint = await openaiService.generateBlueprint(query);
    return json({ success:true, blueprint });
  } catch (e) {
    console.error('expand prompt error', e);
    return json({ success:false, error:e.message }, { status:500 });
  }
}