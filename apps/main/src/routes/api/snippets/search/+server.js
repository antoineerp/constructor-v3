import { json } from '@sveltejs/kit';
import { semanticSearch } from '$lib/embeddings';

export async function POST({ request }) {
  const body = await request.json();
  const { query, k = 5 } = body;
  if (!query) return json({ error: 'query required' }, { status: 400 });
  try {
    const results = await semanticSearch(query, k);
    return json({ results });
  } catch (e) {
    return json({ error: e.message }, { status: 500 });
  }
}
