import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const config = { runtime: 'nodejs20.x' };

function mask(v){ if(!v) return null; return v.length <= 8 ? '***' : v.slice(0,4) + '***' + v.slice(-2); }

export async function GET(){
  const openai = !!(env.OPENAI_API_KEY || env.OPENAI_KEY);
  const anthropic = !!env.ANTHROPIC_API_KEY;
  const groq = !!env.GROQ_API_KEY;
  const mistral = !!env.MISTRAL_API_KEY;
  const openrouter = !!(env.OPENROUTER_API_KEY || env.OPENROUTER_KEY);
  const replicate = !!env.REPLICATE_API_TOKEN;
  const cohere = !!env.COHERE_API_KEY;
  const gemini = !!(env.GOOGLE_API_KEY || env.GEMINI_API_KEY);
  const perplexity = !!env.PERPLEXITY_API_KEY;

  const providers = { openai, anthropic, groq, mistral, openrouter, replicate, cohere, gemini, perplexity };
  const any = Object.values(providers).some(Boolean);
  const detail = {
    openai: openai ? mask(env.OPENAI_API_KEY || env.OPENAI_KEY || '') : null,
    anthropic: anthropic ? mask(env.ANTHROPIC_API_KEY || '') : null,
    groq: groq ? mask(env.GROQ_API_KEY || '') : null,
    mistral: mistral ? mask(env.MISTRAL_API_KEY || '') : null,
    openrouter: openrouter ? mask(env.OPENROUTER_API_KEY || env.OPENROUTER_KEY || '') : null,
    replicate: replicate ? mask(env.REPLICATE_API_TOKEN || '') : null,
    cohere: cohere ? mask(env.COHERE_API_KEY || '') : null,
    gemini: gemini ? mask(env.GOOGLE_API_KEY || env.GEMINI_API_KEY || '') : null,
    perplexity: perplexity ? mask(env.PERPLEXITY_API_KEY || '') : null
  };
  const list = Object.entries(providers).map(([id, ok])=> ({ id, connected: ok, maskedKey: detail[id] }));
  return json({ success:true, any, providers, detail, list, timestamp: Date.now() });
}
