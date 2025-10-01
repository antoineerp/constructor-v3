import crypto from 'crypto';

// Note: PostgreSQL embeddings system disabled (DB removed)
// This file is a stub - embeddings are currently not stored

export function fingerprint(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export async function upsertSnippet({ path, content, kind, language }) {
  console.warn('upsertSnippet: embeddings storage disabled (no DB)');
  return { skipped: true, reason: 'no_database' };
}

export async function semanticSearch(query, k = 5) {
  console.warn('semanticSearch: embeddings disabled (no DB)');
  return [];
}
