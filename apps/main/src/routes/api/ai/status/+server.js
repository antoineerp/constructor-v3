import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export async function GET(){
  // On ne fait pas d'appel réseau complet (coût), juste un ping simple très léger optionnel
  const providers = [];
  if(env.OPENAI_API_KEY){ providers.push({ id:'openai', label:'OpenAI', status:'connected' }); } else { providers.push({ id:'openai', label:'OpenAI', status:'missing-key' }); }
  if(env.ANTHROPIC_API_KEY){ providers.push({ id:'claude', label:'Claude (Anthropic)', status:'connected' }); } else { providers.push({ id:'claude', label:'Claude (Anthropic)', status:'missing-key' }); }
  return json({ success:true, providers });
}
