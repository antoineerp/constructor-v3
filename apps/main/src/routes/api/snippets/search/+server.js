import { json } from '@sveltejs/kit';
import { embed, fingerprint, serializeVector } from '$lib/embeddings';

// Share same in-memory map via globalThis to persist across modules in dev
const globalKey = '__SNIPPETS_STORE__';
const store = globalThis[globalKey] || (globalThis[globalKey] = new Map());

export async function POST({ request }) {
  const body = await request.json();
  const { query, k = 5 } = body;
  if (!query) return json({ error: 'query required' }, { status: 400 });
  const qVec = embed(query);
  const entries = Array.from(store.entries()).map(([hash, rec]) => {
    // cosine similarity (mock) using dot product since vectors small & not normalized
    const v = rec.vector;
    let dot = 0;
    for (let i = 0; i < v.length; i++) dot += v[i] * qVec[i];
    return { hash, score: dot, ...rec };
  });
  entries.sort((a, b) => b.score - a.score);
  return json({ results: entries.slice(0, k) });
}
