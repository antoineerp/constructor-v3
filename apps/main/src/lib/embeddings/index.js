import crypto from 'crypto';

// Placeholder embedder: to be replaced by real provider (OpenAI / local model)
// Return a Float32Array of fixed length for now (mock) to unblock plumbing.
const DIM = 16; // keep tiny until real model integrated

function fakeEmbed(text) {
  const hash = crypto.createHash('sha256').update(text).digest();
  const arr = new Float32Array(DIM);
  for (let i = 0; i < DIM; i++) arr[i] = hash[i] / 255;
  return arr;
}

export function embed(text) {
  // Later: switch on process.env.EMBEDDINGS_PROVIDER
  return fakeEmbed(text);
}

export function fingerprint(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function serializeVector(vec) {
  return Array.from(vec);
}
