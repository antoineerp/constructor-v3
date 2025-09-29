import crypto from 'crypto';

import { Pool } from 'pg';

import { embedOpenAI } from './openai.js';

let poolInstance;
function getPool(){
  if(!poolInstance){
    const cs = process.env.DATABASE_URL;
    if(!cs) throw new Error('DATABASE_URL manquant pour embeddings');
    poolInstance = new Pool({ connectionString: cs, max: 3 });
  }
  return poolInstance;
}

export function fingerprint(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export async function upsertSnippet({ path, content, kind, language }) {
  const hash = fingerprint(content);
  const pool = getPool();
  const exists = await pool.query('SELECT 1 FROM code_snippets WHERE hash=$1', [hash]);
  if (exists.rowCount) return { skipped: true };
  const embedding = await embedOpenAI(content);
  await pool.query(
    'INSERT INTO code_snippets (path, hash, kind, language, content, embedding, tokens) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [path, hash, kind, language, content, embedding, content.length]
  );
  return { inserted: true };
}

export async function semanticSearch(query, k = 5) {
  const pool = getPool();
  const emb = await embedOpenAI(query);
  const { rows } = await pool.query(
    'SELECT path, kind, content, 1 - (embedding <=> $1) AS score FROM code_snippets ORDER BY embedding <=> $1 LIMIT $2',
    [emb, k]
  );
  return rows;
}
