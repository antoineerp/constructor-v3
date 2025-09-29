import { json } from '@sveltejs/kit';

import { env } from '$env/dynamic/private';
import { openaiService } from '$lib/openaiService.js';
import { supabase } from '$lib/supabase.js';

// Analyse d'image simplifiée via Chat Completions multimodal
// Entrées: multipart/form-data avec 'file' OU JSON { base64: string } OU { bucketObject: string }
// Param optionnel: prompt (ex: "Décris la mise en page Tailwind potentielle")

const BUCKET = env.SUPABASE_UPLOAD_BUCKET || 'uploads';

async function fileToBase64(file){
  const arr = await file.arrayBuffer();
  return Buffer.from(arr).toString('base64');
}

export async function POST({ request }){
  try {
    let prompt = 'Analyse structurée de cette image. Décris (fr) succinctement: type, éléments clés, hiérarchie visuelle, couleurs dominantes (hex approx), opportunités composants UI.';
    let b64 = null; let mime = null;
    const contentType = request.headers.get('content-type') || '';
    if(contentType.startsWith('multipart/form-data')){
      const form = await request.formData();
      prompt = form.get('prompt') || prompt;
      const file = form.get('file');
      if(file && typeof file !== 'string'){
        mime = file.type || 'image/png';
        b64 = await fileToBase64(file);
      }
    } else if(contentType.includes('application/json')) {
      const body = await request.json();
      if(body.prompt) prompt = body.prompt;
      if(body.base64){ b64 = body.base64.replace(/^data:[^;]+;base64,/,''); mime = body.mime || 'image/png'; }
      else if(body.bucketObject){
        // Récupérer depuis supabase storage et convertir
        const { data, error } = await supabase.storage.from(BUCKET).download(body.bucketObject);
        if(error) return json({ success:false, error:'Objet introuvable: '+error.message }, { status:404 });
        const arrayBuffer = await data.arrayBuffer();
        b64 = Buffer.from(arrayBuffer).toString('base64');
        mime = data.type || 'image/png';
      }
    } else {
      return json({ success:false, error:'Content-Type non supporté' }, { status:415 });
    }
    if(!b64){
      return json({ success:false, error:'Aucune image fournie' }, { status:400 });
    }
    if(!openaiService.apiKey){
      return json({ success:false, error:'Clé OpenAI manquante côté serveur' }, { status:500 });
    }
    // Appel vision simple
    const model = env.OPENAI_VISION_MODEL || 'gpt-4o-mini';
    const body = {
      model,
      messages: [
        { role:'system', content:'Tu es un analyseur UI. Fournis un JSON concis.' },
        { role:'user', content: [
          { type:'text', text: prompt + '\nFormat JSON strict: { "type":string, "summary":string, "colors":["#hex"], "components":[string], "layout_hints":[string] }' },
          { type:'image_url', image_url: { url: `data:${mime};base64,${b64}` } }
        ]}
      ],
      max_tokens: 500,
      temperature: 0.2
    };
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${openaiService.apiKey}` },
      body: JSON.stringify(body)
    });
    if(!resp.ok){
      const t = await resp.text();
      return json({ success:false, error:'OpenAI vision error', detail:t }, { status:resp.status });
    }
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';
    let parsed=null; let raw=content;
    try { parsed = JSON.parse(content.replace(/^```json\n?/i,'').replace(/```$/,'')); } catch(_e){ /* laisser raw */ }
    return json({ success:true, model, raw, parsed });
  } catch(e){
    return json({ success:false, error:e.message }, { status:500 });
  }
}
