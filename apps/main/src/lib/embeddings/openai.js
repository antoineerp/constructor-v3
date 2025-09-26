import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY || process.env.PUBLIC_OPENAI_API_KEY;
let openaiInstance = null;
function client(){
  if(!apiKey) return null;
  if(!openaiInstance) openaiInstance = new OpenAI({ apiKey });
  return openaiInstance;
}

export async function embedOpenAI(text) {
  const model = process.env.EMBEDDINGS_MODEL || 'text-embedding-3-small';
  const cli = client();
  if(!cli){
    // Build fallback: vecteur pseudo-aléatoire stable via hash pour éviter crash
    const seed = Array.from(new TextEncoder().encode(text.slice(0,32)));
    const vec = new Array(32).fill(0).map((_,i)=> (seed[i%seed.length]||0)/255);
    return vec;
  }
  const res = await cli.embeddings.create({ model, input: text });
  if(!res?.data?.[0]?.embedding) throw new Error('Embedding OpenAI failed');
  return res.data[0].embedding;
}
