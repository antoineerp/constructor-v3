import { env } from '$env/dynamic/private';

// Service unifié pour différents providers (openai | claude)
export class AIProviderService {
  constructor(){
    this.openaiKey = env.OPENAI_API_KEY;
    this.claudeKey = env.ANTHROPIC_API_KEY;
  }

  hasProvider(id){
    if(id==='openai') return !!this.openaiKey;
    if(id==='claude') return !!this.claudeKey;
    return false;
  }

  async chat({ provider='openai', model, system, user, temperature=0.6, max_tokens=1800 }){
    if(provider==='openai'){
      if(!this.openaiKey) throw new Error('Clé OpenAI absente');
      const body = { model: model||'gpt-4o-mini', messages:[{role:'system',content:system},{role:'user',content:user}], temperature, max_tokens };
      const r = await fetch('https://api.openai.com/v1/chat/completions',{ method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${this.openaiKey}`}, body: JSON.stringify(body)});
      if(!r.ok){ throw new Error('OpenAI: '+ await r.text()); }
      const data = await r.json();
      return data.choices?.[0]?.message?.content || '';
    } else if(provider==='claude'){
      if(!this.claudeKey) throw new Error('Clé Claude absente');
      const body = { model: model||'claude-3-5-sonnet-20240620', max_tokens: max_tokens, temperature, system, messages:[{role:'user', content:user}] };
      const r = await fetch('https://api.anthropic.com/v1/messages', { method:'POST', headers:{'Content-Type':'application/json','x-api-key':this.claudeKey,'anthropic-version':'2023-06-01'}, body: JSON.stringify(body) });
      if(!r.ok){ throw new Error('Claude: '+ await r.text()); }
      const data = await r.json();
      // Anthropic renvoie content = [{type:'text', text:'...'}]
      const first = data.content?.find(c=>c.type==='text');
      return first?.text || '';
    }
    throw new Error('Provider inconnu');
  }
}

export const aiProviderService = new AIProviderService();
