import { json } from '@sveltejs/kit';
import { upsertSnippet, fingerprint } from '$lib/embeddings';

export async function POST({ request }) {
  const body = await request.json();
  const { path, content, kind = 'unknown', language = 'svelte' } = body;
  if (!path || !content) {
    return json({ error: 'path and content required' }, { status: 400 });
  }
  try {
    const hash = fingerprint(content);
    const res = await upsertSnippet({ path, content, kind, language });
    return json({ hash, ...res });
  } catch (e) {
    return json({ error: e.message }, { status: 500 });
  }
}
