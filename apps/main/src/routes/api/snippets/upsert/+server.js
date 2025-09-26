import { json } from '@sveltejs/kit';
import { embed, fingerprint, serializeVector } from '$lib/embeddings';

// In-memory store placeholder. Replace with Postgres + pgvector integration.
const memory = new Map(); // hash -> record

export async function POST({ request }) {
  const body = await request.json();
  const { path, content, kind = 'unknown', language = 'svelte' } = body;
  if (!path || !content) {
    return json({ error: 'path and content required' }, { status: 400 });
  }
  const hash = fingerprint(content);
  if (memory.has(hash)) {
    return json({ skipped: true, hash });
  }
  const vector = serializeVector(embed(content));
  memory.set(hash, { path, kind, language, content, vector, created_at: new Date().toISOString() });
  return json({ inserted: true, hash, dim: vector.length });
}
