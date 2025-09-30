import { json } from '@sveltejs/kit';

import { openaiService } from '$lib/openaiService.js';

export async function POST(){
  try {
    // Envoie une mini requête de test très peu coûteuse
    const prompt = 'Réponds par le mot OK';
    const result = await fetch('https://api.openai.com/v1/chat/completions', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${openaiService.apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [ { role:'user', content: prompt } ],
        max_tokens: 2,
        temperature: 0
      })
    });
    if(!result.ok){
      const err = await result.text();
      return json({ success:false, error:'OpenAI error', detail: err }, { status: result.status });
    }
    const data = await result.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    return json({ success:true, reply: text, model: 'gpt-4o-mini', keyPresent: !!openaiService.apiKey });
  } catch(e){
    return json({ success:false, error:e.message, keyPresent: !!openaiService.apiKey }, { status:500 });
  }
}
